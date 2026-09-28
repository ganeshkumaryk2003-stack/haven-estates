import "server-only";
import { subDays } from "date-fns";
import type { PropertyStatus, UserRole } from "@/generated/prisma/client";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { audit } from "@/server/services/audit";
import { notify } from "@/server/services/notifications";

export async function getAdminOverview() {
  const since = subDays(new Date(), 30);
  const [users, newUsers, propertyGroups, pendingReview, enquiries, offers, openOffers, reservations, paidDeposits, openReports, recentUsers, recentAudit] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: since } } }),
    prisma.property.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.property.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.enquiry.count(),
    prisma.offer.count(),
    prisma.offer.count({ where: { status: { in: ["PENDING", "COUNTERED"] } } }),
    prisma.reservation.count(),
    prisma.reservation.aggregate({ where: { status: { in: ["DEPOSIT_PAID", "COMPLETED"] } }, _sum: { depositAmount: true }, _count: { _all: true } }),
    prisma.propertyReport.count({ where: { status: "OPEN" } }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { id: true, name: true, email: true, role: true, createdAt: true, image: true } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { actor: { select: { name: true, email: true } } } }),
  ]);
  return {
    users,
    newUsers,
    propertiesByStatus: Object.fromEntries(propertyGroups.map((group) => [group.status, group._count._all])) as Partial<Record<PropertyStatus, number>>,
    totalProperties: propertyGroups.reduce((sum, group) => sum + group._count._all, 0),
    pendingReview,
    enquiries,
    offers,
    openOffers,
    reservations,
    paidDepositTotal: paidDeposits._sum.depositAmount?.toString() ?? "0",
    paidDepositCount: paidDeposits._count._all,
    openReports,
    recentUsers,
    recentAudit,
  };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function listUsersForAdmin(options: { q?: string; role?: UserRole; status?: "ACTIVE" | "SUSPENDED"; page: number; pageSize: number }) {
  const where = {
    ...(options.q ? { OR: [{ name: { contains: options.q, mode: "insensitive" as const } }, { email: { contains: options.q, mode: "insensitive" as const } }] } : {}),
    ...(options.role ? { role: options.role } : {}),
    ...(options.status ? { status: options.status } : {}),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (options.page - 1) * options.pageSize,
      take: options.pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
        suspendReason: true,
        _count: { select: { properties: true, offersMade: true, reports: true } },
      },
    }),
  ]);
  return { total, rows, totalPages: Math.max(1, Math.ceil(total / options.pageSize)) };
}

export async function setUserStatus(adminId: string, userId: string, status: "ACTIVE" | "SUSPENDED", reason?: string) {
  if (adminId === userId) throw new ConflictError("You cannot suspend your own account.");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("User not found.");
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { status, suspendedAt: status === "SUSPENDED" ? new Date() : null, suspendReason: status === "SUSPENDED" ? reason ?? null : null },
    });
    if (status === "SUSPENDED") {
      // Suspended sellers' live listings are hidden immediately.
      await tx.property.updateMany({ where: { ownerId: userId, status: { in: ["ACTIVE", "PENDING_REVIEW"] } }, data: { status: "ARCHIVED" } });
      await tx.session.deleteMany({ where: { userId } });
    }
    await audit({ actorId: adminId, action: status === "SUSPENDED" ? "user.suspended" : "user.reactivated", targetType: "User", targetId: userId, metadata: { reason } }, tx);
  });
  if (status === "ACTIVE") {
    await notify({ userId, type: "ACCOUNT", title: "Account reactivated", body: "Your account is active again. Archived listings can be republished from your dashboard.", href: "/dashboard/properties" });
  }
}

export async function setUserRole(adminId: string, userId: string, role: UserRole) {
  if (adminId === userId && role !== "ADMIN") throw new ConflictError("You cannot remove your own administrator role.");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("User not found.");
  await prisma.user.update({ where: { id: userId }, data: { role } });
  await audit({ actorId: adminId, action: "user.role_changed", targetType: "User", targetId: userId, metadata: { from: user.role, to: role } });
}

// ---------------------------------------------------------------------------
// Properties / moderation
// ---------------------------------------------------------------------------

export async function listPropertiesForAdmin(options: { q?: string; status?: PropertyStatus; page: number; pageSize: number }) {
  const where = {
    ...(options.q ? { OR: [{ title: { contains: options.q, mode: "insensitive" as const } }, { city: { contains: options.q, mode: "insensitive" as const } }] } : {}),
    ...(options.status ? { status: options.status } : {}),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      skip: (options.page - 1) * options.pageSize,
      take: options.pageSize,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
        _count: { select: { reports: { where: { status: "OPEN" } }, offers: true, enquiries: true } },
      },
    }),
  ]);
  return { total, rows, totalPages: Math.max(1, Math.ceil(total / options.pageSize)) };
}

export type AdminPropertyAction = "approve" | "reject" | "feature" | "unfeature" | "archive" | "reactivate";

export async function moderateProperty(adminId: string, propertyId: string, action: AdminPropertyAction, reason?: string) {
  const property = await prisma.property.findUnique({ where: { id: propertyId }, include: { images: { select: { id: true } } } });
  if (!property) throw new NotFoundError("Listing not found.");

  switch (action) {
    case "approve": {
      if (property.status !== "PENDING_REVIEW") throw new ConflictError("Only listings pending review can be approved.");
      await prisma.property.update({ where: { id: propertyId }, data: { status: "ACTIVE", publishedAt: property.publishedAt ?? new Date(), reviewedAt: new Date(), reviewedById: adminId, rejectionReason: null } });
      await audit({ actorId: adminId, action: "property.approved", targetType: "Property", targetId: propertyId });
      await notify({ userId: property.ownerId, type: "LISTING_APPROVED", title: "Listing approved", body: `"${property.title}" is now live and visible to buyers.`, href: `/properties/${property.slug}` });
      return;
    }
    case "reject": {
      if (!["PENDING_REVIEW", "ACTIVE"].includes(property.status)) throw new ConflictError("Only pending or active listings can be rejected.");
      await prisma.property.update({ where: { id: propertyId }, data: { status: "REJECTED", reviewedAt: new Date(), reviewedById: adminId, rejectionReason: reason ?? "Does not meet listing guidelines." } });
      await audit({ actorId: adminId, action: "property.rejected", targetType: "Property", targetId: propertyId, metadata: { reason } });
      await notify({ userId: property.ownerId, type: "LISTING_REJECTED", title: "Listing needs changes", body: `"${property.title}" was not approved. ${reason ?? "Please review the listing guidelines and resubmit."}`, href: `/properties/${property.slug}/edit` });
      return;
    }
    case "feature":
    case "unfeature": {
      await prisma.property.update({ where: { id: propertyId }, data: { featured: action === "feature" } });
      await audit({ actorId: adminId, action: "property.featured", targetType: "Property", targetId: propertyId, metadata: { featured: action === "feature" } });
      return;
    }
    case "archive": {
      if (["RESERVED", "SOLD", "RENTED"].includes(property.status)) throw new ConflictError("Reserved, sold or rented listings cannot be archived.");
      await prisma.$transaction(async (tx) => {
        await tx.property.update({ where: { id: propertyId }, data: { status: "ARCHIVED", rejectionReason: reason ?? property.rejectionReason } });
        await tx.offer.updateMany({ where: { propertyId, status: { in: ["PENDING", "COUNTERED"] } }, data: { status: "EXPIRED", respondedAt: new Date() } });
        await tx.propertyReport.updateMany({ where: { propertyId, status: "OPEN" }, data: { status: "RESOLVED", resolvedAt: new Date(), resolvedById: adminId, resolution: "Listing removed by moderator." } });
        await audit({ actorId: adminId, action: "property.status_changed", targetType: "Property", targetId: propertyId, metadata: { to: "ARCHIVED", by: "admin", reason } }, tx);
      });
      await notify({ userId: property.ownerId, type: "PROPERTY_STATUS_CHANGED", title: "Listing removed", body: `"${property.title}" was archived by a moderator. ${reason ?? ""}`.trim(), href: "/dashboard/properties" });
      return;
    }
    case "reactivate": {
      if (!["ARCHIVED", "REJECTED"].includes(property.status)) throw new ConflictError("Only archived or rejected listings can be reactivated.");
      if (property.images.length === 0) throw new ConflictError("The listing has no photos.");
      await prisma.property.update({ where: { id: propertyId }, data: { status: "ACTIVE", publishedAt: property.publishedAt ?? new Date(), rejectionReason: null } });
      await audit({ actorId: adminId, action: "property.status_changed", targetType: "Property", targetId: propertyId, metadata: { to: "ACTIVE", by: "admin" } });
      await notify({ userId: property.ownerId, type: "PROPERTY_STATUS_CHANGED", title: "Listing reactivated", body: `"${property.title}" is live again.`, href: `/properties/${property.slug}` });
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Reports, transactions & audit
// ---------------------------------------------------------------------------

export async function listReports(status?: "OPEN" | "RESOLVED" | "DISMISSED") {
  return prisma.propertyReport.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
    include: {
      property: { select: { id: true, slug: true, title: true, status: true, owner: { select: { id: true, name: true } } } },
      reporter: { select: { id: true, name: true, email: true } },
      resolvedBy: { select: { name: true } },
    },
  });
}

export async function resolveReport(adminId: string, reportId: string, outcome: "RESOLVED" | "DISMISSED", resolution?: string) {
  const report = await prisma.propertyReport.findUnique({ where: { id: reportId } });
  if (!report) throw new NotFoundError("Report not found.");
  await prisma.propertyReport.update({ where: { id: reportId }, data: { status: outcome, resolvedAt: new Date(), resolvedById: adminId, resolution } });
  await audit({ actorId: adminId, action: "report.resolved", targetType: "PropertyReport", targetId: reportId, metadata: { outcome, resolution } });
}

export async function listReservationsForAdmin() {
  return prisma.reservation.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      property: { select: { id: true, slug: true, title: true, status: true } },
      buyer: { select: { id: true, name: true, email: true } },
      seller: { select: { id: true, name: true, email: true } },
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

export async function listAuditLogs(page: number, pageSize: number) {
  const [total, rows] = await prisma.$transaction([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include: { actor: { select: { id: true, name: true, email: true } } } }),
  ]);
  return { total, rows, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

import "server-only";
import type { EnquiryStatus, Prisma } from "@/generated/prisma/client";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ensureConnection } from "@/server/services/connections";
import { notify } from "@/server/services/notifications";
import { isOpenForEngagement } from "@/server/services/properties";
import type { EnquiryDTO } from "@/types/dto";
import type { EnquiryInput, ReportInput } from "@/validations/engagement";

const enquiryInclude = {
  property: { select: { id: true, slug: true, title: true, images: { orderBy: { position: "asc" as const }, take: 1, select: { url: true } } } },
  sender: { select: { id: true, name: true, image: true, role: true, email: true, profile: { select: { company: true } } } },
  recipient: { select: { id: true, name: true, image: true, role: true, profile: { select: { company: true } } } },
} satisfies Prisma.EnquiryInclude;

type EnquiryRow = Prisma.EnquiryGetPayload<{ include: typeof enquiryInclude }>;

function toEnquiryDTO(row: EnquiryRow, viewerId: string): EnquiryDTO {
  return {
    id: row.id,
    subject: row.subject,
    message: row.message,
    phone: row.phone,
    preferredContact: row.preferredContact,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    property: { id: row.property.id, slug: row.property.slug, title: row.property.title, coverImage: row.property.images[0]?.url ?? null },
    sender: {
      id: row.sender.id,
      name: row.sender.name,
      image: row.sender.image,
      role: row.sender.role,
      company: row.sender.profile?.company ?? null,
      // The seller sees the buyer's email so they can reply by their preferred channel.
      email: viewerId === row.recipientId ? row.sender.email : undefined,
    },
    recipient: { id: row.recipient.id, name: row.recipient.name, image: row.recipient.image, role: row.recipient.role, company: row.recipient.profile?.company ?? null },
  };
}

export async function createEnquiry(user: { id: string; name?: string | null }, input: EnquiryInput) {
  const property = await prisma.property.findUnique({ where: { id: input.propertyId }, select: { id: true, slug: true, title: true, ownerId: true, status: true } });
  if (!property) throw new NotFoundError("Listing not found.");
  if (property.ownerId === user.id) throw new ForbiddenError("You cannot enquire about your own listing.");
  if (!isOpenForEngagement(property.status)) throw new ConflictError("This listing is no longer accepting enquiries.");

  const enquiry = await prisma.$transaction(async (tx) => {
    await ensureConnection({ buyerId: user.id, sellerId: property.ownerId, propertyId: property.id }, tx);
    return tx.enquiry.create({
      data: {
        propertyId: property.id,
        senderId: user.id,
        recipientId: property.ownerId,
        subject: input.subject,
        message: input.message,
        phone: input.phone,
        preferredContact: input.preferredContact,
      },
    });
  });

  await notify({
    userId: property.ownerId,
    type: "NEW_ENQUIRY",
    title: `New enquiry about ${property.title}`,
    body: `${user.name ?? "A buyer"} wrote: “${input.subject}”`,
    href: "/dashboard/enquiries",
    emailPreference: "emailOnEnquiry",
  });
  return enquiry;
}

export async function listEnquiries(userId: string, direction: "received" | "sent"): Promise<EnquiryDTO[]> {
  const rows = await prisma.enquiry.findMany({
    where: direction === "received" ? { recipientId: userId } : { senderId: userId },
    orderBy: { createdAt: "desc" },
    include: enquiryInclude,
  });
  return rows.map((row) => toEnquiryDTO(row, userId));
}

export async function updateEnquiryStatus(userId: string, enquiryId: string, status: Exclude<EnquiryStatus, "NEW">) {
  const enquiry = await prisma.enquiry.findUnique({ where: { id: enquiryId } });
  if (!enquiry) throw new NotFoundError("Enquiry not found.");
  if (enquiry.recipientId !== userId) throw new ForbiddenError();
  return prisma.enquiry.update({
    where: { id: enquiryId },
    data: { status, repliedAt: status === "REPLIED" ? new Date() : enquiry.repliedAt },
  });
}

export async function markEnquiriesRead(userId: string, enquiryIds: string[]) {
  if (enquiryIds.length === 0) return;
  await prisma.enquiry.updateMany({ where: { id: { in: enquiryIds }, recipientId: userId, status: "NEW" }, data: { status: "READ" } });
}

export async function reportProperty(userId: string, input: ReportInput) {
  const property = await prisma.property.findUnique({ where: { id: input.propertyId }, select: { id: true, ownerId: true } });
  if (!property) throw new NotFoundError("Listing not found.");
  if (property.ownerId === userId) throw new ForbiddenError("You cannot report your own listing.");
  const existing = await prisma.propertyReport.findUnique({ where: { propertyId_reporterId: { propertyId: property.id, reporterId: userId } } });
  if (existing) throw new ConflictError("You have already reported this listing. Our team is reviewing it.");
  return prisma.propertyReport.create({ data: { propertyId: property.id, reporterId: userId, reason: input.reason, details: input.details } });
}

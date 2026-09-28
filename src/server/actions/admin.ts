"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { USER_ROLES } from "@/lib/constants";
import { toActionError, type ActionResult } from "@/lib/errors";
import { moderateProperty, resolveReport, setUserRole, setUserStatus, type AdminPropertyAction } from "@/server/services/admin";
import { cancelReservation, completeReservation } from "@/server/services/reservations";

const reasonSchema = z.string().trim().max(500).optional();

export async function adminSetUserStatusAction(userId: string, status: "ACTIVE" | "SUSPENDED", reason?: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    await setUserStatus(admin.id, userId, status, reasonSchema.parse(reason));
    revalidatePath("/admin/users");
    return { ok: true, data: undefined };
  } catch (error) {
    return toActionError(error);
  }
}

export async function adminSetUserRoleAction(userId: string, role: string): Promise<ActionResult> {
  const parsed = z.enum(USER_ROLES).safeParse(role);
  if (!parsed.success) return { ok: false, error: "Invalid role." };
  try {
    const admin = await requireAdmin();
    await setUserRole(admin.id, userId, parsed.data);
    revalidatePath("/admin/users");
    return { ok: true, data: undefined };
  } catch (error) {
    return toActionError(error);
  }
}

export async function adminModeratePropertyAction(propertyId: string, action: AdminPropertyAction, reason?: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    await moderateProperty(admin.id, propertyId, action, reasonSchema.parse(reason));
    revalidatePath("/admin/properties");
    revalidatePath("/admin");
    revalidatePath("/properties");
    return { ok: true, data: undefined };
  } catch (error) {
    return toActionError(error);
  }
}

export async function adminResolveReportAction(reportId: string, outcome: "RESOLVED" | "DISMISSED", resolution?: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    await resolveReport(admin.id, reportId, outcome, reasonSchema.parse(resolution));
    revalidatePath("/admin/reports");
    return { ok: true, data: undefined };
  } catch (error) {
    return toActionError(error);
  }
}

export async function adminReservationAction(reservationId: string, action: "complete" | "cancel", reason?: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    if (action === "complete") await completeReservation(admin.id, reservationId);
    else await cancelReservation(admin, reservationId, reasonSchema.parse(reason) || "Cancelled by an administrator.");
    revalidatePath("/admin/transactions");
    return { ok: true, data: undefined };
  } catch (error) {
    return toActionError(error);
  }
}

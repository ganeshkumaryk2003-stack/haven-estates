import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma, type DbClient } from "@/lib/prisma";

export type AuditAction =
  | "user.signup"
  | "user.login"
  | "user.password_changed"
  | "user.password_reset"
  | "user.email_verified"
  | "user.deleted"
  | "user.suspended"
  | "user.reactivated"
  | "user.role_changed"
  | "property.created"
  | "property.updated"
  | "property.status_changed"
  | "property.deleted"
  | "property.approved"
  | "property.rejected"
  | "property.featured"
  | "offer.created"
  | "offer.updated"
  | "reservation.created"
  | "reservation.paid"
  | "reservation.completed"
  | "reservation.cancelled"
  | "report.resolved"
  | "connection.blocked"
  | "connection.unblocked";

interface AuditInput {
  actorId?: string | null;
  action: AuditAction;
  targetType: string;
  targetId: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}

// Audit logging is best-effort and must never fail the primary operation.
export async function audit(input: AuditInput, db: DbClient = prisma) {
  try {
    await db.auditLog.create({
      data: {
        actorId: input.actorId ?? undefined,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        metadata: input.metadata,
        ipAddress: input.ipAddress ?? undefined,
      },
    });
  } catch (error) {
    console.error("[audit] failed to write audit log", error);
  }
}

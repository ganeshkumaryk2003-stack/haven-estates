import "server-only";
import type { UserRole } from "@/generated/prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { sendEmail } from "@/lib/email";
import { passwordResetEmail, verificationEmail } from "@/lib/email/templates";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/utils";
import { audit } from "@/server/services/audit";
import { consumeAuthToken, findValidAuthToken, issueAuthToken } from "@/server/services/auth-tokens";

export async function createUserWithPassword(input: { name: string; email: string; password: string; role: UserRole }) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ConflictError("An account with this email already exists. Try signing in instead.");

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: input.role,
      profile: { create: {} },
    },
  });
  await audit({ actorId: user.id, action: "user.signup", targetType: "User", targetId: user.id, metadata: { role: input.role } });
  await sendVerificationEmail(user.id);
  return user;
}

export async function sendVerificationEmail(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError();
  if (user.emailVerified) return;
  const token = await issueAuthToken(user.id, "EMAIL_VERIFICATION");
  const url = absoluteUrl(`/verify-email?token=${encodeURIComponent(token)}`);
  await sendEmail({ to: user.email, ...verificationEmail(user.name, url) });
}

export async function verifyEmailWithToken(token: string) {
  const row = await findValidAuthToken(token, "EMAIL_VERIFICATION");
  if (!row) return { ok: false as const, reason: "This verification link is invalid or has expired." };
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: row.userId }, data: { emailVerified: new Date() } });
    await tx.authToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  });
  await audit({ actorId: row.userId, action: "user.email_verified", targetType: "User", targetId: row.userId });
  return { ok: true as const, email: row.user.email };
}

// Always resolves successfully so the UI cannot be used to enumerate accounts.
export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) return;
  const token = await issueAuthToken(user.id, "PASSWORD_RESET");
  const url = absoluteUrl(`/reset-password?token=${encodeURIComponent(token)}`);
  await sendEmail({ to: user.email, ...passwordResetEmail(user.name, url) });
}

export async function resetPasswordWithToken(token: string, password: string) {
  const row = await findValidAuthToken(token, "PASSWORD_RESET");
  if (!row) return { ok: false as const, reason: "This reset link is invalid or has expired. Request a new one." };
  await prisma.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(password) } });
  await consumeAuthToken(row.id);
  await audit({ actorId: row.userId, action: "user.password_reset", targetType: "User", targetId: row.userId });
  return { ok: true as const };
}

export async function getUserWithProfile(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
}

export async function getPublicProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId, status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      image: true,
      role: true,
      createdAt: true,
      emailVerified: true,
      profile: { select: { bio: true, company: true, location: true, website: true, phone: true } },
      _count: { select: { properties: { where: { status: { in: ["ACTIVE", "UNDER_OFFER", "RESERVED"] } } } } },
    },
  });
  return user;
}

// Deleting an account cascades through listings, messages, offers and notifications via the
// schema. Reservations with a paid deposit block deletion so money is never orphaned.
export async function deleteUserAccount(userId: string) {
  const blocking = await prisma.reservation.count({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }], status: { in: ["DEPOSIT_PAID"] } },
  });
  if (blocking > 0) {
    throw new ConflictError(
      "You have a reservation with a paid deposit. Contact support to complete or cancel it before deleting your account.",
    );
  }
  await audit({ actorId: userId, action: "user.deleted", targetType: "User", targetId: userId });
  await prisma.user.delete({ where: { id: userId } });
}

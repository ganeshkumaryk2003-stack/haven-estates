"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getCurrentUser, requireUser } from "@/lib/auth/session";
import { toActionError, type ActionResult } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, getClientIp } from "@/lib/rate-limit";
import { audit } from "@/server/services/audit";
import {
  createUserWithPassword,
  deleteUserAccount,
  requestPasswordReset,
  resetPasswordWithToken,
  sendVerificationEmail,
} from "@/server/services/users";
import {
  changePasswordSchema,
  deleteAccountSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/validations/auth";

function safeCallbackUrl(url: unknown) {
  if (typeof url !== "string" || !url.startsWith("/") || url.startsWith("//")) return "/dashboard";
  return url;
}

export async function signupAction(input: unknown): Promise<ActionResult<{ email: string }>> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  try {
    await enforceRateLimit("signup");
    const user = await createUserWithPassword({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      role: parsed.data.role,
    });
    // Sign the new user in right away; email verification gates contact features, not browsing.
    await signIn("credentials", { email: parsed.data.email, password: parsed.data.password, redirect: false });
    return { ok: true, data: { email: user.email } };
  } catch (error) {
    return toActionError(error);
  }
}

export async function loginAction(input: unknown, callbackUrl?: string): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter your email and password." };
  try {
    await enforceRateLimit("login", parsed.data.email);
    await signIn("credentials", { email: parsed.data.email, password: parsed.data.password, redirect: false });
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
    if (user) {
      await audit({ actorId: user.id, action: "user.login", targetType: "User", targetId: user.id, ipAddress: await getClientIp() });
    }
    return { ok: true, data: { redirectTo: safeCallbackUrl(callbackUrl) } };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "Incorrect email or password, or this account has been suspended." };
    }
    return toActionError(error);
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

export async function forgotPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };
  try {
    await enforceRateLimit("passwordReset", parsed.data.email);
    await requestPasswordReset(parsed.data.email);
    return { ok: true, data: undefined };
  } catch (error) {
    return toActionError(error);
  }
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  try {
    await enforceRateLimit("passwordReset");
    const result = await resetPasswordWithToken(parsed.data.token, parsed.data.password);
    if (!result.ok) return { ok: false, error: result.reason };
    return { ok: true, data: undefined };
  } catch (error) {
    return toActionError(error);
  }
}

export async function resendVerificationAction(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await enforceRateLimit("passwordReset", user.id);
    await sendVerificationEmail(user.id);
    return { ok: true, data: undefined };
  } catch (error) {
    return toActionError(error);
  }
}

export async function changePasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  try {
    const sessionUser = await requireUser();
    const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
    if (!user) return { ok: false, error: "Account not found." };
    if (user.passwordHash && !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
      return { ok: false, error: "Your current password is incorrect.", fieldErrors: { currentPassword: ["Incorrect password"] } };
    }
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.password) } });
    await audit({ actorId: user.id, action: "user.password_changed", targetType: "User", targetId: user.id });
    return { ok: true, data: undefined };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteAccountAction(input: unknown): Promise<ActionResult> {
  const parsed = deleteAccountSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Type DELETE to confirm." };
  try {
    const sessionUser = await requireUser();
    const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
    if (!user) return { ok: false, error: "Account not found." };
    if (user.role === "ADMIN") return { ok: false, error: "Administrator accounts cannot be self-deleted." };
    if (user.passwordHash) {
      const valid = await verifyPassword(parsed.data.password ?? "", user.passwordHash);
      if (!valid) return { ok: false, error: "Enter your current password to delete the account." };
    }
    await deleteUserAccount(user.id);
  } catch (error) {
    return toActionError(error);
  }
  await signOut({ redirectTo: "/?deleted=1" });
  return { ok: true, data: undefined };
}

export async function getSessionUserAction() {
  return getCurrentUser();
}

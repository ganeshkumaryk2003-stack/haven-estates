import "server-only";
import { cache } from "react";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";

export type SessionUser = Session["user"];

// Cached per request so layouts, pages and actions share one session lookup.
export const getSession = cache(async () => auth());

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  return session?.user ?? null;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  if (user.status === "SUSPENDED") throw new ForbiddenError("This account has been suspended.");
  return user;
}

// Actions that contact other people (enquiries, messages, offers, listings) require a verified email.
export async function requireVerifiedUser(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isEmailVerified) {
    throw new ForbiddenError("Please verify your email address before continuing. Check your inbox for the verification link.");
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new ForbiddenError("Administrator access required.");
  return user;
}

export function isAdmin(user: SessionUser | null | undefined) {
  return user?.role === "ADMIN";
}

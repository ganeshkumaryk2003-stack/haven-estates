"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from "@/lib/constants";
import { toActionError, type ActionResult } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { buildStorageKey, storage } from "@/lib/storage";
import { processImage, sniffImageType } from "@/lib/storage/images";
import { notificationPreferencesSchema, onboardingSchema, profileSchema } from "@/validations/profile";

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  try {
    const user = await requireUser();
    const { name, role, ...profile } = parsed.data;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        // Admins keep their role; everyone else can describe themselves as buyer/seller/agent.
        ...(user.role === "ADMIN" ? {} : { role }),
        profile: { upsert: { create: { ...profile, onboardingCompleted: true }, update: { ...profile, onboardingCompleted: true } } },
      },
    });
    revalidatePath("/settings/profile");
    revalidatePath(`/profile/${user.id}`);
    return { ok: true, data: undefined };
  } catch (error) {
    return toActionError(error);
  }
}

export async function completeOnboardingAction(input: unknown): Promise<ActionResult> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  try {
    const user = await requireUser();
    const { name, role, ...profile } = parsed.data;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        ...(user.role === "ADMIN" ? {} : { role }),
        profile: { upsert: { create: { ...profile, onboardingCompleted: true }, update: { ...profile, onboardingCompleted: true } } },
      },
    });
    return { ok: true, data: undefined };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateNotificationPreferencesAction(input: unknown): Promise<ActionResult> {
  const parsed = notificationPreferencesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid preferences." };
  try {
    const user = await requireUser();
    await prisma.profile.upsert({ where: { userId: user.id }, create: { userId: user.id, ...parsed.data }, update: parsed.data });
    revalidatePath("/settings/account");
    return { ok: true, data: undefined };
  } catch (error) {
    return toActionError(error);
  }
}

export async function uploadAvatarAction(formData: FormData): Promise<ActionResult<{ url: string }>> {
  try {
    const user = await requireUser();
    await enforceRateLimit("upload", user.id);
    const file = formData.get("file");
    if (!(file instanceof File)) return { ok: false, error: "Choose an image file." };
    if (file.size > MAX_IMAGE_SIZE_BYTES) return { ok: false, error: "Images must be smaller than 8 MB." };
    const buffer = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffImageType(buffer);
    if (!sniffed || !ALLOWED_IMAGE_TYPES.includes(sniffed)) return { ok: false, error: "Only JPEG, PNG, WebP or AVIF images are allowed." };

    const processed = await processImage(buffer, 512);
    const stored = await storage.put(buildStorageKey("avatars", user.id, processed.contentType), processed.buffer, processed.contentType);
    await prisma.user.update({ where: { id: user.id }, data: { image: stored.url } });
    revalidatePath("/settings/profile");
    return { ok: true, data: { url: stored.url } };
  } catch (error) {
    return toActionError(error);
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { requireUser, requireVerifiedUser } from "@/lib/auth/session";
import { toActionError, type ActionResult } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { changePropertyStatus, createProperty, updateProperty } from "@/server/services/properties";
import { propertySchema, propertyStatusActionSchema } from "@/validations/property";

function fieldErrors(error: { flatten(): { fieldErrors: Record<string, string[] | undefined> } }) {
  return Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).filter(([, value]) => value && value.length > 0),
  ) as Record<string, string[]>;
}

export async function createPropertyAction(input: unknown, intent: "draft" | "publish"): Promise<ActionResult<{ id: string; slug: string; status: string }>> {
  const parsed = propertySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  try {
    const user = intent === "publish" ? await requireVerifiedUser() : await requireUser();
    const property = await createProperty(user, parsed.data, intent);
    revalidatePath("/dashboard/properties");
    revalidatePath("/properties");
    return { ok: true, data: { id: property.id, slug: property.slug, status: property.status } };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updatePropertyAction(propertyId: string, input: unknown, intent: "save" | "publish"): Promise<ActionResult<{ id: string; slug: string; status: string }>> {
  const parsed = propertySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  try {
    const user = intent === "publish" ? await requireVerifiedUser() : await requireUser();
    const property = await updateProperty(propertyId, user, parsed.data, intent);
    revalidatePath("/dashboard/properties");
    revalidatePath(`/properties/${property.slug}`);
    revalidatePath("/properties");
    return { ok: true, data: { id: property.id, slug: property.slug, status: property.status } };
  } catch (error) {
    return toActionError(error);
  }
}

export async function propertyStatusAction(input: unknown): Promise<ActionResult<{ status: string | null }>> {
  const parsed = propertyStatusActionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  try {
    const user = parsed.data.action === "publish" ? await requireVerifiedUser() : await requireUser();
    const result = await changePropertyStatus(parsed.data.propertyId, user, parsed.data.action);
    revalidatePath("/dashboard/properties");
    revalidatePath("/properties");
    return { ok: true, data: result };
  } catch (error) {
    return toActionError(error);
  }
}

export async function toggleFavoriteAction(propertyId: string): Promise<ActionResult<{ favorited: boolean; count: number }>> {
  try {
    const user = await requireUser();
    const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { id: true, status: true } });
    if (!property) return { ok: false, error: "This listing no longer exists." };

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.favorite.findUnique({ where: { userId_propertyId: { userId: user.id, propertyId } } });
      if (existing) {
        await tx.favorite.delete({ where: { id: existing.id } });
        const updated = await tx.property.update({ where: { id: propertyId }, data: { favoriteCount: { decrement: 1 } }, select: { favoriteCount: true } });
        return { favorited: false, count: Math.max(0, updated.favoriteCount) };
      }
      await tx.favorite.create({ data: { userId: user.id, propertyId } });
      const updated = await tx.property.update({ where: { id: propertyId }, data: { favoriteCount: { increment: 1 } }, select: { favoriteCount: true } });
      return { favorited: true, count: updated.favoriteCount };
    });
    revalidatePath("/favorites");
    return { ok: true, data: result };
  } catch (error) {
    return toActionError(error);
  }
}

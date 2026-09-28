"use server";

import { revalidatePath } from "next/cache";
import { requireUser, requireVerifiedUser } from "@/lib/auth/session";
import { toActionError, type ActionResult } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { updateConnectionStatus, type ConnectionAction } from "@/server/services/connections";
import { createEnquiry, markEnquiriesRead, reportProperty, updateEnquiryStatus } from "@/server/services/enquiries";
import { counterOffer, createOffer, decideOffer } from "@/server/services/offers";
import { cancelReservation, startReservationCheckout } from "@/server/services/reservations";
import { counterOfferSchema, enquirySchema, offerDecisionSchema, offerSchema, reportSchema } from "@/validations/engagement";

function fieldErrors(error: { flatten(): { fieldErrors: Record<string, string[] | undefined> } }) {
  return Object.fromEntries(Object.entries(error.flatten().fieldErrors).filter(([, value]) => value && value.length > 0)) as Record<string, string[]>;
}

export async function createEnquiryAction(input: unknown): Promise<ActionResult> {
  const parsed = enquirySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  try {
    const user = await requireVerifiedUser();
    await enforceRateLimit("enquiry", user.id);
    await createEnquiry(user, parsed.data);
    revalidatePath("/dashboard/enquiries");
    return { ok: true, data: undefined };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateEnquiryStatusAction(enquiryId: string, status: "READ" | "REPLIED" | "CLOSED" | "SPAM"): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await updateEnquiryStatus(user.id, enquiryId, status);
    revalidatePath("/dashboard/enquiries");
    return { ok: true, data: undefined };
  } catch (error) {
    return toActionError(error);
  }
}

export async function markEnquiriesReadAction(enquiryIds: string[]): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await markEnquiriesRead(user.id, enquiryIds.slice(0, 100));
    return { ok: true, data: undefined };
  } catch (error) {
    return toActionError(error);
  }
}

export async function reportPropertyAction(input: unknown): Promise<ActionResult> {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Choose a reason for the report." };
  try {
    const user = await requireUser();
    await enforceRateLimit("report", user.id);
    await reportProperty(user.id, parsed.data);
    return { ok: true, data: undefined };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createOfferAction(input: unknown): Promise<ActionResult> {
  const parsed = offerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  try {
    const user = await requireVerifiedUser();
    await enforceRateLimit("offer", user.id);
    await createOffer(user, parsed.data);
    revalidatePath("/dashboard/offers");
    return { ok: true, data: undefined };
  } catch (error) {
    return toActionError(error);
  }
}

export async function counterOfferAction(input: unknown): Promise<ActionResult> {
  const parsed = counterOfferSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid counter amount.", fieldErrors: fieldErrors(parsed.error) };
  try {
    const user = await requireVerifiedUser();
    await counterOffer(user, parsed.data);
    revalidatePath("/dashboard/offers");
    return { ok: true, data: undefined };
  } catch (error) {
    return toActionError(error);
  }
}

export async function decideOfferAction(input: unknown): Promise<ActionResult> {
  const parsed = offerDecisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  try {
    const user = await requireUser();
    await decideOffer(user, parsed.data.offerId, parsed.data.decision);
    revalidatePath("/dashboard/offers");
    revalidatePath("/dashboard/properties");
    return { ok: true, data: undefined };
  } catch (error) {
    return toActionError(error);
  }
}

export async function startCheckoutAction(offerId: string): Promise<ActionResult<{ url: string }>> {
  try {
    const user = await requireVerifiedUser();
    const url = await startReservationCheckout(user, offerId);
    return { ok: true, data: { url } };
  } catch (error) {
    return toActionError(error);
  }
}

export async function cancelReservationAction(reservationId: string, reason: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await cancelReservation(user, reservationId, reason.trim().slice(0, 500) || "Cancelled by a party to the reservation.");
    revalidatePath("/dashboard/reservations");
    revalidatePath("/dashboard/offers");
    return { ok: true, data: undefined };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateConnectionAction(connectionId: string, action: ConnectionAction): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await updateConnectionStatus(user.id, connectionId, action);
    revalidatePath("/dashboard/connections");
    revalidatePath("/messages");
    return { ok: true, data: undefined };
  } catch (error) {
    return toActionError(error);
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { requireUser, requireVerifiedUser } from "@/lib/auth/session";
import { toActionError, type ActionResult } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  broadcastTyping,
  getConversationDetail,
  getOrCreateConversation,
  loadOlderMessages,
  markConversationRead,
  sendMessage,
} from "@/server/services/messaging";
import type { ConversationDetailDTO, MessageDTO } from "@/types/dto";
import { messageSchema, startConversationSchema } from "@/validations/engagement";

export async function startConversationAction(input: unknown): Promise<ActionResult<{ conversationId: string }>> {
  const parsed = startConversationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Write a message first." };
  try {
    const user = await requireVerifiedUser();
    await enforceRateLimit("message", user.id);
    const conversation = await getOrCreateConversation(user.id, parsed.data.recipientId, parsed.data.propertyId ?? null);
    await sendMessage(user, { conversationId: conversation.id, body: parsed.data.body, attachments: [] });
    revalidatePath("/messages");
    return { ok: true, data: { conversationId: conversation.id } };
  } catch (error) {
    return toActionError(error);
  }
}

export async function openConversationAction(recipientId: string, propertyId?: string | null): Promise<ActionResult<{ conversationId: string }>> {
  try {
    const user = await requireVerifiedUser();
    const conversation = await getOrCreateConversation(user.id, recipientId, propertyId ?? null);
    return { ok: true, data: { conversationId: conversation.id } };
  } catch (error) {
    return toActionError(error);
  }
}

export async function sendMessageAction(input: unknown): Promise<ActionResult<MessageDTO>> {
  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid message." };
  try {
    const user = await requireVerifiedUser();
    await enforceRateLimit("message", user.id);
    const message = await sendMessage(user, parsed.data);
    return { ok: true, data: message };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getConversationAction(conversationId: string): Promise<ActionResult<ConversationDetailDTO>> {
  try {
    const user = await requireUser();
    const conversation = await getConversationDetail(conversationId, user);
    return { ok: true, data: conversation };
  } catch (error) {
    return toActionError(error);
  }
}

export async function loadOlderMessagesAction(conversationId: string, beforeMessageId: string): Promise<ActionResult<{ messages: MessageDTO[]; hasMore: boolean }>> {
  try {
    const user = await requireUser();
    const result = await loadOlderMessages(conversationId, user, beforeMessageId);
    return { ok: true, data: result };
  } catch (error) {
    return toActionError(error);
  }
}

export async function markConversationReadAction(conversationId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await markConversationRead(conversationId, user);
    return { ok: true, data: undefined };
  } catch (error) {
    return toActionError(error);
  }
}

export async function typingAction(conversationId: string, isTyping: boolean): Promise<void> {
  try {
    const user = await requireUser();
    await broadcastTyping(conversationId, user, isTyping);
  } catch {
    // typing indicators are best effort
  }
}

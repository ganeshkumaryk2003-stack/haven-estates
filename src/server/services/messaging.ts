import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { MAX_ATTACHMENT_SIZE_BYTES, MESSAGE_PAGE_SIZE } from "@/lib/constants";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { publishToUser, publishToUsers } from "@/lib/realtime";
import { assertOwnedStorageKey, storage } from "@/lib/storage";
import { truncate } from "@/lib/utils";
import { ensureConnection, isBlockedBetween } from "@/server/services/connections";
import { notify } from "@/server/services/notifications";
import type { ConversationDetailDTO, ConversationSummaryDTO, MessageDTO } from "@/types/dto";
import type { MessageInput } from "@/validations/engagement";

export function conversationPairKey(userA: string, userB: string, propertyId?: string | null) {
  const [first, second] = [userA, userB].sort();
  return `${first}:${second}:${propertyId ?? "general"}`;
}

const messageInclude = { attachments: true } satisfies Prisma.MessageInclude;
type MessageRow = Prisma.MessageGetPayload<{ include: typeof messageInclude }>;

export function toMessageDTO(row: MessageRow): MessageDTO {
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    attachments: row.attachments.map((attachment) => ({
      id: attachment.id,
      url: attachment.url,
      name: attachment.name,
      contentType: attachment.contentType,
      size: attachment.size,
      kind: attachment.kind,
    })),
  };
}

// Returns the conversation between two users about a property (or a general one), creating it
// when needed. Also makes sure a buyer/seller connection exists.
export async function getOrCreateConversation(actorId: string, recipientId: string, propertyId?: string | null) {
  if (actorId === recipientId) throw new ForbiddenError("You cannot message yourself.");
  const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { id: true, status: true } });
  if (!recipient || recipient.status !== "ACTIVE") throw new NotFoundError("This user is not available.");

  let sellerId = recipientId;
  let buyerId = actorId;
  if (propertyId) {
    const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { ownerId: true } });
    if (!property) throw new NotFoundError("Listing not found.");
    sellerId = property.ownerId;
    buyerId = property.ownerId === actorId ? recipientId : actorId;
  }

  return prisma.$transaction(async (tx) => {
    await ensureConnection({ buyerId, sellerId, propertyId }, tx);
    const pairKey = conversationPairKey(actorId, recipientId, propertyId);
    const existing = await tx.conversation.findUnique({ where: { pairKey } });
    if (existing) return existing;
    return tx.conversation.create({
      data: {
        pairKey,
        propertyId: propertyId ?? null,
        participants: { create: [{ userId: actorId }, { userId: recipientId }] },
      },
    });
  });
}

async function requireParticipant(conversationId: string, user: { id: string; role: string }) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: { include: { user: { select: { id: true, name: true, image: true, role: true, profile: { select: { company: true } } } } } },
      property: { select: { id: true, slug: true, title: true, images: { orderBy: { position: "asc" }, take: 1, select: { url: true } } } },
    },
  });
  if (!conversation) throw new NotFoundError("Conversation not found.");
  const participant = conversation.participants.find((entry) => entry.userId === user.id);
  if (!participant && user.role !== "ADMIN") throw new ForbiddenError("You are not part of this conversation.");
  return { conversation, participant };
}

export async function listConversations(userId: string): Promise<ConversationSummaryDTO[]> {
  const rows = await prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    orderBy: [{ lastMessageAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    include: {
      participants: { include: { user: { select: { id: true, name: true, image: true, role: true, profile: { select: { company: true } } } } } },
      property: { select: { id: true, slug: true, title: true, images: { orderBy: { position: "asc" }, take: 1, select: { url: true } } } },
    },
  });

  const summaries = await Promise.all(
    rows.map(async (row) => {
      const me = row.participants.find((participant) => participant.userId === userId);
      const other = row.participants.find((participant) => participant.userId !== userId)?.user;
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: row.id,
          senderId: { not: userId },
          ...(me?.lastReadAt ? { createdAt: { gt: me.lastReadAt } } : {}),
        },
      });
      const blocked = other ? await isBlockedBetween(userId, other.id) : false;
      return {
        id: row.id,
        otherUser: other
          ? { id: other.id, name: other.name, image: other.image, role: other.role, company: other.profile?.company ?? null }
          : { id: "", name: "Deleted user", image: null, role: "BUYER" as const },
        property: row.property
          ? { id: row.property.id, slug: row.property.slug, title: row.property.title, coverImage: row.property.images[0]?.url ?? null }
          : null,
        lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
        lastMessagePreview: row.lastMessagePreview,
        unreadCount,
        blocked,
      } satisfies ConversationSummaryDTO;
    }),
  );
  return summaries;
}

export async function getConversationDetail(conversationId: string, user: { id: string; role: string }): Promise<ConversationDetailDTO> {
  const { conversation, participant } = await requireParticipant(conversationId, user);
  const other = conversation.participants.find((entry) => entry.userId !== user.id);
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: MESSAGE_PAGE_SIZE + 1,
    include: messageInclude,
  });
  const hasMore = messages.length > MESSAGE_PAGE_SIZE;
  const page = messages.slice(0, MESSAGE_PAGE_SIZE).reverse();
  const unreadCount = participant
    ? await prisma.message.count({
        where: { conversationId, senderId: { not: user.id }, ...(participant.lastReadAt ? { createdAt: { gt: participant.lastReadAt } } : {}) },
      })
    : 0;
  const blocked = other ? await isBlockedBetween(user.id, other.userId) : false;

  return {
    id: conversation.id,
    otherUser: other
      ? { id: other.user.id, name: other.user.name, image: other.user.image, role: other.user.role, company: other.user.profile?.company ?? null }
      : { id: "", name: "Deleted user", image: null, role: "BUYER" },
    otherLastReadAt: other?.lastReadAt?.toISOString() ?? null,
    property: conversation.property
      ? {
          id: conversation.property.id,
          slug: conversation.property.slug,
          title: conversation.property.title,
          coverImage: conversation.property.images[0]?.url ?? null,
        }
      : null,
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
    lastMessagePreview: conversation.lastMessagePreview,
    unreadCount,
    blocked,
    messages: page.map(toMessageDTO),
    hasMore,
  };
}

export async function loadOlderMessages(conversationId: string, user: { id: string; role: string }, beforeMessageId: string) {
  await requireParticipant(conversationId, user);
  const anchor = await prisma.message.findUnique({ where: { id: beforeMessageId }, select: { createdAt: true, conversationId: true } });
  if (!anchor || anchor.conversationId !== conversationId) throw new NotFoundError();
  const rows = await prisma.message.findMany({
    where: { conversationId, createdAt: { lt: anchor.createdAt } },
    orderBy: { createdAt: "desc" },
    take: MESSAGE_PAGE_SIZE + 1,
    include: messageInclude,
  });
  const hasMore = rows.length > MESSAGE_PAGE_SIZE;
  return { messages: rows.slice(0, MESSAGE_PAGE_SIZE).reverse().map(toMessageDTO), hasMore };
}

export async function sendMessage(user: { id: string; role: string; name?: string | null }, input: MessageInput): Promise<MessageDTO> {
  const { conversation } = await requireParticipant(input.conversationId, user);
  const recipients = conversation.participants.filter((participant) => participant.userId !== user.id);
  const other = recipients[0];
  if (other && (await isBlockedBetween(user.id, other.userId))) {
    throw new ForbiddenError("You can no longer message this person.");
  }

  // Attachments must have been uploaded by the sender; URL, type and kind come from the key.
  const attachments = input.attachments.map((attachment) => {
    const parsed = assertOwnedStorageKey(attachment.storageKey, "attachments", user.id);
    return {
      storageKey: attachment.storageKey,
      url: storage.urlFor(attachment.storageKey),
      name: attachment.name,
      contentType: parsed.contentType,
      size: Math.min(Math.max(1, Math.trunc(attachment.size)), MAX_ATTACHMENT_SIZE_BYTES),
      kind: parsed.kind,
    };
  });

  const preview = input.body ? truncate(input.body, 100) : `📎 ${attachments[0]?.name ?? "Attachment"}`;
  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: {
        conversationId: conversation.id,
        senderId: user.id,
        body: input.body,
        attachments: { create: attachments },
      },
      include: messageInclude,
    });
    await tx.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: created.createdAt, lastMessagePreview: preview },
    });
    // The sender has obviously read everything up to their own message.
    await tx.conversationParticipant.updateMany({ where: { conversationId: conversation.id, userId: user.id }, data: { lastReadAt: created.createdAt } });
    if (other) {
      await tx.connection.updateMany({
        where: { OR: [{ buyerId: user.id, sellerId: other.userId }, { buyerId: other.userId, sellerId: user.id }] },
        data: { lastInteractionAt: created.createdAt },
      });
    }
    return created;
  });

  const dto = toMessageDTO(message);
  publishToUsers(
    conversation.participants.map((participant) => participant.userId),
    { type: "message:new", conversationId: conversation.id, messageId: message.id, senderId: user.id },
  );
  for (const recipient of recipients) {
    await notify({
      userId: recipient.userId,
      type: "NEW_MESSAGE",
      title: `New message from ${user.name ?? "a Haven user"}`,
      body: preview,
      href: `/messages/${conversation.id}`,
      emailPreference: "emailOnMessage",
    });
  }
  return dto;
}

export async function markConversationRead(conversationId: string, user: { id: string; role: string }) {
  const { conversation, participant } = await requireParticipant(conversationId, user);
  if (!participant) return;
  const readAt = new Date();
  await prisma.conversationParticipant.update({ where: { id: participant.id }, data: { lastReadAt: readAt } });
  // Notifications about this conversation are read as well.
  await prisma.notification.updateMany({
    where: { userId: user.id, type: "NEW_MESSAGE", href: `/messages/${conversationId}`, readAt: null },
    data: { readAt },
  });
  publishToUsers(
    conversation.participants.filter((entry) => entry.userId !== user.id).map((entry) => entry.userId),
    { type: "message:read", conversationId, readerId: user.id, readAt: readAt.toISOString() },
  );
}

export async function broadcastTyping(conversationId: string, user: { id: string; role: string }, isTyping: boolean) {
  const { conversation } = await requireParticipant(conversationId, user);
  for (const participant of conversation.participants) {
    if (participant.userId !== user.id) publishToUser(participant.userId, { type: "typing", conversationId, userId: user.id, isTyping });
  }
}

export async function getUnreadMessageCount(userId: string) {
  const participations = await prisma.conversationParticipant.findMany({ where: { userId }, select: { conversationId: true, lastReadAt: true } });
  if (participations.length === 0) return 0;
  const counts = await Promise.all(
    participations.map((participation) =>
      prisma.message.count({
        where: {
          conversationId: participation.conversationId,
          senderId: { not: userId },
          ...(participation.lastReadAt ? { createdAt: { gt: participation.lastReadAt } } : {}),
        },
      }),
    ),
  );
  return counts.reduce((sum, count) => sum + count, 0);
}

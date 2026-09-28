import "server-only";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { prisma, type DbClient } from "@/lib/prisma";
import { audit } from "@/server/services/audit";
import type { ConnectionDTO } from "@/types/dto";

// Finds the connection between two users regardless of who is the buyer/seller.
export async function findConnectionBetween(userA: string, userB: string, db: DbClient = prisma) {
  return db.connection.findFirst({
    where: { OR: [{ buyerId: userA, sellerId: userB }, { buyerId: userB, sellerId: userA }] },
  });
}

export async function isBlockedBetween(userA: string, userB: string, db: DbClient = prisma) {
  const connection = await findConnectionBetween(userA, userB, db);
  return connection?.status === "BLOCKED";
}

// Creates (or refreshes) the buyer/seller connection and links the property to it.
// Throws when either side has blocked the other.
export async function ensureConnection(
  params: { buyerId: string; sellerId: string; propertyId?: string | null },
  db: DbClient = prisma,
) {
  if (params.buyerId === params.sellerId) throw new ConflictError("You cannot connect with yourself.");
  let connection = await findConnectionBetween(params.buyerId, params.sellerId, db);
  if (connection?.status === "BLOCKED") {
    throw new ForbiddenError("Messaging is not available between these accounts.");
  }
  if (!connection) {
    connection = await db.connection.create({ data: { buyerId: params.buyerId, sellerId: params.sellerId } });
  } else {
    connection = await db.connection.update({
      where: { id: connection.id },
      data: { lastInteractionAt: new Date(), status: connection.status === "ARCHIVED" ? "ACTIVE" : connection.status, archivedById: null },
    });
  }
  if (params.propertyId) {
    await db.connectionProperty.upsert({
      where: { connectionId_propertyId: { connectionId: connection.id, propertyId: params.propertyId } },
      update: {},
      create: { connectionId: connection.id, propertyId: params.propertyId },
    });
  }
  return connection;
}

export async function listConnections(userId: string): Promise<ConnectionDTO[]> {
  const rows = await prisma.connection.findMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    orderBy: { lastInteractionAt: "desc" },
    include: {
      buyer: { select: { id: true, name: true, image: true, role: true, profile: { select: { company: true, location: true } } } },
      seller: { select: { id: true, name: true, image: true, role: true, profile: { select: { company: true, location: true } } } },
      properties: { include: { property: { select: { id: true, slug: true, title: true } } }, orderBy: { createdAt: "desc" } },
    },
  });

  // One query for all conversations between the user and their connections (general conversations).
  const otherIds = rows.map((row) => (row.buyerId === userId ? row.sellerId : row.buyerId));
  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId } }, AND: { participants: { some: { userId: { in: otherIds } } } } },
    orderBy: { lastMessageAt: "desc" },
    select: { id: true, participants: { select: { userId: true } } },
  });
  const conversationByOther = new Map<string, string>();
  for (const conversation of conversations) {
    const other = conversation.participants.find((participant) => participant.userId !== userId)?.userId;
    if (other && !conversationByOther.has(other)) conversationByOther.set(other, conversation.id);
  }

  return rows.map((row) => {
    const isBuyer = row.buyerId === userId;
    const other = isBuyer ? row.seller : row.buyer;
    return {
      id: row.id,
      status: row.status,
      lastInteractionAt: row.lastInteractionAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      role: isBuyer ? "buyer" : "seller",
      otherUser: {
        id: other.id,
        name: other.name,
        image: other.image,
        role: other.role,
        company: other.profile?.company ?? null,
        location: other.profile?.location ?? null,
      },
      properties: row.properties.map(({ property }) => property),
      conversationId: conversationByOther.get(other.id) ?? null,
      blockedByMe: row.status === "BLOCKED" && row.blockedById === userId,
      archivedByMe: row.status === "ARCHIVED" && row.archivedById === userId,
    };
  });
}

export type ConnectionAction = "archive" | "unarchive" | "block" | "unblock";

export async function updateConnectionStatus(userId: string, connectionId: string, action: ConnectionAction) {
  const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
  if (!connection) throw new NotFoundError("Connection not found.");
  if (connection.buyerId !== userId && connection.sellerId !== userId) throw new ForbiddenError();

  switch (action) {
    case "archive":
      if (connection.status === "BLOCKED") throw new ConflictError("Unblock the connection first.");
      await prisma.connection.update({ where: { id: connectionId }, data: { status: "ARCHIVED", archivedById: userId } });
      break;
    case "unarchive":
      await prisma.connection.update({ where: { id: connectionId }, data: { status: "ACTIVE", archivedById: null } });
      break;
    case "block":
      await prisma.connection.update({ where: { id: connectionId }, data: { status: "BLOCKED", blockedById: userId } });
      await audit({ actorId: userId, action: "connection.blocked", targetType: "Connection", targetId: connectionId });
      break;
    case "unblock":
      if (connection.status === "BLOCKED" && connection.blockedById !== userId) {
        throw new ForbiddenError("Only the person who blocked can unblock.");
      }
      await prisma.connection.update({ where: { id: connectionId }, data: { status: "ACTIVE", blockedById: null } });
      await audit({ actorId: userId, action: "connection.unblocked", targetType: "Connection", targetId: connectionId });
      break;
  }
}

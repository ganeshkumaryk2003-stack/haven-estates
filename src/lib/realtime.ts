import "server-only";
import { EventEmitter } from "node:events";

// In-process pub/sub used by the Server-Sent Events endpoint (/api/realtime).
// Each signed-in user subscribes to their own channel; messaging, notifications and typing
// indicators publish to the recipient's channel. Swap this for Redis pub/sub or a hosted
// service (Pusher/Ably) to fan out across multiple server instances.

export type RealtimeEvent =
  | { type: "message:new"; conversationId: string; messageId: string; senderId: string }
  | { type: "message:read"; conversationId: string; readerId: string; readAt: string }
  | { type: "typing"; conversationId: string; userId: string; isTyping: boolean }
  | { type: "notification:new"; notificationId: string }
  | { type: "ping" };

const globalForRealtime = globalThis as unknown as { realtimeEmitter?: EventEmitter };
const emitter = globalForRealtime.realtimeEmitter ?? new EventEmitter();
emitter.setMaxListeners(0);
globalForRealtime.realtimeEmitter = emitter;

export function publishToUser(userId: string, event: RealtimeEvent) {
  emitter.emit(`user:${userId}`, event);
}

export function publishToUsers(userIds: string[], event: RealtimeEvent) {
  for (const id of new Set(userIds)) publishToUser(id, event);
}

export function subscribeToUser(userId: string, handler: (event: RealtimeEvent) => void) {
  const channel = `user:${userId}`;
  emitter.on(channel, handler);
  return () => emitter.off(channel, handler);
}

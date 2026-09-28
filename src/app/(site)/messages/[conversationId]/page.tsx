import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { MessageThread } from "@/components/messaging/message-thread";
import { MessagesShell } from "@/components/messaging/messages-shell";
import { getCurrentUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { findConnectionBetween } from "@/server/services/connections";
import { getConversationDetail, listConversations } from "@/server/services/messaging";

export const metadata: Metadata = { title: "Conversation", robots: { index: false } };

export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=/messages/${conversationId}`);

  let conversation;
  try {
    conversation = await getConversationDetail(conversationId, user);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    if (error instanceof AppError && error.code === "FORBIDDEN") redirect("/unauthorized");
    throw error;
  }

  const [conversations, connection] = await Promise.all([
    listConversations(user.id),
    conversation.otherUser.id ? findConnectionBetween(user.id, conversation.otherUser.id) : null,
  ]);

  return (
    <MessagesShell conversations={conversations} activeId={conversationId}>
      <MessageThread key={conversationId} conversation={conversation} currentUserId={user.id} connectionId={connection?.id ?? null} />
    </MessagesShell>
  );
}

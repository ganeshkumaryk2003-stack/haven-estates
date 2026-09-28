import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { MessagesShell } from "@/components/messaging/messages-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrCreateConversation, listConversations } from "@/server/services/messaging";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ to?: string; property?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/messages");
  const { to, property } = await searchParams;

  // /messages?to=<userId> opens (or creates) a direct conversation, e.g. from a profile page.
  if (to && to !== user.id) {
    if (!user.isEmailVerified) redirect("/settings/account?verify=1");
    let conversationId: string | null = null;
    try {
      const conversation = await getOrCreateConversation(user.id, to, property ?? null);
      conversationId = conversation.id;
    } catch {
      // Unknown or blocked user: fall through to the inbox with nothing selected.
    }
    if (conversationId) redirect(`/messages/${conversationId}`);
  }

  const conversations = await listConversations(user.id);
  return (
    <MessagesShell conversations={conversations}>
      <div className="flex h-full items-center justify-center p-8">
        <EmptyState
          icon={<MessageSquare />}
          title={conversations.length ? "Select a conversation" : "Your inbox is empty"}
          description={conversations.length ? "Pick a conversation from the list to keep chatting." : "Message a seller from any listing and the conversation will show up here in real time."}
          className="border-none"
        />
      </div>
    </MessagesShell>
  );
}

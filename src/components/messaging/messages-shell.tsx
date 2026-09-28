import { ConversationList } from "@/components/messaging/conversation-list";
import type { ConversationSummaryDTO } from "@/types/dto";
import { cn } from "@/lib/utils";

interface MessagesShellProps {
  conversations: ConversationSummaryDTO[];
  activeId?: string;
  children: React.ReactNode;
}

// Two-pane messenger: conversation list on the left, active thread on the right.
// On mobile only one pane is visible at a time.
export function MessagesShell({ conversations, activeId, children }: MessagesShellProps) {
  return (
    <div className="container-page py-6">
      <div className="grid h-[calc(100vh-9rem)] min-h-[520px] overflow-hidden rounded-xl border bg-card md:grid-cols-[320px_1fr]">
        <section className={cn("flex min-h-0 flex-col border-r", activeId && "hidden md:flex")} aria-label="Conversation list">
          <div className="border-b px-4 py-3">
            <h1 className="text-lg font-semibold">Messages</h1>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
            <ConversationList conversations={conversations} activeId={activeId} />
          </div>
        </section>
        <section className={cn("min-h-0", !activeId && "hidden md:block")} aria-label="Conversation">
          {children}
        </section>
      </div>
    </div>
  );
}

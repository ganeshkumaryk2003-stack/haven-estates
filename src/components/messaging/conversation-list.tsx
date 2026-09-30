"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { useRealtime } from "@/components/realtime-provider";
import { UserAvatar } from "@/components/ui/user-avatar";
import { APP_NAME } from "@/lib/constants";
import { formatMessageTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ConversationSummaryDTO } from "@/types/dto";

interface ConversationListProps {
  conversations: ConversationSummaryDTO[];
  activeId?: string;
}

export function ConversationList({ conversations, activeId }: ConversationListProps) {
  const router = useRouter();
  // Any new message (in any conversation) refreshes the server-rendered list so previews,
  // ordering and unread counts stay accurate.
  useRealtime((event) => {
    if (event.type === "message:new" || event.type === "message:read") router.refresh();
  });

  if (conversations.length === 0) {
    return <p className="p-6 text-center text-sm text-muted-foreground">No conversations yet. Message a seller from any listing to start one.</p>;
  }

  return (
    <ul className="divide-y" aria-label="Conversations">
      {conversations.map((conversation) => {
        const active = conversation.id === activeId;
        return (
          <li key={conversation.id}>
            <Link
              href={`/messages/${conversation.id}`}
              aria-current={active ? "page" : undefined}
              className={cn("flex gap-3 px-4 py-3 transition-colors hover:bg-accent/60", active && "bg-accent")}
            >
              <div className="relative shrink-0">
                <UserAvatar name={conversation.otherUser.name} image={conversation.otherUser.image} className="size-11" />
                {conversation.property?.coverImage ? (
                  <span className="absolute -right-1 -bottom-1 size-5 overflow-hidden rounded-md border-2 border-background">
                    <Image src={conversation.property.coverImage} alt="" width={20} height={20} className="size-full object-cover" />
                  </span>
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn("truncate text-sm", conversation.unreadCount > 0 ? "font-semibold" : "font-medium")}>{conversation.otherUser.name ?? `${APP_NAME} user`}</p>
                  {conversation.lastMessageAt ? <time className="shrink-0 text-xs text-muted-foreground">{formatMessageTime(conversation.lastMessageAt)}</time> : null}
                </div>
                {conversation.property ? <p className="truncate text-xs text-primary">{conversation.property.title}</p> : null}
                <div className="flex items-center justify-between gap-2">
                  <p className={cn("truncate text-xs", conversation.unreadCount > 0 ? "text-foreground" : "text-muted-foreground")}>
                    {conversation.blocked ? (
                      <span className="flex items-center gap-1">
                        <Ban className="size-3" /> Blocked
                      </span>
                    ) : (
                      conversation.lastMessagePreview ?? "No messages yet"
                    )}
                  </p>
                  {conversation.unreadCount > 0 ? (
                    <span className="flex min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground" aria-label={`${conversation.unreadCount} unread`}>
                      {conversation.unreadCount}
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Ban, CheckCheck, FileText, Loader2, Paperclip, SendHorizonal, X } from "lucide-react";
import { toast } from "sonner";
import { useRealtime } from "@/components/realtime-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ALLOWED_DOCUMENT_TYPES, ALLOWED_IMAGE_TYPES, APP_SHORT_NAME, MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/constants";
import { formatDate, formatMessageTime } from "@/lib/format";
import { formatBytes, uploadFile, type UploadResponse } from "@/lib/upload-client";
import { cn } from "@/lib/utils";
import { getConversationAction, loadOlderMessagesAction, markConversationReadAction, sendMessageAction, typingAction } from "@/server/actions/messaging";
import type { ConversationDetailDTO, MessageDTO } from "@/types/dto";

interface MessageThreadProps {
  conversation: ConversationDetailDTO;
  currentUserId: string;
  connectionId: string | null;
}

function groupByDay(messages: MessageDTO[]) {
  const groups: { day: string; messages: MessageDTO[] }[] = [];
  for (const message of messages) {
    const day = formatDate(message.createdAt, "EEEE, d MMM");
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.messages.push(message);
    else groups.push({ day, messages: [message] });
  }
  return groups;
}

export function MessageThread({ conversation: initial, currentUserId, connectionId }: MessageThreadProps) {
  const [messages, setMessages] = React.useState(initial.messages);
  const [hasMore, setHasMore] = React.useState(initial.hasMore);
  const [otherLastReadAt, setOtherLastReadAt] = React.useState(initial.otherLastReadAt);
  const [typing, setTyping] = React.useState(false);
  const [body, setBody] = React.useState("");
  const [attachments, setAttachments] = React.useState<UploadResponse[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [loadingOlder, setLoadingOlder] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);
  const typingTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = React.useRef(0);

  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = "auto") => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  React.useEffect(() => {
    scrollToBottom();
    void markConversationReadAction(initial.id);
  }, [initial.id, scrollToBottom]);

  const refresh = React.useCallback(async () => {
    const result = await getConversationAction(initial.id);
    if (!result.ok) return;
    setMessages((current) => {
      const known = new Set(current.map((message) => message.id));
      const fresh = result.data.messages.filter((message) => !known.has(message.id));
      return fresh.length ? [...current, ...fresh].sort((a, b) => a.createdAt.localeCompare(b.createdAt)) : current;
    });
    setOtherLastReadAt(result.data.otherLastReadAt);
  }, [initial.id]);

  useRealtime(
    (event) => {
      if (!("conversationId" in event) || event.conversationId !== initial.id) return;
      if (event.type === "message:new" && event.senderId !== currentUserId) {
        void refresh().then(() => {
          void markConversationReadAction(initial.id);
          requestAnimationFrame(() => scrollToBottom("smooth"));
        });
        setTyping(false);
      }
      if (event.type === "message:read" && event.readerId !== currentUserId) setOtherLastReadAt(event.readAt);
      if (event.type === "typing" && event.userId !== currentUserId) setTyping(event.isTyping);
    },
    [initial.id, currentUserId, refresh],
  );

  function onBodyChange(value: string) {
    setBody(value);
    const now = Date.now();
    if (now - lastTypingSent.current > 2500) {
      lastTypingSent.current = now;
      void typingAction(initial.id, true);
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => void typingAction(initial.id, false), 3000);
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files).slice(0, 5 - attachments.length);
    setUploading(true);
    for (const file of list) {
      const allowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES] as string[];
      if (!allowed.includes(file.type)) {
        toast.error(`${file.name}: only images and PDF files can be attached.`);
        continue;
      }
      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        toast.error(`${file.name}: attachments must be under 10 MB.`);
        continue;
      }
      try {
        const uploaded = await uploadFile(file, "attachment");
        setAttachments((current) => [...current, uploaded]);
      } catch (error) {
        toast.error((error as Error).message);
      }
    }
    setUploading(false);
  }

  async function send(event?: React.FormEvent) {
    event?.preventDefault();
    if (sending || (!body.trim() && attachments.length === 0)) return;
    setSending(true);
    const result = await sendMessageAction({
      conversationId: initial.id,
      body: body.trim(),
      attachments: attachments.map((file) => ({ url: file.url, storageKey: file.storageKey, name: file.name, contentType: file.contentType, size: file.size, kind: file.kind })),
    });
    setSending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setMessages((current) => (current.some((message) => message.id === result.data.id) ? current : [...current, result.data]));
    setBody("");
    setAttachments([]);
    void typingAction(initial.id, false);
    requestAnimationFrame(() => scrollToBottom("smooth"));
  }

  async function loadOlder() {
    const oldest = messages[0];
    if (!oldest || loadingOlder) return;
    setLoadingOlder(true);
    const el = scrollRef.current;
    const previousHeight = el?.scrollHeight ?? 0;
    const result = await loadOlderMessagesAction(initial.id, oldest.id);
    setLoadingOlder(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setMessages((current) => [...result.data.messages, ...current]);
    setHasMore(result.data.hasMore);
    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight - previousHeight;
    });
  }

  const lastOwnMessage = [...messages].reverse().find((message) => message.senderId === currentUserId);
  const lastOwnRead = lastOwnMessage && otherLastReadAt ? new Date(otherLastReadAt) >= new Date(lastOwnMessage.createdAt) : false;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Button asChild variant="ghost" size="icon-sm" className="md:hidden">
          <Link href="/messages" aria-label="Back to conversations">
            <ArrowLeft />
          </Link>
        </Button>
        <UserAvatar name={initial.otherUser.name} image={initial.otherUser.image} />
        <div className="min-w-0 flex-1">
          <Link href={`/profile/${initial.otherUser.id}`} className="block truncate text-sm font-semibold hover:underline">
            {initial.otherUser.name ?? `${APP_SHORT_NAME} member`}
          </Link>
          {initial.property ? (
            <Link href={`/properties/${initial.property.slug}`} className="block truncate text-xs text-primary hover:underline">
              Re: {initial.property.title}
            </Link>
          ) : (
            <p className="text-xs text-muted-foreground">Direct conversation</p>
          )}
        </div>
        {connectionId ? (
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/connections">Manage connection</Link>
          </Button>
        ) : null}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin" role="log" aria-live="polite" aria-label="Messages">
        {hasMore ? (
          <div className="mb-4 flex justify-center">
            <Button variant="outline" size="sm" onClick={loadOlder} loading={loadingOlder}>
              Load earlier messages
            </Button>
          </div>
        ) : null}
        {messages.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Say hello 👋</p> : null}
        {groupByDay(messages).map((group) => (
          <div key={group.day} className="flex flex-col gap-2">
            <p className="my-3 text-center text-xs font-medium text-muted-foreground">{group.day}</p>
            {group.messages.map((message) => {
              const mine = message.senderId === currentUserId;
              return (
                <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div className={cn("flex max-w-[80%] flex-col gap-1 rounded-2xl px-3.5 py-2 text-sm shadow-xs", mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted")}>
                    {message.body ? <p className="whitespace-pre-wrap break-words">{message.body}</p> : null}
                    {message.attachments.map((attachment) =>
                      attachment.kind === "IMAGE" ? (
                        <a key={attachment.id} href={attachment.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg">
                          <Image src={attachment.url} alt={attachment.name} width={320} height={240} className="max-h-60 w-auto object-cover" />
                        </a>
                      ) : (
                        <a
                          key={attachment.id}
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn("flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs", mine ? "border-primary-foreground/30" : "border-border bg-background")}
                        >
                          <FileText className="size-4 shrink-0" />
                          <span className="truncate">{attachment.name}</span>
                          <span className="shrink-0 opacity-70">{formatBytes(attachment.size)}</span>
                        </a>
                      ),
                    )}
                    <time className={cn("self-end text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")} dateTime={message.createdAt}>
                      {formatMessageTime(message.createdAt)}
                    </time>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {lastOwnMessage ? (
          <p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
            <CheckCheck className={cn("size-3.5", lastOwnRead && "text-primary")} aria-hidden="true" />
            {lastOwnRead ? `Seen ${otherLastReadAt ? formatMessageTime(otherLastReadAt) : ""}` : "Delivered"}
          </p>
        ) : null}
        {typing ? (
          <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
            {initial.otherUser.name?.split(" ")[0] ?? "They"} is typing…
          </p>
        ) : null}
      </div>

      {initial.blocked ? (
        <div className="flex items-center gap-2 border-t bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          <Ban className="size-4" /> Messaging is unavailable because one of you blocked the connection.
        </div>
      ) : (
        <form onSubmit={send} className="flex flex-col gap-2 border-t p-3">
          {attachments.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {attachments.map((file) => (
                <li key={file.storageKey} className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs">
                  {file.kind === "IMAGE" ? <Image src={file.url} alt="" width={24} height={24} className="size-6 rounded object-cover" /> : <FileText className="size-4" />}
                  <span className="max-w-40 truncate">{file.name}</span>
                  <button type="button" onClick={() => setAttachments((current) => current.filter((entry) => entry.storageKey !== file.storageKey))} aria-label={`Remove ${file.name}`}>
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex items-end gap-2">
            <input
              ref={fileInput}
              type="file"
              className="sr-only"
              multiple
              accept={[...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES].join(",")}
              onChange={(event) => {
                void onFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <Button type="button" variant="ghost" size="icon" aria-label="Attach a file" onClick={() => fileInput.current?.click()} disabled={uploading || attachments.length >= 5}>
              {uploading ? <Loader2 className="animate-spin" /> : <Paperclip />}
            </Button>
            <Textarea
              value={body}
              onChange={(event) => onBodyChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              rows={1}
              placeholder="Write a message… (Enter to send, Shift+Enter for a new line)"
              aria-label="Message"
              className="max-h-40 min-h-10 flex-1 resize-none"
              maxLength={4000}
            />
            <Button type="submit" size="icon" aria-label="Send message" loading={sending} disabled={uploading || (!body.trim() && attachments.length === 0)}>
              {sending ? null : <SendHorizonal />}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

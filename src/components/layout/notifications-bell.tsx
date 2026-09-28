"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/misc";
import { useRealtime } from "@/components/realtime-provider";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { listNotificationsAction, markAllNotificationsReadAction, markNotificationReadAction } from "@/server/actions/notifications";
import type { NotificationDTO } from "@/types/dto";

export function NotificationsBell({ initialUnread }: { initialUnread: number }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [unread, setUnread] = React.useState(initialUnread);
  const [items, setItems] = React.useState<NotificationDTO[] | null>(null);
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const result = await listNotificationsAction();
    if (result.ok) {
      setItems(result.data.items);
      setUnread(result.data.unread);
    }
    setLoading(false);
  }, []);

  useRealtime((event) => {
    if (event.type === "notification:new") {
      setUnread((count) => count + 1);
      if (open) void load();
    }
  }, [open, load]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) void load();
  }

  async function handleOpen(notification: NotificationDTO) {
    if (!notification.readAt) {
      setItems((current) => current?.map((item) => (item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item)) ?? null);
      setUnread((count) => Math.max(0, count - 1));
      await markNotificationReadAction(notification.id);
    }
    setOpen(false);
    if (notification.href) router.push(notification.href);
  }

  async function handleMarkAll() {
    setItems((current) => current?.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })) ?? null);
    setUnread(0);
    await markAllNotificationsReadAction();
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}>
          <Bell />
          {unread > 0 ? (
            <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Notifications</h2>
          <Button variant="ghost" size="sm" onClick={handleMarkAll} disabled={unread === 0}>
            <CheckCheck /> Mark all read
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {loading && !items ? <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p> : null}
          {items && items.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p> : null}
          <ul className="divide-y">
            {items?.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => void handleOpen(notification)}
                  className={cn("flex w-full flex-col gap-0.5 px-4 py-3 text-left text-sm transition-colors hover:bg-accent/60", !notification.readAt && "bg-accent/40")}
                >
                  <span className="flex items-center gap-2 font-medium">
                    {!notification.readAt ? <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" /> : null}
                    {notification.title}
                  </span>
                  <span className="line-clamp-2 text-muted-foreground">{notification.body}</span>
                  <span className="text-xs text-muted-foreground">{formatRelative(notification.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t px-4 py-2 text-center">
          <Link href="/settings/account#notifications" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>
            Notification preferences
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

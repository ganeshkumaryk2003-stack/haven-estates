import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { NotificationsPageActions } from "@/components/dashboard/notifications-page-actions";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentUser } from "@/lib/auth/session";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { listNotifications } from "@/server/services/notifications";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard/notifications");
  const notifications = await listNotifications(user.id, 100);
  const unread = notifications.filter((notification) => !notification.readAt).length;

  return (
    <>
      <PageHeader title="Notifications" description={`${unread} unread. Email copies follow your preferences in account settings.`} actions={<NotificationsPageActions hasUnread={unread > 0} />} />
      {notifications.length === 0 ? (
        <EmptyState icon={<Bell />} title="No notifications yet" description="Enquiries, messages, offers and reservation updates will show up here." />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <Link href={notification.href ?? "#"} className={cn("flex flex-col gap-0.5 px-4 py-3 text-sm transition-colors hover:bg-accent/50", !notification.readAt && "bg-accent/30")}>
                <span className="flex items-center gap-2">
                  {!notification.readAt ? <span className="size-2 rounded-full bg-primary" aria-label="Unread" /> : null}
                  <span className={notification.readAt ? "font-medium" : "font-semibold"}>{notification.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{formatRelative(notification.createdAt)}</span>
                </span>
                <span className="text-muted-foreground">{notification.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

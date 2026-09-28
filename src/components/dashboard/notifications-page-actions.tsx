"use client";

import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markAllNotificationsReadAction } from "@/server/actions/notifications";

export function NotificationsPageActions({ hasUnread }: { hasUnread: boolean }) {
  const router = useRouter();
  async function markAll() {
    const result = await markAllNotificationsReadAction();
    if (!result.ok) toast.error(result.error);
    router.refresh();
  }
  return (
    <Button variant="outline" onClick={markAll} disabled={!hasUnread}>
      <CheckCheck /> Mark all as read
    </Button>
  );
}

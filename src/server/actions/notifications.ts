"use server";

import { requireUser } from "@/lib/auth/session";
import { toActionError, type ActionResult } from "@/lib/errors";
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/server/services/notifications";
import type { NotificationDTO } from "@/types/dto";

export async function listNotificationsAction(): Promise<ActionResult<{ items: NotificationDTO[]; unread: number }>> {
  try {
    const user = await requireUser();
    const [rows, unread] = await Promise.all([listNotifications(user.id), getUnreadNotificationCount(user.id)]);
    return {
      ok: true,
      data: {
        unread,
        items: rows.map((row) => ({
          id: row.id,
          type: row.type,
          title: row.title,
          body: row.body,
          href: row.href,
          readAt: row.readAt?.toISOString() ?? null,
          createdAt: row.createdAt.toISOString(),
        })),
      },
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function markNotificationReadAction(notificationId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await markNotificationRead(user.id, notificationId);
    return { ok: true, data: undefined };
  } catch (error) {
    return toActionError(error);
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await markAllNotificationsRead(user.id);
    return { ok: true, data: undefined };
  } catch (error) {
    return toActionError(error);
  }
}

import "server-only";
import type { NotificationType, Prisma } from "@/generated/prisma/client";
import { sendEmail } from "@/lib/email";
import { notificationEmail } from "@/lib/email/templates";
import { prisma, type DbClient } from "@/lib/prisma";
import { publishToUser } from "@/lib/realtime";
import { absoluteUrl } from "@/lib/utils";

interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
  data?: Prisma.InputJsonValue;
  /** Which profile preference gates the email copy of this notification. */
  emailPreference?: "emailOnEnquiry" | "emailOnMessage" | "emailOnOffer" | "emailOnReservation";
}

// Creates an in-app notification, pushes it over SSE and (optionally) emails the user
// according to their preferences. Never throws: notification failures must not break the
// primary action.
export async function notify(input: NotifyInput, db: DbClient = prisma) {
  try {
    const notification = await db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href,
        data: input.data,
      },
    });
    publishToUser(input.userId, { type: "notification:new", notificationId: notification.id });

    if (input.emailPreference) {
      // Emails are sent after the transaction settles; deliberately not awaited inside `db`.
      void sendPreferenceEmail(input);
    }
    return notification;
  } catch (error) {
    console.error("[notifications] failed to create notification", error);
    return null;
  }
}

async function sendPreferenceEmail(input: NotifyInput) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true, name: true, profile: { select: { [input.emailPreference!]: true } } },
    });
    if (!user) return;
    const prefs = user.profile as Record<string, boolean> | null;
    if (prefs && prefs[input.emailPreference!] === false) return;
    const email = notificationEmail(user.name, input.title, input.body, absoluteUrl(input.href ?? "/dashboard"));
    await sendEmail({ to: user.email, ...email });
  } catch (error) {
    console.error("[notifications] email failed", error);
  }
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function listNotifications(userId: string, take = 30) {
  return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take });
}

export async function markNotificationRead(userId: string, notificationId: string) {
  await prisma.notification.updateMany({ where: { id: notificationId, userId, readAt: null }, data: { readAt: new Date() } });
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}

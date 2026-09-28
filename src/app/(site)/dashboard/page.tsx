import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, Building2, Eye, HandCoins, Heart, Inbox, MailWarning, MessageSquare, Plus, Receipt } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { PropertyCard } from "@/components/properties/property-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { formatRelative } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getUnreadMessageCount } from "@/server/services/messaging";
import { listNotifications } from "@/server/services/notifications";
import { getOwnerListingStats, toPropertyCard } from "@/server/services/properties";
import { getUserWithProfile } from "@/server/services/users";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

export default async function DashboardPage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) redirect("/login?callbackUrl=/dashboard");

  const [user, stats, unreadMessages, notifications, savedCount, buyerOffers, reservations, recentSaved, recentActivity] = await Promise.all([
    getUserWithProfile(sessionUser.id),
    getOwnerListingStats(sessionUser.id),
    getUnreadMessageCount(sessionUser.id),
    listNotifications(sessionUser.id, 6),
    prisma.favorite.count({ where: { userId: sessionUser.id } }),
    prisma.offer.count({ where: { buyerId: sessionUser.id, status: { in: ["PENDING", "COUNTERED", "ACCEPTED"] } } }),
    prisma.reservation.count({ where: { OR: [{ buyerId: sessionUser.id }, { sellerId: sessionUser.id }], status: { in: ["PENDING_PAYMENT", "DEPOSIT_PAID"] } } }),
    prisma.favorite.findMany({
      where: { userId: sessionUser.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { property: { include: { images: { orderBy: { position: "asc" }, take: 1, select: { url: true, alt: true } }, favorites: { where: { userId: sessionUser.id }, select: { id: true } } } } },
    }),
    prisma.auditLog.findMany({ where: { actorId: sessionUser.id }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);
  if (!user) redirect("/login");

  const firstName = user.name?.split(" ")[0] ?? "there";
  const isSellerish = user.role === "SELLER" || user.role === "AGENT" || stats.total > 0;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Here's what's happening with your properties, offers and conversations."
        actions={
          <Button asChild>
            <Link href="/properties/new">
              <Plus /> List a property
            </Link>
          </Button>
        }
      />

      {!user.emailVerified ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/50 bg-warning/10 px-4 py-3 text-sm">
          <span className="flex items-center gap-2">
            <MailWarning className="size-4" /> Verify your email to enquire, message, make offers and publish listings.
          </span>
          <Button asChild size="sm" variant="outline">
            <Link href="/settings/account">Resend verification</Link>
          </Button>
        </div>
      ) : null}
      {!user.profile?.onboardingCompleted ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-accent/40 px-4 py-3 text-sm">
          <span>Complete your profile so buyers and sellers know who they are talking to.</span>
          <Button asChild size="sm" variant="outline">
            <Link href="/onboarding">Complete profile</Link>
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Saved properties" value={savedCount} icon={Heart} href="/favorites" />
        <StatCard label="Unread messages" value={unreadMessages} icon={MessageSquare} href="/messages" tone={unreadMessages ? "primary" : "default"} />
        <StatCard label="Active offers" value={buyerOffers + stats.openOffers} hint={`${buyerOffers} made · ${stats.openOffers} received`} icon={HandCoins} href="/dashboard/offers" tone={stats.openOffers ? "warning" : "default"} />
        <StatCard label="Reservations" value={reservations} icon={Receipt} href="/dashboard/reservations" />
        {isSellerish ? (
          <>
            <StatCard label="Active listings" value={stats.active} hint={`${stats.drafts} drafts · ${stats.pending} pending review`} icon={Building2} href="/dashboard/properties" tone="primary" />
            <StatCard label="Listing views" value={stats.views} icon={Eye} href="/dashboard/properties" />
            <StatCard label="New enquiries" value={stats.newEnquiries} icon={Inbox} href="/dashboard/enquiries" tone={stats.newEnquiries ? "warning" : "default"} />
            <StatCard label="Saves on your listings" value={stats.favorites} icon={Heart} href="/dashboard/properties" />
          </>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          {recentSaved.length > 0 ? (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Recently saved</h2>
                <Link href="/favorites" className="text-sm text-primary hover:underline">
                  View all
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {recentSaved.map((favorite) => (
                  <PropertyCard key={favorite.id} property={toPropertyCard(favorite.property)} signedIn showStatus />
                ))}
              </div>
            </section>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Find your next home</CardTitle>
                <CardDescription>Save properties to compare them here, and enquire directly with sellers.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline">
                  <Link href="/properties">Browse properties</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Your latest actions on Haven.</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing yet. Activity such as listings, offers and sign-ins appears here.</p>
              ) : (
                <ul className="divide-y text-sm">
                  {recentActivity.map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="flex items-center gap-2">
                        <Badge variant="muted" className="font-mono text-[10px]">
                          {entry.action}
                        </Badge>
                        <span className="text-muted-foreground">{entry.targetType}</span>
                      </span>
                      <time className="shrink-0 text-xs text-muted-foreground">{formatRelative(entry.createdAt)}</time>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="size-4" /> Notifications
              </CardTitle>
            </div>
            <Link href="/dashboard/notifications" className="text-sm text-primary hover:underline">
              All
            </Link>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">You&apos;re all caught up.</p>
            ) : (
              <ul className="divide-y">
                {notifications.map((notification) => (
                  <li key={notification.id} className="py-2.5">
                    <Link href={notification.href ?? "/dashboard/notifications"} className="flex flex-col gap-0.5 text-sm hover:underline">
                      <span className={notification.readAt ? "font-normal" : "font-semibold"}>{notification.title}</span>
                      <span className="line-clamp-2 text-xs text-muted-foreground">{notification.body}</span>
                      <span className="text-xs text-muted-foreground">{formatRelative(notification.createdAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

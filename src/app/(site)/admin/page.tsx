import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Flag, HandCoins, Inbox, Receipt, ShieldAlert, Users, Wallet } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { PROPERTY_STATUSES, PROPERTY_STATUS_LABELS, ROLE_LABELS } from "@/lib/constants";
import { formatMoney, formatRelative } from "@/lib/format";
import { getAdminOverview } from "@/server/services/admin";

export const metadata: Metadata = { title: "Administration", robots: { index: false } };

export default async function AdminOverviewPage() {
  const overview = await getAdminOverview();
  return (
    <>
      <PageHeader title="Platform overview" description="Moderation queue, marketplace health and recent administrative activity." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Users" value={overview.users} hint={`${overview.newUsers} joined in the last 30 days`} icon={Users} href="/admin/users" />
        <StatCard label="Listings" value={overview.totalProperties} hint={`${overview.propertiesByStatus.ACTIVE ?? 0} active`} icon={Building2} href="/admin/properties" />
        <StatCard label="Pending review" value={overview.pendingReview} icon={ShieldAlert} href="/admin/properties?status=PENDING_REVIEW" tone={overview.pendingReview ? "warning" : "default"} />
        <StatCard label="Open reports" value={overview.openReports} icon={Flag} href="/admin/reports" tone={overview.openReports ? "warning" : "default"} />
        <StatCard label="Enquiries" value={overview.enquiries} icon={Inbox} />
        <StatCard label="Offers" value={overview.offers} hint={`${overview.openOffers} open`} icon={HandCoins} />
        <StatCard label="Reservations" value={overview.reservations} icon={Receipt} href="/admin/transactions" />
        <StatCard label="Deposits collected" value={formatMoney(overview.paidDepositTotal, "USD")} hint={`${overview.paidDepositCount} paid`} icon={Wallet} href="/admin/transactions" tone="primary" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Listings by status</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {PROPERTY_STATUSES.map((status) => (
                <li key={status} className="flex items-center justify-between py-2">
                  <Link href={`/admin/properties?status=${status}`} className="hover:underline">
                    {PROPERTY_STATUS_LABELS[status]}
                  </Link>
                  <span className="font-semibold">{overview.propertiesByStatus[status] ?? 0}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent registrations</CardTitle>
            <CardDescription>Newest accounts on the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {overview.recentUsers.map((user) => (
                <li key={user.id} className="flex items-center gap-3 py-2">
                  <UserAvatar name={user.name} image={user.image} className="size-8" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{user.name ?? "Unnamed"}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <Badge variant="outline">{ROLE_LABELS[user.role]}</Badge>
                  <span className="text-xs text-muted-foreground">{formatRelative(user.createdAt)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent audit events</CardTitle>
          <CardDescription>
            Sensitive operations are recorded with actor, target and metadata.{" "}
            <Link href="/admin/audit" className="text-primary hover:underline">
              Full log
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {overview.recentAudit.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center gap-2 py-2">
                <Badge variant="muted" className="font-mono text-[10px]">
                  {entry.action}
                </Badge>
                <span className="text-muted-foreground">
                  {entry.targetType} · {entry.actor?.name ?? entry.actor?.email ?? "system"}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">{formatRelative(entry.createdAt)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}

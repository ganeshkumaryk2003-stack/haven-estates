import type { Metadata } from "next";
import Link from "next/link";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { UserRoleSelect } from "@/components/admin/user-role-select";
import { ListControls } from "@/components/dashboard/list-controls";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserAvatar } from "@/components/ui/user-avatar";
import { getCurrentUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { adminSetUserStatusAction } from "@/server/actions/admin";
import { listUsersForAdmin } from "@/server/services/admin";

export const metadata: Metadata = { title: "Admin · Users", robots: { index: false } };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const params = await searchParams;
  const admin = await getCurrentUser();
  const status = params.status === "ACTIVE" || params.status === "SUSPENDED" ? params.status : undefined;
  const page = Math.max(1, Number(params.page) || 1);
  const result = await listUsersForAdmin({ q: params.q, status, page, pageSize: 25 });

  const hrefForPage = (nextPage: number) => {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    if (status) search.set("status", status);
    if (nextPage > 1) search.set("page", String(nextPage));
    const qs = search.toString();
    return qs ? `/admin/users?${qs}` : "/admin/users";
  };

  return (
    <>
      <PageHeader title="Users" description="Search accounts, change roles and suspend or reactivate users. Suspending a user hides their live listings and signs them out." />
      <ListControls
        statusOptions={[
          { value: "ACTIVE", label: "Active" },
          { value: "SUSPENDED", label: "Suspended" },
        ]}
        searchPlaceholder="Search name or email"
      />
      <p className="text-sm text-muted-foreground">{result.total} users</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Listings</TableHead>
            <TableHead className="text-right">Offers</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <UserAvatar name={user.name} image={user.image} className="size-9" />
                  <div className="min-w-0">
                    <Link href={`/profile/${user.id}`} className="block truncate font-medium hover:underline">
                      {user.name ?? "Unnamed"}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.email}
                      {user.emailVerified ? " · verified" : " · unverified"}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <UserRoleSelect userId={user.id} role={user.role} disabled={user.id === admin?.id} />
              </TableCell>
              <TableCell>
                <Badge variant={user.status === "ACTIVE" ? "success" : "destructive"}>{user.status.toLowerCase()}</Badge>
                {user.suspendReason ? <p className="mt-1 max-w-48 truncate text-xs text-muted-foreground">{user.suspendReason}</p> : null}
              </TableCell>
              <TableCell className="text-right">{user._count.properties}</TableCell>
              <TableCell className="text-right">{user._count.offersMade}</TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
              <TableCell>
                {user.id === admin?.id ? (
                  <span className="text-xs text-muted-foreground">You</span>
                ) : user.status === "ACTIVE" ? (
                  <AdminActionButton
                    label="Suspend"
                    variant="outline"
                    confirm={{ title: `Suspend ${user.name ?? user.email}?`, description: "They are signed out, cannot sign in and their live listings are archived.", reasonLabel: "Reason (internal)", destructive: true }}
                    action={adminSetUserStatusAction.bind(null, user.id, "SUSPENDED")}
                    successMessage="User suspended"
                  />
                ) : (
                  <AdminActionButton label="Reactivate" action={adminSetUserStatusAction.bind(null, user.id, "ACTIVE")} successMessage="User reactivated" />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination page={page} totalPages={result.totalPages} hrefForPage={hrefForPage} />
    </>
  );
}

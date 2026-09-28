import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { ListControls } from "@/components/dashboard/list-controls";
import { PageHeader } from "@/components/layout/page-header";
import { statusBadgeVariant } from "@/components/properties/property-card";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PropertyStatus } from "@/generated/prisma/enums";
import { PROPERTY_STATUSES, PROPERTY_STATUS_LABELS } from "@/lib/constants";
import { formatMoney, formatRelative } from "@/lib/format";
import { adminModeratePropertyAction } from "@/server/actions/admin";
import { listPropertiesForAdmin } from "@/server/services/admin";

export const metadata: Metadata = { title: "Admin · Listings", robots: { index: false } };

export default async function AdminPropertiesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const params = await searchParams;
  const status = PROPERTY_STATUSES.includes(params.status as PropertyStatus) ? (params.status as PropertyStatus) : undefined;
  const page = Math.max(1, Number(params.page) || 1);
  const result = await listPropertiesForAdmin({ q: params.q, status, page, pageSize: 20 });

  const hrefForPage = (nextPage: number) => {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    if (status) search.set("status", status);
    if (nextPage > 1) search.set("page", String(nextPage));
    const qs = search.toString();
    return qs ? `/admin/properties?${qs}` : "/admin/properties";
  };

  return (
    <>
      <PageHeader title="Listings" description="Approve or reject pending listings, feature standout homes and remove content that breaks the rules." />
      <ListControls statusOptions={PROPERTY_STATUSES.map((value) => ({ value, label: PROPERTY_STATUS_LABELS[value] }))} searchPlaceholder="Search title or city" />
      <p className="text-sm text-muted-foreground">{result.total} listings</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Listing</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Reports</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.map((property) => (
            <TableRow key={property.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                    {property.images[0] ? <Image src={property.images[0].url} alt="" fill sizes="48px" className="object-cover" /> : null}
                  </div>
                  <div className="min-w-0">
                    <Link href={`/properties/${property.slug}`} className="block max-w-64 truncate font-medium hover:underline">
                      {property.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {property.city}, {property.state}
                      {property.featured ? " · Featured" : ""}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Link href={`/profile/${property.owner.id}`} className="hover:underline">
                  {property.owner.name ?? property.owner.email}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant={statusBadgeVariant(property.status)}>{PROPERTY_STATUS_LABELS[property.status]}</Badge>
              </TableCell>
              <TableCell className="text-right whitespace-nowrap">{formatMoney(property.price.toString(), property.currency)}</TableCell>
              <TableCell className="text-right">{property._count.reports > 0 ? <Badge variant="destructive">{property._count.reports}</Badge> : "0"}</TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">{formatRelative(property.updatedAt)}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {property.status === "PENDING_REVIEW" ? (
                    <>
                      <AdminActionButton label="Approve" action={adminModeratePropertyAction.bind(null, property.id, "approve")} successMessage="Listing approved" />
                      <AdminActionButton
                        label="Reject"
                        variant="outline"
                        confirm={{ title: "Reject this listing?", description: "The owner is notified and can edit and resubmit.", reasonLabel: "Reason shown to the owner" }}
                        action={adminModeratePropertyAction.bind(null, property.id, "reject")}
                        successMessage="Listing rejected"
                      />
                    </>
                  ) : null}
                  {["ACTIVE", "UNDER_OFFER"].includes(property.status) ? (
                    <AdminActionButton
                      label={property.featured ? "Unfeature" : "Feature"}
                      variant="outline"
                      action={adminModeratePropertyAction.bind(null, property.id, property.featured ? "unfeature" : "feature")}
                    />
                  ) : null}
                  {!["ARCHIVED", "RESERVED", "SOLD", "RENTED", "REJECTED"].includes(property.status) ? (
                    <AdminActionButton
                      label="Remove"
                      variant="ghost"
                      className="text-destructive"
                      confirm={{ title: "Remove this listing?", description: "The listing is archived, open offers are closed and open reports are resolved.", reasonLabel: "Reason (sent to the owner)", destructive: true }}
                      action={adminModeratePropertyAction.bind(null, property.id, "archive")}
                      successMessage="Listing removed"
                    />
                  ) : null}
                  {["ARCHIVED", "REJECTED"].includes(property.status) ? (
                    <AdminActionButton label="Reactivate" variant="outline" action={adminModeratePropertyAction.bind(null, property.id, "reactivate")} />
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination page={page} totalPages={result.totalPages} hrefForPage={hrefForPage} />
    </>
  );
}

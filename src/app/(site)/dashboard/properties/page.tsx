import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Plus } from "lucide-react";
import { ListControls } from "@/components/dashboard/list-controls";
import { OwnerPropertyActions } from "@/components/dashboard/owner-property-actions";
import { PageHeader } from "@/components/layout/page-header";
import { PropertyCard, statusBadgeVariant } from "@/components/properties/property-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser } from "@/lib/auth/session";
import { PROPERTY_STATUSES, PROPERTY_STATUS_LABELS } from "@/lib/constants";
import { formatPrice, formatRelative } from "@/lib/format";
import { listOwnerProperties } from "@/server/services/properties";
import type { PropertyStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "My properties", robots: { index: false } };

export default async function MyPropertiesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; view?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard/properties");
  const params = await searchParams;
  const status = PROPERTY_STATUSES.includes(params.status as PropertyStatus) ? (params.status as PropertyStatus) : undefined;
  const properties = await listOwnerProperties(user.id, { status, q: params.q });
  const view = params.view === "cards" ? "cards" : "table";

  return (
    <>
      <PageHeader
        title="My properties"
        description="Manage drafts, publish listings, track views and respond to interest."
        actions={
          <Button asChild>
            <Link href="/properties/new">
              <Plus /> New listing
            </Link>
          </Button>
        }
      />
      <ListControls statusOptions={PROPERTY_STATUSES.map((value) => ({ value, label: PROPERTY_STATUS_LABELS[value] }))} showViewToggle searchPlaceholder="Search by title or city" />

      {properties.length === 0 ? (
        <EmptyState
          icon={<Building2 />}
          title={status || params.q ? "No listings match" : "You haven't listed anything yet"}
          description={status || params.q ? "Try a different status or search term." : "Create your first listing in a few minutes. You can save a draft and publish later."}
          action={
            <Button asChild>
              <Link href="/properties/new">
                <Plus /> List a property
              </Link>
            </Button>
          }
        />
      ) : view === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {properties.map((property) => (
            <div key={property.id} className="relative">
              <PropertyCard property={property} signedIn showStatus />
              <div className="absolute right-3 bottom-3 z-10 rounded-md bg-background/90 backdrop-blur">
                <OwnerPropertyActions property={property} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Listing</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead className="text-right">Saves</TableHead>
              <TableHead className="text-right">Enquiries</TableHead>
              <TableHead className="text-right">Open offers</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.map((property) => (
              <TableRow key={property.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                      {property.coverImage ? <Image src={property.coverImage.url} alt="" fill sizes="48px" className="object-cover" /> : null}
                    </div>
                    <div className="min-w-0">
                      <Link href={`/properties/${property.slug}`} className="block truncate font-medium hover:underline">
                        {property.title}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {property.city}, {property.state}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant(property.status)}>{PROPERTY_STATUS_LABELS[property.status]}</Badge>
                </TableCell>
                <TableCell className="text-right font-medium whitespace-nowrap">{formatPrice(property.price, property.currency, property.listingType)}</TableCell>
                <TableCell className="text-right">{property.viewCount.toLocaleString()}</TableCell>
                <TableCell className="text-right">{property.counts.favorites}</TableCell>
                <TableCell className="text-right">{property.counts.enquiries}</TableCell>
                <TableCell className="text-right">{property.counts.openOffers}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatRelative(property.updatedAt)}</TableCell>
                <TableCell className="text-right">
                  <OwnerPropertyActions property={property} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}

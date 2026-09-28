import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { PropertyForm } from "@/components/properties/property-form";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth/session";
import { PROPERTY_STATUS_LABELS } from "@/lib/constants";
import { getPropertyBySlugOrId, listAmenities } from "@/server/services/properties";

export const metadata: Metadata = { title: "Edit listing", robots: { index: false } };

export default async function EditPropertyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=/properties/${slug}/edit`);
  const [property, amenities] = await Promise.all([getPropertyBySlugOrId(slug, user), listAmenities()]);
  if (!property) notFound();
  if (property.ownerId !== user.id && user.role !== "ADMIN") redirect("/unauthorized");

  return (
    <div className="container-page flex flex-col gap-8 py-10">
      <PageHeader
        eyebrow="Manage listing"
        title={`Edit: ${property.title}`}
        description="Changes to live listings are published immediately. Reserved, sold or rented listings are read-only."
        actions={<Badge variant="outline">{PROPERTY_STATUS_LABELS[property.status]}</Badge>}
      />
      {["RESERVED", "SOLD", "RENTED"].includes(property.status) ? (
        <div role="alert" className="rounded-md border border-warning/50 bg-warning/10 px-4 py-3 text-sm">
          This listing is {PROPERTY_STATUS_LABELS[property.status].toLowerCase()} and can no longer be edited.
        </div>
      ) : (
        <PropertyForm
          property={property}
          amenities={amenities.map((amenity) => ({ id: amenity.id, slug: amenity.slug, name: amenity.name, category: amenity.category }))}
          emailVerified={user.isEmailVerified}
        />
      )}
    </div>
  );
}

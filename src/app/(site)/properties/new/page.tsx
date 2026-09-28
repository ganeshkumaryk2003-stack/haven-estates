import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { PropertyForm } from "@/components/properties/property-form";
import { getCurrentUser } from "@/lib/auth/session";
import { listAmenities } from "@/server/services/properties";

export const metadata: Metadata = { title: "List a property", robots: { index: false } };

export default async function NewPropertyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/properties/new");
  const amenities = await listAmenities();

  return (
    <div className="container-page flex flex-col gap-8 py-10">
      <PageHeader
        eyebrow="Sell or rent"
        title="List a property"
        description="Fill in the details step by step. You can save a draft at any point and publish when the listing is ready."
      />
      <PropertyForm amenities={amenities.map((amenity) => ({ id: amenity.id, slug: amenity.slug, name: amenity.name, category: amenity.category }))} emailVerified={user.isEmailVerified} />
    </div>
  );
}

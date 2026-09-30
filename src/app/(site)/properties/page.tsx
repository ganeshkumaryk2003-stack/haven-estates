import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { PropertyMap } from "@/components/map/property-map";
import { PageHeader } from "@/components/layout/page-header";
import { PropertyCard } from "@/components/properties/property-card";
import { ActiveFilterChips, PropertyFiltersPanel } from "@/components/properties/property-filters";
import { ResultsToolbar } from "@/components/properties/results-toolbar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { getCurrentUser } from "@/lib/auth/session";
import { LISTING_TYPE_LABELS } from "@/lib/constants";
import { parsePropertyFilters, propertiesHref, type RawSearchParams } from "@/lib/search-params";
import { absoluteUrl } from "@/lib/utils";
import { listAmenities, searchProperties } from "@/server/services/properties";

interface PageProps {
  searchParams: Promise<RawSearchParams>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const filters = parsePropertyFilters(await searchParams);
  const parts = [filters.listingType ? `Properties ${LISTING_TYPE_LABELS[filters.listingType].toLowerCase()}` : "Properties", filters.location ? `in ${filters.location}` : null].filter(Boolean);
  const title = parts.join(" ");
  return {
    title,
    description: `Browse ${title.toLowerCase()} with photos, prices, maps and verified sellers.`,
    alternates: { canonical: absoluteUrl(propertiesHref({ listingType: filters.listingType, propertyType: filters.propertyType, location: filters.location })) },
    robots: filters.page > 1 ? { index: false, follow: true } : undefined,
  };
}

export default async function PropertiesPage({ searchParams }: PageProps) {
  const filters = parsePropertyFilters(await searchParams);
  const user = await getCurrentUser();
  const [results, amenities] = await Promise.all([searchProperties(filters, user?.id), listAmenities()]);
  const amenityDTOs = amenities.map((amenity) => ({ id: amenity.id, slug: amenity.slug, name: amenity.name, category: amenity.category }));
  const markers = results.items
    .filter((property) => property.latitude !== null && property.longitude !== null)
    .map((property) => ({
      id: property.id,
      latitude: property.latitude!,
      longitude: property.longitude!,
      title: property.title,
      price: property.price,
      currency: property.currency,
      listingType: property.listingType,
      href: `/properties/${property.slug}`,
      imageUrl: property.coverImage?.url ?? null,
    }));

  return (
    <div className="container-page flex flex-col gap-6 py-8">
      <PageHeader
        title={filters.listingType ? `Properties ${LISTING_TYPE_LABELS[filters.listingType].toLowerCase()}` : "Browse properties"}
        description="Search by keyword, city or locality, filter by type, budget, BHK and amenities, then share the link - every filter lives in the URL."
      />
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <PropertyFiltersPanel filters={filters} amenities={amenityDTOs} />
        <section className="flex flex-col gap-4" aria-label="Search results">
          <ResultsToolbar filters={filters} total={results.total} />
          <ActiveFilterChips filters={filters} amenities={amenityDTOs} />

          {results.items.length === 0 ? (
            <EmptyState
              icon={<SearchX />}
              title="No properties match these filters"
              description="Try widening the price range, removing an amenity, or searching a nearby city."
              action={
                <Button asChild variant="outline">
                  <Link href="/properties">Clear filters</Link>
                </Button>
              }
            />
          ) : filters.view === "map" ? (
            <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
              <PropertyMap markers={markers} className="h-[70vh] min-h-[420px] overflow-hidden rounded-xl border" />
              <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1 scrollbar-thin">
                {results.items.map((property) => (
                  <PropertyCard key={property.id} property={property} signedIn={Boolean(user)} layout="list" />
                ))}
              </div>
            </div>
          ) : (
            <div className={filters.view === "list" ? "flex flex-col gap-4" : "grid gap-5 sm:grid-cols-2 xl:grid-cols-3"}>
              {results.items.map((property, index) => (
                <PropertyCard key={property.id} property={property} signedIn={Boolean(user)} layout={filters.view === "list" ? "list" : "grid"} priority={index < 3} />
              ))}
            </div>
          )}

          {filters.view !== "map" ? (
            <Pagination page={results.page} totalPages={results.totalPages} hrefForPage={(page) => propertiesHref(filters, { page })} className="pt-4" />
          ) : null}
        </section>
      </div>
    </div>
  );
}

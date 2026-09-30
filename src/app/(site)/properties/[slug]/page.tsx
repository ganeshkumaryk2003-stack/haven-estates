import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ExternalLink, FileText, Home, Pencil, Video } from "lucide-react";
import { PropertyMap } from "@/components/map/property-map";
import { JourneyRail, stepFromStatus } from "@/components/offers/journey-rail";
import { EnquiryDialog, MessageSellerDialog, OfferDialog, ReportDialog } from "@/components/properties/engagement-dialogs";
import { FavoriteButton } from "@/components/properties/favorite-button";
import { PropertyCard, statusBadgeVariant } from "@/components/properties/property-card";
import { PropertyGallery } from "@/components/properties/property-gallery";
import { ReserveButton } from "@/components/properties/reserve-button";
import { ShareButton } from "@/components/properties/share-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { getCurrentUser } from "@/lib/auth/session";
import { FURNISHED_LABELS, LISTING_TYPE_LABELS, PROPERTY_STATUS_LABELS, PROPERTY_TYPE_LABELS, ROLE_LABELS, isPlotType } from "@/lib/constants";
import { stripeConfigured } from "@/lib/env";
import { formatArea, formatBathrooms, formatDate, formatMoney, formatPrice, formatRelative } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, cn, safeJsonLd } from "@/lib/utils";
import { getPropertyBySlugOrId, getSimilarProperties, isOpenForEngagement, recordPropertyView } from "@/server/services/properties";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPropertyBySlugOrId(slug);
  if (!property) return { title: "Property not found" };
  const rooms = isPlotType(property.propertyType) ? `${formatArea(property.lotArea, property.areaUnit)} plot` : `${property.bedrooms} BHK, ${formatBathrooms(property.bathrooms)} bath`;
  const description = `${PROPERTY_TYPE_LABELS[property.propertyType]} ${LISTING_TYPE_LABELS[property.listingType].toLowerCase()} in ${property.city}, ${property.state} · ${formatPrice(property.price, property.currency, property.listingType)} · ${rooms}.`;
  return {
    title: property.title,
    description,
    alternates: { canonical: absoluteUrl(`/properties/${property.slug}`) },
    openGraph: {
      title: property.title,
      description,
      type: "website",
      url: absoluteUrl(`/properties/${property.slug}`),
      images: property.coverImage ? [{ url: absoluteUrl(property.coverImage.url), alt: property.coverImage.alt ?? property.title }] : undefined,
    },
    robots: property.status === "ACTIVE" || property.status === "UNDER_OFFER" ? undefined : { index: false, follow: true },
  };
}

export default async function PropertyDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const property = await getPropertyBySlugOrId(slug, user);
  if (!property) notFound();

  const isOwner = user?.id === property.ownerId;
  const isAdmin = user?.role === "ADMIN";
  const signedIn = Boolean(user);
  const verified = Boolean(user?.isEmailVerified);
  const open = isOpenForEngagement(property.status);

  const [similar, acceptedOffer] = await Promise.all([
    getSimilarProperties(property, user?.id),
    user && !isOwner
      ? prisma.offer.findFirst({
          where: { propertyId: property.id, buyerId: user.id, status: { in: ["PENDING", "COUNTERED", "ACCEPTED"] } },
          select: { id: true, status: true, reservation: { select: { id: true, status: true } } },
        })
      : null,
  ]);
  void recordPropertyView(property.id, property.ownerId, user?.id);

  const url = absoluteUrl(`/properties/${property.slug}`);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.title,
    description: property.description.slice(0, 500),
    url,
    datePosted: property.publishedAt ?? property.createdAt,
    image: property.images.map((image) => absoluteUrl(image.url)),
    offers: {
      "@type": "Offer",
      price: property.price,
      priceCurrency: property.currency,
      availability: open ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      businessFunction: property.listingType === "RENT" ? "http://purl.org/goodrelations/v1#LeaseOut" : "http://purl.org/goodrelations/v1#Sell",
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: property.address,
      addressLocality: property.city,
      addressRegion: property.state,
      postalCode: property.postalCode,
      addressCountry: property.country,
    },
    ...(property.latitude !== null && property.longitude !== null ? { geo: { "@type": "GeoCoordinates", latitude: property.latitude, longitude: property.longitude } } : {}),
  };

  const facts = [
    !isPlotType(property.propertyType) ? { label: "Bedrooms", value: `${property.bedrooms} BHK` } : null,
    !isPlotType(property.propertyType) ? { label: "Bathrooms", value: formatBathrooms(property.bathrooms) } : null,
    { label: "Car parking", value: String(property.parkingSpaces) },
    { label: "Built-up area", value: formatArea(property.interiorArea, property.areaUnit) },
    { label: "Plot area", value: formatArea(property.lotArea, property.areaUnit) },
    { label: "Year built", value: property.yearBuilt ? String(property.yearBuilt) : "—" },
    { label: "Furnished", value: FURNISHED_LABELS[property.furnished] },
    { label: "Type", value: PROPERTY_TYPE_LABELS[property.propertyType] },
    { label: "Available", value: property.availableFrom ? formatDate(property.availableFrom) : "Now" },
  ].filter(Boolean) as { label: string; value: string }[];

  // Amenities grouped by the category already on each AmenityDTO.
  const amenityGroups = property.amenities.reduce<Record<string, typeof property.amenities>>((groups, amenity) => {
    const key = amenity.category ?? "Other";
    (groups[key] ??= []).push(amenity);
    return groups;
  }, {});

  const price = formatPrice(property.price, property.currency, property.listingType);
  const journey = !isOwner && (open || acceptedOffer) ? stepFromStatus(acceptedOffer?.status, acceptedOffer?.reservation?.status) : null;

  return (
    <div className="container-page flex flex-col gap-8 py-8 pb-28 lg:pb-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }} />

      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
          </li>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          <li>
            <Link href="/properties" className="hover:text-foreground">
              Properties
            </Link>
          </li>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          <li>
            <Link href={`/properties?location=${encodeURIComponent(property.city)}`} className="hover:text-foreground">
              {property.city}
            </Link>
          </li>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          <li aria-current="page" className="truncate text-foreground">
            {property.title}
          </li>
        </ol>
      </nav>

      {(isOwner || isAdmin) && property.status !== "ACTIVE" ? (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/50 bg-warning/10 px-4 py-3 text-sm">
          <span>
            This listing is <strong>{PROPERTY_STATUS_LABELS[property.status].toLowerCase()}</strong>
            {property.status === "PENDING_REVIEW" ? " and only visible to you until a moderator approves it." : property.status === "DRAFT" ? " and only visible to you." : "."}
            {property.status === "REJECTED" && property.rejectionReason ? ` Reason: ${property.rejectionReason}` : ""}
          </span>
          {isOwner ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/properties/${property.slug}/edit`}>
                <Pencil /> Edit listing
              </Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="relative">
        <PropertyGallery images={property.images} title={property.title} />
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-10">
          <header className="flex flex-col gap-3">
            <h1 className="text-3xl sm:text-4xl">{property.title}</h1>
            <p className="text-muted-foreground">
              {property.address}, {property.city}, {property.state} {property.postalCode}, {property.country}
            </p>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
              <p className="text-price text-3xl sm:text-4xl">{price}</p>
              <span className="text-sm text-muted-foreground">{LISTING_TYPE_LABELS[property.listingType]}</span>
              {property.status !== "ACTIVE" ? <Badge variant={statusBadgeVariant(property.status)}>{PROPERTY_STATUS_LABELS[property.status]}</Badge> : null}
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
              <span>Listed {property.publishedAt ? formatRelative(property.publishedAt) : formatRelative(property.createdAt)}</span>
              {isOwner || isAdmin ? (
                <>
                  <span>{property.viewCount.toLocaleString()} views</span>
                  <span>Ref {property.id.slice(-8).toUpperCase()}</span>
                  <span>Updated {formatDate(property.updatedAt)}</span>
                </>
              ) : null}
            </div>
          </header>

          <section aria-labelledby="facts-heading" className="flex flex-col gap-4">
            <h2 id="facts-heading" className="text-xl">
              Key facts
            </h2>
            {/* One strip: serif value over its label, hairlines between items, two columns on mobile. */}
            <dl className="grid grid-cols-2 gap-y-5 border-y border-border py-5 sm:flex sm:flex-wrap sm:gap-y-6">
              {facts.map((fact, index) => (
                <div key={fact.label} className={cn("flex flex-col-reverse gap-0.5 px-4 sm:border-l sm:border-border", index % 2 === 0 ? "border-l-0" : "border-l border-border", index === 0 && "sm:border-l-0 sm:pl-0")}>
                  <dt className="text-xs text-muted-foreground">{fact.label}</dt>
                  <dd className="font-display text-xl font-semibold tabular-nums">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="description-heading" className="flex flex-col gap-3">
            <h2 id="description-heading" className="text-xl">
              About this property
            </h2>
            <div className="prose prose-sm max-w-none whitespace-pre-line text-foreground/90 dark:prose-invert">{property.description}</div>
          </section>

          {property.amenities.length > 0 ? (
            <section aria-labelledby="amenities-heading" className="flex flex-col gap-5">
              <h2 id="amenities-heading" className="text-xl">
                Amenities
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(amenityGroups).map(([category, list]) => (
                  <div key={category} className="flex flex-col gap-2">
                    <h3 className="font-sans text-sm font-semibold tracking-normal text-muted-foreground">{category}</h3>
                    <ul className="flex flex-col gap-1.5 text-sm">
                      {list.map((amenity) => (
                        <li key={amenity.id}>{amenity.name}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {property.floorPlanUrl || property.videoUrl || property.virtualTourUrl ? (
            <section aria-labelledby="media-heading" className="flex flex-col gap-3">
              <h2 id="media-heading" className="text-xl">
                Plans, video & tours
              </h2>
              <div className="flex flex-wrap gap-2">
                {property.floorPlanUrl ? (
                  <Button asChild variant="outline">
                    <a href={property.floorPlanUrl} target="_blank" rel="noopener noreferrer">
                      <FileText /> Floor plan <ExternalLink className="size-3" />
                    </a>
                  </Button>
                ) : null}
                {property.videoUrl ? (
                  <Button asChild variant="outline">
                    <a href={property.videoUrl} target="_blank" rel="noopener noreferrer">
                      <Video /> Video <ExternalLink className="size-3" />
                    </a>
                  </Button>
                ) : null}
                {property.virtualTourUrl ? (
                  <Button asChild variant="outline">
                    <a href={property.virtualTourUrl} target="_blank" rel="noopener noreferrer">
                      <Home /> Virtual tour <ExternalLink className="size-3" />
                    </a>
                  </Button>
                ) : null}
              </div>
            </section>
          ) : null}

          <section aria-labelledby="location-heading" className="flex flex-col gap-3">
            <h2 id="location-heading" className="text-xl">
              Location
            </h2>
            <p className="text-sm text-muted-foreground">
              {property.address}, {property.city}, {property.state} {property.postalCode}, {property.country}
            </p>
            {property.latitude !== null && property.longitude !== null ? (
              <PropertyMap
                markers={[{ id: property.id, latitude: property.latitude, longitude: property.longitude, title: property.title }]}
                className="h-80 overflow-hidden rounded-2xl border border-border"
                zoom={14}
              />
            ) : (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">The seller has not added map coordinates for this listing.</p>
            )}
          </section>
        </div>

        <aside id="offer-panel" className="flex scroll-mt-24 flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardContent className="flex flex-col gap-5">
              <div>
                <p className="text-price text-3xl">{price}</p>
                <p className="mt-1 text-sm text-muted-foreground">Reservation deposit {formatMoney(property.depositAmount, property.currency)}</p>
              </div>

              {isOwner ? (
                <div className="flex flex-col gap-2">
                  <Button asChild>
                    <Link href={`/properties/${property.slug}/edit`}>
                      <Pencil /> Edit listing
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/dashboard/properties">Manage listings</Link>
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {property.counts.enquiries} enquiries, {property.counts.offers} offers and {property.counts.favorites} saves
                  </p>
                </div>
              ) : open ? (
                <div className="flex flex-col gap-2">
                  {acceptedOffer?.status === "ACCEPTED" ? (
                    <div className="flex flex-col gap-2 rounded-md border border-success/40 bg-success/10 p-3 text-sm">
                      <p className="font-medium">Your offer was accepted 🎉</p>
                      {acceptedOffer.reservation?.status === "DEPOSIT_PAID" ? (
                        <p>Deposit paid. See your reservation for next steps.</p>
                      ) : stripeConfigured ? (
                        <ReserveButton offerId={acceptedOffer.id} size="sm" />
                      ) : (
                        <p className="text-muted-foreground">Payments are not configured on this server.</p>
                      )}
                      <Link href="/dashboard/reservations" className="text-xs underline">
                        View reservations
                      </Link>
                    </div>
                  ) : (
                    <>
                      {acceptedOffer ? (
                        <Button asChild size="lg" variant="secondary" className="w-full">
                          <Link href="/dashboard/offers">View your {acceptedOffer.status === "COUNTERED" ? "counteroffer" : "pending offer"}</Link>
                        </Button>
                      ) : (
                        <OfferDialog property={property} signedIn={signedIn} verified={verified} triggerProps={{ variant: "default", size: "lg", className: "w-full" }} />
                      )}
                      <EnquiryDialog property={property} signedIn={signedIn} verified={verified} triggerProps={{ variant: "outline", className: "w-full" }} />
                      <MessageSellerDialog property={property} signedIn={signedIn} verified={verified} triggerProps={{ variant: "link" }} />
                    </>
                  )}
                </div>
              ) : (
                <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                  This property is {PROPERTY_STATUS_LABELS[property.status].toLowerCase()} and no longer accepting enquiries or offers.
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <FavoriteButton propertyId={property.id} initialFavorited={property.isFavorited} initialCount={property.favoriteCount} signedIn={signedIn} variant="full" />
                <ShareButton title={property.title} url={url} />
              </div>
              <p className="text-xs text-muted-foreground">Reservation deposits are processed securely by Stripe (test mode). Reserving a property is not a legal transfer of ownership.</p>
            </CardContent>
          </Card>

          {journey ? (
            <Card>
              <CardContent className="flex flex-col gap-4">
                <h2 className="text-lg">What happens next</h2>
                <JourneyRail orientation="vertical" current={journey.current} complete={journey.complete} />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <UserAvatar name={property.owner.name} image={property.owner.image} className="size-12" />
                <div className="min-w-0 text-sm">
                  <Link href={`/profile/${property.owner.id}`} className="font-semibold hover:underline">
                    {property.owner.name ?? "Seller"}
                  </Link>
                  <p className="text-muted-foreground">
                    {ROLE_LABELS[property.owner.role]}
                    {property.owner.company ? ` at ${property.owner.company}` : ""}
                  </p>
                  {property.owner.emailVerified ? <p className="text-muted-foreground">Email verified</p> : null}
                  <p className="text-muted-foreground">Member since {formatDate(property.owner.createdAt, "MMM yyyy")}</p>
                </div>
              </div>
              {property.owner.bio ? <p className="line-clamp-4 text-sm text-muted-foreground">{property.owner.bio}</p> : null}
              <Button asChild variant="outline" size="sm">
                <Link href={`/profile/${property.owner.id}`}>View profile</Link>
              </Button>
            </CardContent>
          </Card>

          {!isOwner ? (
            <div className="flex justify-center">
              <ReportDialog property={property} signedIn={signedIn} />
            </div>
          ) : null}
        </aside>
      </div>

      {/* Mobile: price and a jump link to the offer panel, hidden once the sidebar is visible. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <p className="text-price text-xl">{price}</p>
        <Button asChild>
          <a href="#offer-panel">Offer options</a>
        </Button>
      </div>

      {similar.length > 0 ? (
        <section aria-labelledby="similar-heading" className="flex flex-col gap-4 border-t border-border pt-10">
          <div className="flex items-end justify-between">
            <h2 id="similar-heading" className="text-2xl">
              Similar properties
            </h2>
            <Link href={`/properties?location=${encodeURIComponent(property.city)}&listingType=${property.listingType}`} className="text-sm text-primary hover:underline">
              More in {property.city}
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {similar.map((item) => (
              <PropertyCard key={item.id} property={item} signedIn={signedIn} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

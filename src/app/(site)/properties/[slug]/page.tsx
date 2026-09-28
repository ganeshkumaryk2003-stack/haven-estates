import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Bath,
  BedDouble,
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Eye,
  FileText,
  Hash,
  Home,
  MapPin,
  Pencil,
  Ruler,
  ShieldCheck,
  Sofa,
  Video,
} from "lucide-react";
import { PropertyMap } from "@/components/map/property-map";
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
import { FURNISHED_LABELS, LISTING_TYPE_LABELS, PROPERTY_STATUS_LABELS, PROPERTY_TYPE_LABELS, ROLE_LABELS } from "@/lib/constants";
import { stripeConfigured } from "@/lib/env";
import { formatArea, formatBathrooms, formatDate, formatMoney, formatPrice, formatRelative } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, safeJsonLd } from "@/lib/utils";
import { getPropertyBySlugOrId, getSimilarProperties, isOpenForEngagement, recordPropertyView } from "@/server/services/properties";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPropertyBySlugOrId(slug);
  if (!property) return { title: "Property not found" };
  const description = `${PROPERTY_TYPE_LABELS[property.propertyType]} ${LISTING_TYPE_LABELS[property.listingType].toLowerCase()} in ${property.city}, ${property.state} · ${formatPrice(property.price, property.currency, property.listingType)} · ${property.bedrooms} bed, ${formatBathrooms(property.bathrooms)} bath.`;
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
    property.propertyType !== "LAND" ? { icon: BedDouble, label: "Bedrooms", value: String(property.bedrooms) } : null,
    property.propertyType !== "LAND" ? { icon: Bath, label: "Bathrooms", value: formatBathrooms(property.bathrooms) } : null,
    { icon: Car, label: "Parking", value: String(property.parkingSpaces) },
    { icon: Ruler, label: "Interior", value: formatArea(property.interiorArea, property.areaUnit) },
    { icon: Ruler, label: "Lot", value: formatArea(property.lotArea, property.areaUnit) },
    { icon: CalendarDays, label: "Year built", value: property.yearBuilt ? String(property.yearBuilt) : "—" },
    { icon: Sofa, label: "Furnished", value: FURNISHED_LABELS[property.furnished] },
    { icon: Home, label: "Type", value: PROPERTY_TYPE_LABELS[property.propertyType] },
    { icon: CalendarDays, label: "Available", value: property.availableFrom ? formatDate(property.availableFrom) : "Now" },
  ].filter(Boolean) as { icon: typeof Home; label: string; value: string }[];

  return (
    <div className="container-page flex flex-col gap-8 py-8">
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
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={property.listingType === "SALE" ? "default" : "secondary"}>{LISTING_TYPE_LABELS[property.listingType]}</Badge>
              <Badge variant="outline">{PROPERTY_TYPE_LABELS[property.propertyType]}</Badge>
              {property.status !== "ACTIVE" ? <Badge variant={statusBadgeVariant(property.status)}>{PROPERTY_STATUS_LABELS[property.status]}</Badge> : null}
              {property.featured ? <Badge variant="warning">Featured</Badge> : null}
            </div>
            <h1 className="text-3xl font-bold sm:text-4xl">{property.title}</h1>
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="size-4" aria-hidden="true" />
              {property.address}, {property.city}, {property.state} {property.postalCode}, {property.country}
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="size-4" aria-hidden="true" /> {property.viewCount.toLocaleString()} views
              </span>
              <span className="flex items-center gap-1">
                <Hash className="size-4" aria-hidden="true" /> Ref {property.id.slice(-8).toUpperCase()}
              </span>
              <span>Listed {property.publishedAt ? formatRelative(property.publishedAt) : formatRelative(property.createdAt)}</span>
              <span>Updated {formatDate(property.updatedAt)}</span>
            </div>
          </header>

          <section aria-labelledby="facts-heading" className="flex flex-col gap-4">
            <h2 id="facts-heading" className="text-xl font-semibold">
              Key facts
            </h2>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {facts.map((fact) => (
                <div key={fact.label} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                  <fact.icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <dt className="text-xs text-muted-foreground">{fact.label}</dt>
                    <dd className="text-sm font-semibold">{fact.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="description-heading" className="flex flex-col gap-3">
            <h2 id="description-heading" className="text-xl font-semibold">
              About this property
            </h2>
            <div className="prose prose-sm max-w-none whitespace-pre-line text-foreground/90 dark:prose-invert">{property.description}</div>
          </section>

          {property.amenities.length > 0 ? (
            <section aria-labelledby="amenities-heading" className="flex flex-col gap-3">
              <h2 id="amenities-heading" className="text-xl font-semibold">
                Amenities
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {property.amenities.map((amenity) => (
                  <li key={amenity.id} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
                    {amenity.name}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {property.floorPlanUrl || property.videoUrl || property.virtualTourUrl ? (
            <section aria-labelledby="media-heading" className="flex flex-col gap-3">
              <h2 id="media-heading" className="text-xl font-semibold">
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
            <h2 id="location-heading" className="text-xl font-semibold">
              Location
            </h2>
            <p className="text-sm text-muted-foreground">
              {property.address}, {property.city}, {property.state} {property.postalCode}, {property.country}
            </p>
            {property.latitude !== null && property.longitude !== null ? (
              <PropertyMap
                markers={[{ id: property.id, latitude: property.latitude, longitude: property.longitude, title: property.title }]}
                className="h-80 overflow-hidden rounded-xl border"
                zoom={14}
              />
            ) : (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">The seller has not added map coordinates for this listing.</p>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardContent className="flex flex-col gap-5">
              <div>
                <p className="text-3xl font-bold text-primary">{formatPrice(property.price, property.currency, property.listingType)}</p>
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
                    {property.counts.enquiries} enquiries · {property.counts.offers} offers · {property.counts.favorites} saves
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
                      <EnquiryDialog property={property} signedIn={signedIn} verified={verified} triggerProps={{ size: "lg" }} />
                      <MessageSellerDialog property={property} signedIn={signedIn} verified={verified} />
                      {acceptedOffer ? (
                        <Button asChild variant="secondary">
                          <Link href="/dashboard/offers">View your {acceptedOffer.status === "COUNTERED" ? "counteroffer" : "pending offer"}</Link>
                        </Button>
                      ) : (
                        <OfferDialog property={property} signedIn={signedIn} verified={verified} />
                      )}
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
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                Reservation deposits are processed securely by Stripe (test mode). Reserving a property is not a legal transfer of ownership.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <UserAvatar name={property.owner.name} image={property.owner.image} className="size-12" />
                <div className="min-w-0">
                  <Link href={`/profile/${property.owner.id}`} className="font-semibold hover:underline">
                    {property.owner.name ?? "Seller"}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABELS[property.owner.role]}
                    {property.owner.company ? ` · ${property.owner.company}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {property.owner.emailVerified ? "Verified email · " : ""}Member since {formatDate(property.owner.createdAt, "MMM yyyy")}
                  </p>
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

      {similar.length > 0 ? (
        <section aria-labelledby="similar-heading" className="flex flex-col gap-4 border-t pt-10">
          <div className="flex items-end justify-between">
            <h2 id="similar-heading" className="text-2xl font-bold">
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

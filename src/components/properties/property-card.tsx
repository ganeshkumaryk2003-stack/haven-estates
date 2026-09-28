import Image from "next/image";
import Link from "next/link";
import { Bath, BedDouble, Car, ImageOff, MapPin, Ruler } from "lucide-react";
import { FavoriteButton } from "@/components/properties/favorite-button";
import { Badge } from "@/components/ui/badge";
import { LISTING_TYPE_LABELS, PROPERTY_STATUS_LABELS, PROPERTY_TYPE_LABELS } from "@/lib/constants";
import { formatArea, formatBathrooms, formatPrice, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PropertyCardDTO } from "@/types/dto";

interface PropertyCardProps {
  property: PropertyCardDTO;
  signedIn: boolean;
  layout?: "grid" | "list";
  priority?: boolean;
  showStatus?: boolean;
}

export function statusBadgeVariant(status: PropertyCardDTO["status"]) {
  switch (status) {
    case "ACTIVE":
      return "success" as const;
    case "UNDER_OFFER":
    case "PENDING_REVIEW":
      return "warning" as const;
    case "RESERVED":
    case "SOLD":
    case "RENTED":
      return "secondary" as const;
    case "REJECTED":
      return "destructive" as const;
    default:
      return "muted" as const;
  }
}

export function PropertyCard({ property, signedIn, layout = "grid", priority = false, showStatus = false }: PropertyCardProps) {
  const href = `/properties/${property.slug}`;
  const location = `${property.city}, ${property.state}`;
  const isList = layout === "list";
  const notActive = property.status !== "ACTIVE";

  return (
    <article
      className={cn(
        "group relative flex overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xs transition-shadow hover:shadow-md",
        isList ? "flex-col sm:flex-row" : "flex-col",
      )}
    >
      <div className={cn("relative aspect-[4/3] overflow-hidden bg-muted", isList && "sm:aspect-auto sm:w-72 sm:shrink-0")}>
        {property.coverImage ? (
          <Image
            src={property.coverImage.url}
            alt={property.coverImage.alt ?? property.title}
            fill
            priority={priority}
            sizes={isList ? "(min-width: 640px) 288px, 100vw" : "(min-width: 1280px) 400px, (min-width: 768px) 50vw, 100vw"}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full min-h-48 items-center justify-center text-muted-foreground">
            <ImageOff className="size-8" aria-hidden="true" />
            <span className="sr-only">No photo</span>
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Badge variant={property.listingType === "SALE" ? "default" : "secondary"}>{LISTING_TYPE_LABELS[property.listingType]}</Badge>
          {property.featured ? <Badge variant="warning">Featured</Badge> : null}
          {(showStatus || notActive) && property.status !== "ACTIVE" ? (
            <Badge variant={statusBadgeVariant(property.status)}>{PROPERTY_STATUS_LABELS[property.status]}</Badge>
          ) : null}
        </div>
        {/* z-10 keeps the heart above the card's stretched link overlay */}
        <div className="absolute top-3 right-3 z-10">
          <FavoriteButton propertyId={property.id} initialFavorited={property.isFavorited} signedIn={signedIn} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-bold text-primary">{formatPrice(property.price, property.currency, property.listingType)}</p>
            <h3 className="mt-0.5 line-clamp-1 font-semibold">
              <Link href={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
                {property.title}
              </Link>
            </h3>
          </div>
          <Badge variant="outline" className="shrink-0">
            {PROPERTY_TYPE_LABELS[property.propertyType]}
          </Badge>
        </div>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{location}</span>
        </p>
        <ul className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground" aria-label="Key facts">
          {property.propertyType !== "LAND" ? (
            <>
              <li className="flex items-center gap-1.5">
                <BedDouble className="size-4" aria-hidden="true" />
                {property.bedrooms} <span className="sr-only">bedrooms</span>
                <span aria-hidden="true">bd</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Bath className="size-4" aria-hidden="true" />
                {formatBathrooms(property.bathrooms)} <span className="sr-only">bathrooms</span>
                <span aria-hidden="true">ba</span>
              </li>
            </>
          ) : null}
          {property.interiorArea ? (
            <li className="flex items-center gap-1.5">
              <Ruler className="size-4" aria-hidden="true" />
              {formatArea(property.interiorArea, property.areaUnit)}
            </li>
          ) : null}
          {property.parkingSpaces > 0 ? (
            <li className="flex items-center gap-1.5">
              <Car className="size-4" aria-hidden="true" />
              {property.parkingSpaces} <span className="sr-only">parking spaces</span>
            </li>
          ) : null}
        </ul>
        {isList ? <p className="text-xs text-muted-foreground">Listed {property.publishedAt ? formatRelative(property.publishedAt) : "recently"}</p> : null}
      </div>
    </article>
  );
}

export function PropertyCardSkeleton({ layout = "grid" }: { layout?: "grid" | "list" }) {
  return (
    <div className={cn("flex overflow-hidden rounded-xl border bg-card", layout === "list" ? "flex-col sm:flex-row" : "flex-col")} aria-hidden="true">
      <div className={cn("aspect-[4/3] animate-pulse bg-muted", layout === "list" && "sm:aspect-auto sm:h-48 sm:w-72")} />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="h-6 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        <div className="mt-auto h-4 w-3/4 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

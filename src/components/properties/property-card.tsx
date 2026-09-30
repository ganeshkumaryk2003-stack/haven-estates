import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import { FavoriteButton } from "@/components/properties/favorite-button";
import { Badge } from "@/components/ui/badge";
import { LISTING_TYPE_LABELS, PROPERTY_STATUS_LABELS, PROPERTY_TYPE_LABELS, isPlotType } from "@/lib/constants";
import { formatArea, formatBathrooms, formatPrice, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PropertyCardDTO } from "@/types/dto";

interface PropertyCardProps {
  property: PropertyCardDTO;
  signedIn: boolean;
  layout?: "grid" | "list";
  priority?: boolean;
  showStatus?: boolean;
  /** "large" spans two columns on lg screens (used for the first featured listing). */
  size?: "default" | "large";
  /** Set to false in a section that is already labelled "Featured" so every card doesn't repeat it. */
  featuredTag?: boolean;
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

// One tag at most on the photo: the status when the listing isn't active (same condition the card
// always used), otherwise "Featured".
function photoTag(property: PropertyCardDTO, showStatus: boolean, featuredTag: boolean) {
  const notActive = property.status !== "ACTIVE";
  if ((showStatus || notActive) && notActive) {
    return { label: PROPERTY_STATUS_LABELS[property.status], gold: property.status === "UNDER_OFFER" };
  }
  if (property.featured && featuredTag) return { label: "Featured", gold: false };
  return null;
}

export function PropertyCard({ property, signedIn, layout = "grid", priority = false, showStatus = false, size = "default", featuredTag = true }: PropertyCardProps) {
  const href = `/properties/${property.slug}`;
  const location = `${property.city}, ${property.state}`;
  const isList = layout === "list";
  const tag = photoTag(property, showStatus, featuredTag);
  const plot = isPlotType(property.propertyType);

  return (
    <article className={cn("group relative flex", isList ? "flex-col gap-4 sm:flex-row" : "flex-col gap-3", size === "large" && "lg:col-span-2")}>
      {/* The photo is the card: no box around it. */}
      <div className={cn("relative aspect-[4/3] overflow-hidden rounded-[14px] bg-muted", isList && "sm:w-72 sm:shrink-0", size === "large" && "lg:aspect-[8/3]")}>
        {property.coverImage ? (
          <Image
            src={property.coverImage.url}
            alt={property.coverImage.alt ?? property.title}
            fill
            priority={priority}
            sizes={isList ? "(min-width: 640px) 288px, 100vw" : size === "large" ? "(min-width: 1024px) 800px, 100vw" : "(min-width: 1280px) 400px, (min-width: 768px) 50vw, 100vw"}
            className="object-cover"
          />
        ) : (
          <div className="flex h-full min-h-48 items-center justify-center text-muted-foreground">
            <ImageOff className="size-8" aria-hidden="true" />
            <span className="sr-only">No photo</span>
          </div>
        )}
        {tag ? (
          <div className="absolute bottom-3 left-3">
            <Badge variant={tag.gold ? "warning" : "outline"} className={cn(!tag.gold && "border-transparent bg-white text-[#16233B]")}>
              {tag.label}
            </Badge>
          </div>
        ) : null}
        {/* z-10 keeps the heart above the title's stretched link overlay */}
        <div className="absolute top-3 right-3 z-10">
          <FavoriteButton propertyId={property.id} initialFavorited={property.isFavorited} signedIn={signedIn} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <p className="text-price text-2xl text-foreground">{formatPrice(property.price, property.currency, property.listingType)}</p>
        <h3 className="font-sans text-base font-semibold leading-snug tracking-normal group-hover:underline">
          <Link href={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {property.title}
          </Link>
        </h3>
        <p className="flex flex-wrap gap-x-1.5 text-sm text-muted-foreground">
          <span>{LISTING_TYPE_LABELS[property.listingType]}</span>
          <span aria-hidden="true">in</span>
          <span>{location}</span>
        </p>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground" aria-label="Key facts">
          <li>{PROPERTY_TYPE_LABELS[property.propertyType]}</li>
          {!plot ? (
            <>
              <li>
                {property.bedrooms} <span className="sr-only">bedrooms</span>
                <span aria-hidden="true">BHK</span>
              </li>
              <li>
                {formatBathrooms(property.bathrooms)} <span className="sr-only">bathrooms</span>
                <span aria-hidden="true">Bath</span>
              </li>
            </>
          ) : null}
          {plot && property.lotArea ? (
            <li>
              {formatArea(property.lotArea, property.areaUnit)} <span className="sr-only">plot area</span>
              <span aria-hidden="true">plot</span>
            </li>
          ) : null}
          {property.interiorArea ? <li>{formatArea(property.interiorArea, property.areaUnit)}</li> : null}
          {property.parkingSpaces > 0 ? (
            <li>
              {property.parkingSpaces} <span className="sr-only">parking spaces</span>
              <span aria-hidden="true">parking</span>
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
    <div className={cn("flex", layout === "list" ? "flex-col gap-4 sm:flex-row" : "flex-col gap-3")} aria-hidden="true">
      <div className={cn("aspect-[4/3] animate-pulse rounded-[14px] bg-muted", layout === "list" && "sm:aspect-auto sm:h-48 sm:w-72")} />
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-7 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

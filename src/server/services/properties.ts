import "server-only";
import { subDays } from "date-fns";
import type { Prisma, PropertyStatus } from "@/generated/prisma/client";
import { OPEN_PROPERTY_STATUSES, PAGE_SIZE, PUBLIC_PROPERTY_STATUSES } from "@/lib/constants";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { decimalToNumber } from "@/lib/money";
import { prisma, type DbClient } from "@/lib/prisma";
import { propertySlug } from "@/lib/slug";
import { assertOwnedStorageKey, storage } from "@/lib/storage";
import { audit } from "@/server/services/audit";
import { notify } from "@/server/services/notifications";
import type { PaginatedResult, PropertyCardDTO, PropertyDetailDTO } from "@/types/dto";
import type { PropertyFilters, PropertyInput } from "@/validations/property";

// Statuses shown in public search results.
const BROWSABLE_STATUSES: PropertyStatus[] = ["ACTIVE", "UNDER_OFFER", "RESERVED"];

// Anonymous viewers get a userId that can never match, which keeps the payload type stable.
const NO_VIEWER = "__anonymous__";

const cardInclude = (viewerId?: string | null) =>
  ({
    images: { orderBy: { position: "asc" as const }, take: 1, select: { url: true, alt: true } },
    favorites: { where: { userId: viewerId ?? NO_VIEWER }, select: { id: true } },
  }) satisfies Prisma.PropertyInclude;

type CardRow = Prisma.PropertyGetPayload<{ include: ReturnType<typeof cardInclude> }>;

export function toPropertyCard(row: CardRow): PropertyCardDTO {
  const cover = row.images[0];
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    listingType: row.listingType,
    propertyType: row.propertyType,
    status: row.status,
    price: decimalToNumber(row.price),
    currency: row.currency,
    address: row.address,
    city: row.city,
    state: row.state,
    country: row.country,
    latitude: row.latitude,
    longitude: row.longitude,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    parkingSpaces: row.parkingSpaces,
    interiorArea: row.interiorArea,
    lotArea: row.lotArea,
    areaUnit: row.areaUnit,
    featured: row.featured,
    coverImage: cover ? { url: cover.url, alt: cover.alt } : null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    favoriteCount: row.favoriteCount,
    viewCount: row.viewCount,
    isFavorited: row.favorites.length > 0,
    ownerId: row.ownerId,
  };
}

const detailInclude = (viewerId?: string | null) =>
  ({
    images: { orderBy: { position: "asc" as const } },
    amenities: { include: { amenity: true } },
    favorites: { where: { userId: viewerId ?? NO_VIEWER }, select: { id: true } },
    owner: {
      select: {
        id: true,
        name: true,
        image: true,
        role: true,
        createdAt: true,
        emailVerified: true,
        profile: { select: { company: true, phone: true, location: true, bio: true } },
      },
    },
    _count: { select: { enquiries: true, offers: true, favorites: true } },
  }) satisfies Prisma.PropertyInclude;

type DetailRow = Prisma.PropertyGetPayload<{ include: ReturnType<typeof detailInclude> }>;

export function toPropertyDetail(row: DetailRow): PropertyDetailDTO {
  const cover = row.images[0];
  return {
    ...toPropertyCard({ ...row, images: cover ? [{ url: cover.url, alt: cover.alt }] : [] }),
    description: row.description,
    depositAmount: decimalToNumber(row.depositAmount),
    postalCode: row.postalCode,
    yearBuilt: row.yearBuilt,
    furnished: row.furnished,
    availableFrom: row.availableFrom?.toISOString() ?? null,
    floorPlanUrl: row.floorPlanUrl,
    videoUrl: row.videoUrl,
    virtualTourUrl: row.virtualTourUrl,
    images: row.images.map((image) => ({
      id: image.id,
      url: image.url,
      storageKey: image.storageKey,
      alt: image.alt,
      width: image.width,
      height: image.height,
      position: image.position,
    })),
    amenities: row.amenities
      .map(({ amenity }) => ({ id: amenity.id, slug: amenity.slug, name: amenity.name, category: amenity.category }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    owner: {
      id: row.owner.id,
      name: row.owner.name,
      image: row.owner.image,
      role: row.owner.role,
      company: row.owner.profile?.company ?? null,
      emailVerified: Boolean(row.owner.emailVerified),
      createdAt: row.owner.createdAt.toISOString(),
      phone: row.owner.profile?.phone ?? null,
      location: row.owner.profile?.location ?? null,
      bio: row.owner.profile?.bio ?? null,
    },
    updatedAt: row.updatedAt.toISOString(),
    rejectionReason: row.rejectionReason,
    counts: { enquiries: row._count.enquiries, offers: row._count.offers, favorites: row._count.favorites },
  };
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export function buildSearchWhere(filters: PropertyFilters): Prisma.PropertyWhereInput {
  const and: Prisma.PropertyWhereInput[] = [{ status: { in: BROWSABLE_STATUSES } }];

  if (filters.q) {
    and.push({
      OR: [
        { title: { contains: filters.q, mode: "insensitive" } },
        { description: { contains: filters.q, mode: "insensitive" } },
        { city: { contains: filters.q, mode: "insensitive" } },
        { address: { contains: filters.q, mode: "insensitive" } },
      ],
    });
  }
  if (filters.location) {
    and.push({
      OR: [
        { city: { contains: filters.location, mode: "insensitive" } },
        { state: { contains: filters.location, mode: "insensitive" } },
        { postalCode: { contains: filters.location, mode: "insensitive" } },
        { country: { contains: filters.location, mode: "insensitive" } },
        { address: { contains: filters.location, mode: "insensitive" } },
      ],
    });
  }
  if (filters.listingType) and.push({ listingType: filters.listingType });
  if (filters.propertyType?.length) and.push({ propertyType: { in: filters.propertyType } });
  if (filters.minPrice !== undefined) and.push({ price: { gte: filters.minPrice } });
  if (filters.maxPrice !== undefined && filters.maxPrice > 0) and.push({ price: { lte: filters.maxPrice } });
  if (filters.bedrooms) and.push({ bedrooms: { gte: filters.bedrooms } });
  if (filters.bathrooms) and.push({ bathrooms: { gte: filters.bathrooms } });
  if (filters.minArea) and.push({ interiorArea: { gte: filters.minArea } });
  if (filters.maxArea) and.push({ interiorArea: { lte: filters.maxArea } });
  if (filters.furnished) and.push({ furnished: filters.furnished });
  if (filters.listedWithin) and.push({ publishedAt: { gte: subDays(new Date(), Number(filters.listedWithin)) } });
  for (const slug of filters.amenities ?? []) {
    and.push({ amenities: { some: { amenity: { slug } } } });
  }
  return { AND: and };
}

export function buildSearchOrder(sort: PropertyFilters["sort"]): Prisma.PropertyOrderByWithRelationInput[] {
  switch (sort) {
    case "oldest":
      return [{ publishedAt: "asc" }, { createdAt: "asc" }];
    case "price_asc":
      return [{ price: "asc" }, { publishedAt: "desc" }];
    case "price_desc":
      return [{ price: "desc" }, { publishedAt: "desc" }];
    case "popular":
      return [{ viewCount: "desc" }, { favoriteCount: "desc" }, { publishedAt: "desc" }];
    default:
      return [{ featured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }];
  }
}

export async function searchProperties(filters: PropertyFilters, viewerId?: string | null): Promise<PaginatedResult<PropertyCardDTO>> {
  const where = buildSearchWhere(filters);
  const pageSize = filters.view === "map" ? 200 : PAGE_SIZE;
  const [total, rows] = await prisma.$transaction([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      orderBy: buildSearchOrder(filters.sort),
      skip: (filters.page - 1) * pageSize,
      take: pageSize,
      include: cardInclude(viewerId),
    }),
  ]);
  return {
    items: rows.map(toPropertyCard),
    total,
    page: filters.page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getFeaturedProperties(viewerId?: string | null, take = 6) {
  const rows = await prisma.property.findMany({
    where: { status: { in: BROWSABLE_STATUSES }, featured: true },
    orderBy: [{ publishedAt: "desc" }],
    take,
    include: cardInclude(viewerId),
  });
  return rows.map(toPropertyCard);
}

export async function getRecentProperties(viewerId?: string | null, take = 8) {
  const rows = await prisma.property.findMany({
    where: { status: { in: BROWSABLE_STATUSES } },
    orderBy: [{ publishedAt: "desc" }],
    take,
    include: cardInclude(viewerId),
  });
  return rows.map(toPropertyCard);
}

export async function getSimilarProperties(property: PropertyDetailDTO, viewerId?: string | null, take = 3) {
  const rows = await prisma.property.findMany({
    where: {
      id: { not: property.id },
      status: { in: BROWSABLE_STATUSES },
      listingType: property.listingType,
      OR: [{ city: property.city }, { propertyType: property.propertyType }],
      price: { gte: property.price * 0.6, lte: property.price * 1.4 },
    },
    orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
    take,
    include: cardInclude(viewerId),
  });
  return rows.map(toPropertyCard);
}

export async function getPropertyTypeCounts() {
  const groups = await prisma.property.groupBy({
    by: ["propertyType"],
    where: { status: { in: BROWSABLE_STATUSES } },
    _count: { _all: true },
  });
  return groups.map((group) => ({ propertyType: group.propertyType, count: group._count._all }));
}

export async function getMarketplaceStats() {
  const [activeListings, sellers, reservations, cities] = await Promise.all([
    prisma.property.count({ where: { status: { in: BROWSABLE_STATUSES } } }),
    prisma.user.count({ where: { properties: { some: { status: { in: PUBLIC_PROPERTY_STATUSES } } } } }),
    prisma.reservation.count({ where: { status: { in: ["DEPOSIT_PAID", "COMPLETED"] } } }),
    prisma.property.findMany({ where: { status: { in: BROWSABLE_STATUSES } }, distinct: ["city"], select: { city: true } }),
  ]);
  return { activeListings, sellers, reservations, cities: cities.length };
}

export async function listAmenities() {
  return prisma.amenity.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
}

// ---------------------------------------------------------------------------
// Read single property with visibility rules
// ---------------------------------------------------------------------------

interface Viewer {
  id: string;
  role: string;
}

export function canViewProperty(property: { status: PropertyStatus; ownerId: string }, viewer?: Viewer | null) {
  if (PUBLIC_PROPERTY_STATUSES.includes(property.status)) return true;
  if (!viewer) return false;
  return viewer.role === "ADMIN" || viewer.id === property.ownerId;
}

export async function getPropertyBySlugOrId(slugOrId: string, viewer?: Viewer | null): Promise<PropertyDetailDTO | null> {
  const row = await prisma.property.findFirst({
    where: { OR: [{ slug: slugOrId }, { id: slugOrId }] },
    include: detailInclude(viewer?.id),
  });
  if (!row || !canViewProperty(row, viewer)) return null;
  return toPropertyDetail(row);
}

export async function getOwnedProperty(propertyId: string, actor: Viewer) {
  const row = await prisma.property.findUnique({ where: { id: propertyId }, include: detailInclude(actor.id) });
  if (!row) throw new NotFoundError("Listing not found.");
  if (row.ownerId !== actor.id && actor.role !== "ADMIN") throw new ForbiddenError("You can only manage your own listings.");
  return row;
}

// Fire-and-forget view counter. Owners and admins previewing don't inflate stats.
export async function recordPropertyView(propertyId: string, ownerId: string, viewerId?: string | null) {
  if (viewerId && viewerId === ownerId) return;
  try {
    await prisma.property.update({ where: { id: propertyId }, data: { viewCount: { increment: 1 } } });
  } catch {
    // ignore - analytics must never break a page render
  }
}

// ---------------------------------------------------------------------------
// Create / update
// ---------------------------------------------------------------------------

function toPropertyData(input: PropertyInput) {
  return {
    title: input.title,
    description: input.description,
    listingType: input.listingType,
    propertyType: input.propertyType,
    price: input.price,
    currency: input.currency,
    depositAmount: input.depositAmount,
    address: input.address,
    city: input.city,
    state: input.state,
    postalCode: input.postalCode,
    country: input.country,
    latitude: input.latitude,
    longitude: input.longitude,
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
    parkingSpaces: input.parkingSpaces,
    interiorArea: input.interiorArea,
    lotArea: input.lotArea,
    areaUnit: input.areaUnit,
    yearBuilt: input.yearBuilt,
    furnished: input.furnished,
    availableFrom: input.availableFrom ? new Date(input.availableFrom) : null,
    floorPlanUrl: input.floorPlanUrl,
    videoUrl: input.videoUrl,
    virtualTourUrl: input.virtualTourUrl,
  };
}

// New photos referenced by the form must have been uploaded by the actor (the storage key carries
// the uploader id) and must not already belong to another listing. The public URL is derived from
// the key so a client supplied URL is never persisted.
async function prepareNewImages(db: DbClient, actorId: string, images: PropertyInput["images"], propertyId?: string) {
  const prepared = [];
  const seen = new Set<string>();
  for (const image of images) {
    if (seen.has(image.storageKey)) continue;
    seen.add(image.storageKey);
    assertOwnedStorageKey(image.storageKey, "properties", actorId);
    const usedElsewhere = await db.propertyImage.findFirst({
      where: { storageKey: image.storageKey, ...(propertyId ? { propertyId: { not: propertyId } } : {}) },
      select: { id: true },
    });
    if (usedElsewhere) throw new ConflictError("One of the photos is already attached to another listing. Please upload it again.");
    prepared.push({
      storageKey: image.storageKey,
      url: storage.urlFor(image.storageKey),
      alt: image.alt ?? null,
      width: image.width ?? null,
      height: image.height ?? null,
    });
  }
  return prepared;
}

async function validateAmenityIds(db: DbClient, ids: string[]) {
  if (ids.length === 0) return [];
  const found = await db.amenity.findMany({ where: { id: { in: ids } }, select: { id: true } });
  return found.map((amenity) => amenity.id);
}

export async function createProperty(actor: Viewer, input: PropertyInput, intent: "draft" | "publish") {
  const status: PropertyStatus = intent === "publish" ? (actor.role === "ADMIN" ? "ACTIVE" : "PENDING_REVIEW") : "DRAFT";
  if (intent === "publish" && input.images.length === 0) {
    throw new ConflictError("Add at least one photo before publishing.");
  }

  const property = await prisma.$transaction(async (tx) => {
    const amenityIds = await validateAmenityIds(tx, input.amenityIds);
    const images = await prepareNewImages(tx, actor.id, input.images);
    const created = await tx.property.create({
      data: {
        ...toPropertyData(input),
        slug: propertySlug(input.title, input.city),
        status,
        publishedAt: status === "ACTIVE" ? new Date() : null,
        ownerId: actor.id,
        images: {
          create: images.map((image, index) => ({ ...image, position: index })),
        },
        amenities: { create: amenityIds.map((amenityId) => ({ amenityId })) },
      },
    });
    await audit({ actorId: actor.id, action: "property.created", targetType: "Property", targetId: created.id, metadata: { status } }, tx);
    return created;
  });
  return property;
}

export async function updateProperty(propertyId: string, actor: Viewer, input: PropertyInput, intent: "save" | "publish") {
  const existing = await getOwnedProperty(propertyId, actor);
  if (["RESERVED", "SOLD", "RENTED"].includes(existing.status)) {
    throw new ConflictError("Reserved, sold or rented listings can no longer be edited.");
  }
  if (intent === "publish" && input.images.length === 0) {
    throw new ConflictError("Add at least one photo before publishing.");
  }

  let nextStatus: PropertyStatus = existing.status;
  if (intent === "publish" && ["DRAFT", "REJECTED", "ARCHIVED"].includes(existing.status)) {
    nextStatus = actor.role === "ADMIN" ? "ACTIVE" : "PENDING_REVIEW";
  }

  const keepImageKeys = new Set(input.images.map((image) => image.storageKey));
  const removedImages = existing.images.filter((image) => !keepImageKeys.has(image.storageKey));

  const existingByKey = new Map(existing.images.map((image) => [image.storageKey, image]));

  await prisma.$transaction(async (tx) => {
    const amenityIds = await validateAmenityIds(tx, input.amenityIds);
    const newImages = await prepareNewImages(
      tx,
      actor.id,
      input.images.filter((image) => !existingByKey.has(image.storageKey)),
      propertyId,
    );
    const newByKey = new Map(newImages.map((image) => [image.storageKey, image]));
    if (removedImages.length > 0) {
      await tx.propertyImage.deleteMany({ where: { id: { in: removedImages.map((image) => image.id) } } });
    }
    for (const [index, image] of input.images.entries()) {
      const current = existingByKey.get(image.storageKey);
      if (current) {
        await tx.propertyImage.update({ where: { id: current.id }, data: { position: index, alt: image.alt ?? null } });
        continue;
      }
      const prepared = newByKey.get(image.storageKey);
      if (prepared) await tx.propertyImage.create({ data: { propertyId, ...prepared, position: index } });
    }
    await tx.propertyAmenity.deleteMany({ where: { propertyId } });
    await tx.property.update({
      where: { id: propertyId },
      data: {
        ...toPropertyData(input),
        status: nextStatus,
        publishedAt: nextStatus === "ACTIVE" && !existing.publishedAt ? new Date() : existing.publishedAt,
        rejectionReason: nextStatus === "PENDING_REVIEW" ? null : existing.rejectionReason,
        amenities: { create: amenityIds.map((amenityId) => ({ amenityId })) },
      },
    });
    await audit(
      { actorId: actor.id, action: "property.updated", targetType: "Property", targetId: propertyId, metadata: { status: nextStatus } },
      tx,
    );
  });

  // Remove orphaned files after the database commit succeeded.
  await Promise.allSettled(removedImages.map((image) => storage.delete(image.storageKey)));
  return prisma.property.findUniqueOrThrow({ where: { id: propertyId } });
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

export type OwnerStatusAction = "publish" | "unpublish" | "archive" | "mark_sold" | "mark_rented" | "delete" | "restore";

const TRANSITIONS: Record<OwnerStatusAction, { from: PropertyStatus[]; to: PropertyStatus | null }> = {
  publish: { from: ["DRAFT", "REJECTED", "ARCHIVED"], to: "PENDING_REVIEW" },
  unpublish: { from: ["ACTIVE", "PENDING_REVIEW"], to: "DRAFT" },
  archive: { from: ["DRAFT", "PENDING_REVIEW", "ACTIVE", "REJECTED", "SOLD", "RENTED"], to: "ARCHIVED" },
  restore: { from: ["ARCHIVED"], to: "DRAFT" },
  mark_sold: { from: ["ACTIVE", "UNDER_OFFER", "RESERVED"], to: "SOLD" },
  mark_rented: { from: ["ACTIVE", "UNDER_OFFER", "RESERVED"], to: "RENTED" },
  delete: { from: ["DRAFT", "REJECTED", "ARCHIVED"], to: null },
};

export async function changePropertyStatus(propertyId: string, actor: Viewer, action: OwnerStatusAction) {
  const property = await getOwnedProperty(propertyId, actor);
  const rule = TRANSITIONS[action];
  if (!rule.from.includes(property.status)) {
    throw new ConflictError(`This listing cannot be ${action.replace("_", " ")}ed while it is ${property.status.toLowerCase().replace("_", " ")}.`);
  }
  if (action === "publish" && property.images.length === 0) throw new ConflictError("Add at least one photo before publishing.");
  if (action === "mark_sold" && property.listingType !== "SALE") throw new ConflictError("Rental listings are marked as rented, not sold.");
  if (action === "mark_rented" && property.listingType !== "RENT") throw new ConflictError("Sale listings are marked as sold, not rented.");

  if (action === "delete") {
    const paid = await prisma.reservation.count({ where: { propertyId, status: { in: ["DEPOSIT_PAID", "COMPLETED"] } } });
    if (paid > 0) throw new ConflictError("Listings with paid reservations cannot be deleted. Archive it instead.");
    await prisma.property.delete({ where: { id: propertyId } });
    await Promise.allSettled(property.images.map((image) => storage.delete(image.storageKey)));
    await audit({ actorId: actor.id, action: "property.deleted", targetType: "Property", targetId: propertyId, metadata: { title: property.title } });
    return { status: null };
  }

  let to = rule.to!;
  if (action === "publish" && actor.role === "ADMIN") to = "ACTIVE";

  await prisma.$transaction(async (tx) => {
    await tx.property.update({
      where: { id: propertyId },
      data: {
        status: to,
        publishedAt: to === "ACTIVE" && !property.publishedAt ? new Date() : undefined,
        soldAt: to === "SOLD" || to === "RENTED" ? new Date() : undefined,
        rejectionReason: to === "PENDING_REVIEW" ? null : undefined,
      },
    });

    // Closing a listing expires every open offer and tells the buyers.
    if (to === "SOLD" || to === "RENTED" || to === "ARCHIVED" || to === "DRAFT") {
      const openOffers = await tx.offer.findMany({
        where: { propertyId, status: { in: ["PENDING", "COUNTERED"] } },
        select: { id: true, buyerId: true },
      });
      if (openOffers.length > 0) {
        await tx.offer.updateMany({ where: { id: { in: openOffers.map((o) => o.id) } }, data: { status: "EXPIRED", respondedAt: new Date() } });
        for (const offer of openOffers) {
          await notify(
            {
              userId: offer.buyerId,
              type: "OFFER_EXPIRED",
              title: "Offer closed",
              body: `Your offer on "${property.title}" is no longer active because the listing was ${to.toLowerCase()}.`,
              href: `/dashboard/offers`,
              emailPreference: "emailOnOffer",
            },
            tx,
          );
        }
      }
    }
    await audit(
      { actorId: actor.id, action: "property.status_changed", targetType: "Property", targetId: propertyId, metadata: { from: property.status, to, action } },
      tx,
    );
  });
  return { status: to };
}

// ---------------------------------------------------------------------------
// Owner dashboard
// ---------------------------------------------------------------------------

export async function listOwnerProperties(ownerId: string, options: { status?: PropertyStatus; q?: string } = {}) {
  const rows = await prisma.property.findMany({
    where: {
      ownerId,
      ...(options.status ? { status: options.status } : {}),
      ...(options.q ? { OR: [{ title: { contains: options.q, mode: "insensitive" } }, { city: { contains: options.q, mode: "insensitive" } }] } : {}),
    },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      ...cardInclude(ownerId),
      _count: { select: { enquiries: true, offers: { where: { status: { in: ["PENDING", "COUNTERED"] } } }, favorites: true } },
    },
  });
  return rows.map((row) => ({
    ...toPropertyCard(row),
    counts: { enquiries: row._count.enquiries, openOffers: row._count.offers, favorites: row._count.favorites },
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export type OwnerPropertyDTO = Awaited<ReturnType<typeof listOwnerProperties>>[number];

export async function getOwnerListingStats(ownerId: string) {
  const [statusGroups, views, favorites, enquiries, openOffers] = await Promise.all([
    prisma.property.groupBy({ by: ["status"], where: { ownerId }, _count: { _all: true } }),
    prisma.property.aggregate({ where: { ownerId }, _sum: { viewCount: true } }),
    prisma.favorite.count({ where: { property: { ownerId } } }),
    prisma.enquiry.count({ where: { recipientId: ownerId, status: "NEW" } }),
    prisma.offer.count({ where: { sellerId: ownerId, status: { in: ["PENDING", "COUNTERED"] } } }),
  ]);
  const byStatus = Object.fromEntries(statusGroups.map((group) => [group.status, group._count._all])) as Partial<Record<PropertyStatus, number>>;
  return {
    total: statusGroups.reduce((sum, group) => sum + group._count._all, 0),
    active: (byStatus.ACTIVE ?? 0) + (byStatus.UNDER_OFFER ?? 0) + (byStatus.RESERVED ?? 0),
    drafts: byStatus.DRAFT ?? 0,
    pending: byStatus.PENDING_REVIEW ?? 0,
    views: views._sum.viewCount ?? 0,
    favorites,
    newEnquiries: enquiries,
    openOffers,
  };
}

export function isOpenForEngagement(status: PropertyStatus) {
  return OPEN_PROPERTY_STATUSES.includes(status);
}

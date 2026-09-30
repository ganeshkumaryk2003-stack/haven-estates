import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ForbiddenError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { buildStorageKey } from "@/lib/storage";
import { canViewProperty, changePropertyStatus, createProperty, searchProperties, updateProperty } from "@/server/services/properties";
import { propertyFiltersSchema, propertySchema } from "@/validations/property";
import { createRun } from "../../helpers/factories";

const run = createRun();
let owner: Awaited<ReturnType<typeof run.user>>;
let stranger: Awaited<ReturnType<typeof run.user>>;
let cheap: Awaited<ReturnType<typeof run.property>>;
let pricey: Awaited<ReturnType<typeof run.property>>;

beforeAll(async () => {
  owner = await run.user({ role: "SELLER" });
  stranger = await run.user();
  cheap = await run.property(owner.id, { price: 200_000, city: `Cheapville-${run.runId}`, bedrooms: 1, title: `Cheap ${run.runId}` });
  pricey = await run.property(owner.id, { price: 900_000, city: `Richtown-${run.runId}`, bedrooms: 4, title: `Pricey ${run.runId}` });
  await run.property(owner.id, { status: "DRAFT", city: `Cheapville-${run.runId}`, title: `Draft ${run.runId}` });
});

afterAll(() => run.cleanup());

describe("property search", () => {
  it("filters by price, bedrooms and location using real database queries", async () => {
    const byPrice = await searchProperties(propertyFiltersSchema.parse({ maxPrice: 300_000, location: run.runId }));
    expect(byPrice.items.map((item) => item.id)).toEqual([cheap.id]);

    const byBedrooms = await searchProperties(propertyFiltersSchema.parse({ bedrooms: 4, location: run.runId }));
    expect(byBedrooms.items.map((item) => item.id)).toEqual([pricey.id]);

    const byCity = await searchProperties(propertyFiltersSchema.parse({ location: `Richtown-${run.runId}` }));
    expect(byCity.total).toBe(1);
  });

  it("never returns drafts and sorts by price", async () => {
    const results = await searchProperties(propertyFiltersSchema.parse({ location: run.runId, sort: "price_desc" }));
    expect(results.items.map((item) => item.id)).toEqual([pricey.id, cheap.id]);
    expect(results.items.every((item) => item.status === "ACTIVE")).toBe(true);
  });

  it("flags favorites for the viewer only", async () => {
    await prisma.favorite.create({ data: { userId: stranger.id, propertyId: cheap.id } });
    const forStranger = await searchProperties(propertyFiltersSchema.parse({ location: `Cheapville-${run.runId}` }), stranger.id);
    const anonymous = await searchProperties(propertyFiltersSchema.parse({ location: `Cheapville-${run.runId}` }));
    expect(forStranger.items[0]?.isFavorited).toBe(true);
    expect(anonymous.items[0]?.isFavorited).toBe(false);
  });
});

describe("ownership and visibility rules", () => {
  it("only the owner or an admin can see non-public listings", () => {
    const draft = { status: "DRAFT" as const, ownerId: owner.id };
    expect(canViewProperty(draft, null)).toBe(false);
    expect(canViewProperty(draft, { id: stranger.id, role: "BUYER" })).toBe(false);
    expect(canViewProperty(draft, { id: owner.id, role: "SELLER" })).toBe(true);
    expect(canViewProperty(draft, { id: stranger.id, role: "ADMIN" })).toBe(true);
    expect(canViewProperty({ status: "ACTIVE", ownerId: owner.id }, null)).toBe(true);
  });

  it("rejects edits and status changes from non-owners", async () => {
    const input = propertySchema.parse({
      title: "Edited by a stranger, should fail",
      description: "This description is long enough to pass validation but the update must still be rejected.",
      listingType: "SALE",
      propertyType: "HOUSE",
      price: 1000,
      depositAmount: 50,
      address: "1 Nowhere Lane",
      city: "Nowhere",
      state: "Test State",
      postalCode: "560001",
      country: "India",
      latitude: "",
      longitude: "",
      bedrooms: 1,
      bathrooms: 1,
      parkingSpaces: 0,
      images: [],
    });
    await expect(updateProperty(cheap.id, { id: stranger.id, role: "BUYER" }, input, "save")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(changePropertyStatus(cheap.id, { id: stranger.id, role: "BUYER" }, "archive")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("refuses photos that were uploaded by somebody else and derives URLs server-side", async () => {
    const base = propertySchema.parse({
      title: "Photo ownership check listing",
      description: "This listing exists to make sure storage keys are verified against the uploader before being saved.",
      listingType: "SALE",
      propertyType: "HOUSE",
      price: 250000,
      depositAmount: 2500,
      address: "2 Ownership Road",
      city: `Ownerville-${run.runId}`,
      state: "Test State",
      postalCode: "560002",
      country: "India",
      latitude: "",
      longitude: "",
      bedrooms: 2,
      bathrooms: 1,
      parkingSpaces: 0,
      images: [],
    });
    const foreignKey = buildStorageKey("properties", stranger.id, "image/webp");
    const forged = { ...base, images: [{ url: "https://evil.example/steal.webp", storageKey: foreignKey }] };
    await expect(createProperty({ id: owner.id, role: "SELLER" }, forged, "draft")).rejects.toBeInstanceOf(ForbiddenError);

    const ownKey = buildStorageKey("properties", owner.id, "image/webp");
    const created = await createProperty({ id: owner.id, role: "SELLER" }, { ...base, images: [{ url: "https://evil.example/ignored.webp", storageKey: ownKey }] }, "draft");
    const image = await prisma.propertyImage.findFirstOrThrow({ where: { propertyId: created.id } });
    expect(image.storageKey).toBe(ownKey);
    expect(image.url).toBe(`/api/files/${ownKey}`);

    // The same photo cannot be attached to a second listing.
    await expect(createProperty({ id: owner.id, role: "SELLER" }, { ...base, images: [{ url: "", storageKey: ownKey }] }, "draft")).rejects.toThrow(/already attached/);
  });

  it("lets the owner archive and restore a listing following the allowed transitions", async () => {
    const archived = await changePropertyStatus(pricey.id, { id: owner.id, role: "SELLER" }, "archive");
    expect(archived.status).toBe("ARCHIVED");
    await expect(changePropertyStatus(pricey.id, { id: owner.id, role: "SELLER" }, "mark_sold")).rejects.toThrow();
    const restored = await changePropertyStatus(pricey.id, { id: owner.id, role: "SELLER" }, "restore");
    expect(restored.status).toBe("DRAFT");
    const published = await changePropertyStatus(pricey.id, { id: owner.id, role: "SELLER" }, "publish");
    expect(published.status).toBe("PENDING_REVIEW");
  });
});

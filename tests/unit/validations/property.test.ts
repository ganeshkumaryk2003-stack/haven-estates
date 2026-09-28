import { describe, expect, it } from "vitest";
import { propertyFiltersSchema, propertySchema } from "@/validations/property";

const validProperty = {
  title: "Sunlit 3-bed craftsman",
  description: "A lovely home with a garden, a renovated kitchen and plenty of natural light throughout.",
  listingType: "SALE",
  propertyType: "HOUSE",
  price: "749000",
  currency: "USD",
  depositAmount: "7500",
  address: "4112 Avenue F",
  city: "Austin",
  state: "TX",
  postalCode: "78751",
  country: "United States",
  latitude: "30.31",
  longitude: "-97.72",
  bedrooms: "3",
  bathrooms: "2.5",
  parkingSpaces: "1",
  interiorArea: "1880",
  lotArea: "",
  areaUnit: "SQFT",
  yearBuilt: "1928",
  furnished: "UNFURNISHED",
  availableFrom: "",
  amenityIds: [],
  images: [{ url: "/api/files/x.webp", storageKey: "x.webp" }],
  floorPlanUrl: "",
  videoUrl: "",
  virtualTourUrl: "",
};

describe("property validation", () => {
  it("coerces numeric strings from the form and accepts a valid listing", () => {
    const result = propertySchema.safeParse(validProperty);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price).toBe(749000);
      expect(result.data.bathrooms).toBe(2.5);
      expect(result.data.lotArea).toBeNull();
      expect(result.data.latitude).toBeCloseTo(30.31);
      expect(result.data.floorPlanUrl).toBeNull();
    }
  });

  it("rejects a deposit larger than the price", () => {
    const result = propertySchema.safeParse({ ...validProperty, depositAmount: "800000" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.path.includes("depositAmount"))).toBe(true);
  });

  it("requires latitude and longitude together", () => {
    const result = propertySchema.safeParse({ ...validProperty, longitude: "" });
    expect(result.success).toBe(false);
  });

  it("rejects short titles, short descriptions and half-bath fractions other than .5", () => {
    expect(propertySchema.safeParse({ ...validProperty, title: "Tiny" }).success).toBe(false);
    expect(propertySchema.safeParse({ ...validProperty, description: "Too short" }).success).toBe(false);
    expect(propertySchema.safeParse({ ...validProperty, bathrooms: "2.3" }).success).toBe(false);
  });

  it("requires URLs to be absolute http(s) links", () => {
    expect(propertySchema.safeParse({ ...validProperty, videoUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(propertySchema.safeParse({ ...validProperty, videoUrl: "https://example.com/tour" }).success).toBe(true);
  });

  it("re-validates its own output (server re-parses resolver output)", () => {
    const first = propertySchema.parse(validProperty);
    const second = propertySchema.safeParse(first);
    expect(second.success).toBe(true);
  });

  it("applies defaults to search filters and rejects unknown sort values", () => {
    const defaults = propertyFiltersSchema.parse({});
    expect(defaults.sort).toBe("newest");
    expect(defaults.page).toBe(1);
    expect(defaults.view).toBe("grid");
    expect(propertyFiltersSchema.safeParse({ sort: "random" }).success).toBe(false);
  });
});

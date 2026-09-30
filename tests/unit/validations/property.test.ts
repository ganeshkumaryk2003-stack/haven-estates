import { describe, expect, it } from "vitest";
import { propertyFiltersSchema, propertySchema } from "@/validations/property";

const validProperty = {
  title: "Sunlit 3 BHK independent house in JP Nagar",
  description: "A lovely home with a garden, a modular kitchen and plenty of natural light throughout.",
  listingType: "SALE",
  propertyType: "HOUSE",
  price: "18500000",
  currency: "INR",
  depositAmount: "100000",
  address: "No. 412, 24th Main, JP Nagar 7th Phase",
  city: "Bengaluru",
  state: "Karnataka",
  postalCode: "560078",
  country: "India",
  latitude: "12.9063",
  longitude: "77.5857",
  bedrooms: "3",
  bathrooms: "2.5",
  parkingSpaces: "1",
  interiorArea: "2100",
  lotArea: "",
  areaUnit: "SQFT",
  yearBuilt: "1998",
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
      expect(result.data.price).toBe(18500000);
      expect(result.data.bathrooms).toBe(2.5);
      expect(result.data.lotArea).toBeNull();
      expect(result.data.latitude).toBeCloseTo(12.9063);
      expect(result.data.floorPlanUrl).toBeNull();
    }
  });

  it("rejects a deposit larger than the price", () => {
    const result = propertySchema.safeParse({ ...validProperty, depositAmount: "20000000" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.path.includes("depositAmount"))).toBe(true);
  });

  it("requires a six-digit Indian PIN code", () => {
    expect(propertySchema.safeParse({ ...validProperty, postalCode: "78751" }).success).toBe(false);
    expect(propertySchema.safeParse({ ...validProperty, postalCode: "056007" }).success).toBe(false);
    expect(propertySchema.safeParse({ ...validProperty, postalCode: "400013" }).success).toBe(true);
  });

  it("accepts the Indian plot categories and rejects the retired ones", () => {
    expect(propertySchema.safeParse({ ...validProperty, propertyType: "PLOT_INDUSTRIAL", bedrooms: "0", bathrooms: "0" }).success).toBe(true);
    expect(propertySchema.safeParse({ ...validProperty, propertyType: "CONDO" }).success).toBe(false);
    expect(propertySchema.safeParse({ ...validProperty, propertyType: "LAND" }).success).toBe(false);
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

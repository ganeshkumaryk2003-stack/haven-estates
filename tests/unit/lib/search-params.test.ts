import { describe, expect, it } from "vitest";
import { countActiveFilters, parsePropertyFilters, propertiesHref } from "@/lib/search-params";
import { toMinorUnits, suggestedDeposit } from "@/lib/money";
import { slugify } from "@/lib/slug";

describe("search params", () => {
  it("parses comma separated arrays and numeric strings", () => {
    const filters = parsePropertyFilters({ propertyType: "HOUSE,CONDO", minPrice: "100000", bedrooms: "3", amenities: ["garden", "garage"] });
    expect(filters.propertyType).toEqual(["HOUSE", "CONDO"]);
    expect(filters.minPrice).toBe(100000);
    expect(filters.bedrooms).toBe(3);
    expect(filters.amenities).toEqual(["garden", "garage"]);
  });

  it("drops invalid values instead of failing", () => {
    const filters = parsePropertyFilters({ sort: "bogus", listingType: "SALE", page: "abc" });
    expect(filters.listingType).toBe("SALE");
    expect(filters.sort).toBe("newest");
    expect(filters.page).toBe(1);
  });

  it("builds shareable URLs and resets the page when filters change", () => {
    const filters = parsePropertyFilters({ listingType: "RENT", page: "3" });
    expect(propertiesHref(filters, { page: 2 })).toBe("/properties?listingType=RENT&page=2");
    expect(propertiesHref(filters, { minPrice: 1000 })).toBe("/properties?listingType=RENT&minPrice=1000");
    expect(propertiesHref({})).toBe("/properties");
  });

  it("counts active filters excluding sort/page/view", () => {
    expect(countActiveFilters(parsePropertyFilters({ sort: "oldest", view: "list" }))).toBe(0);
    expect(countActiveFilters(parsePropertyFilters({ q: "garden", bedrooms: "2" }))).toBe(2);
  });
});

describe("money helpers", () => {
  it("converts decimal strings to Stripe minor units without floating point drift", () => {
    expect(toMinorUnits("1250.50", "INR")).toBe(125050);
    expect(toMinorUnits(19.99, "EUR")).toBe(1999);
    expect(toMinorUnits("5000", "JPY")).toBe(5000);
    expect(toMinorUnits("0.1", "INR")).toBe(10);
  });

  it("suggests a clamped 1% deposit for sales and one month for rentals", () => {
    expect(suggestedDeposit(750_000, "SALE")).toBe(7_500);
    expect(suggestedDeposit(20_000, "SALE")).toBe(500);
    expect(suggestedDeposit(9_000_000, "SALE")).toBe(25_000);
    expect(suggestedDeposit(2_450, "RENT")).toBe(2_450);
  });
});

describe("slugify", () => {
  it("produces URL safe slugs", () => {
    expect(slugify("Sunlit 3-bed Craftsman  (Austin!)")).toBe("sunlit-3-bed-craftsman-austin");
    expect(slugify("Café Élan")).toBe("cafe-elan");
  });
});

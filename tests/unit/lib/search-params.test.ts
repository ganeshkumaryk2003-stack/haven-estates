import { describe, expect, it } from "vitest";
import { countActiveFilters, parsePropertyFilters, propertiesHref } from "@/lib/search-params";
import { toMinorUnits, suggestedDeposit } from "@/lib/money";
import { slugify } from "@/lib/slug";

describe("search params", () => {
  it("parses comma separated arrays and numeric strings", () => {
    const filters = parsePropertyFilters({ propertyType: "HOUSE,PLOT_RESIDENTIAL", minPrice: "100000", bedrooms: "3", amenities: ["garden", "car-parking"] });
    expect(filters.propertyType).toEqual(["HOUSE", "PLOT_RESIDENTIAL"]);
    expect(filters.minPrice).toBe(100000);
    expect(filters.bedrooms).toBe(3);
    expect(filters.amenities).toEqual(["garden", "car-parking"]);
  });

  it("ignores retired property types in shared links", () => {
    expect(parsePropertyFilters({ propertyType: "CONDO" }).propertyType).toBeUndefined();
    expect(parsePropertyFilters({ propertyType: "LAND" }).propertyType).toBeUndefined();
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

  it("suggests a clamped 1% token deposit for sales and one month's rent for rentals", () => {
    expect(suggestedDeposit(7_500_000, "SALE")).toBe(75_000);
    expect(suggestedDeposit(200_000, "SALE")).toBe(5_000);
    expect(suggestedDeposit(90_000_000, "SALE")).toBe(200_000);
    expect(suggestedDeposit(24_500, "RENT")).toBe(24_500);
  });
});

describe("slugify", () => {
  it("produces URL safe slugs", () => {
    expect(slugify("Sunlit 3 BHK Villa  (Bengaluru!)")).toBe("sunlit-3-bhk-villa-bengaluru");
    expect(slugify("Café Élan")).toBe("cafe-elan");
  });
});

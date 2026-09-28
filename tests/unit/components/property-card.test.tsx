// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PropertyCard } from "@/components/properties/property-card";
import type { PropertyCardDTO } from "@/types/dto";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/properties",
}));
vi.mock("@/server/actions/properties", () => ({ toggleFavoriteAction: vi.fn() }));

const property: PropertyCardDTO = {
  id: "prop_1",
  slug: "sunlit-craftsman-austin-abc123",
  title: "Sunlit 3-bed craftsman with a private garden",
  listingType: "SALE",
  propertyType: "HOUSE",
  status: "ACTIVE",
  price: 749000,
  currency: "USD",
  address: "4112 Avenue F",
  city: "Austin",
  state: "TX",
  country: "United States",
  latitude: null,
  longitude: null,
  bedrooms: 3,
  bathrooms: 2.5,
  parkingSpaces: 1,
  interiorArea: 1880,
  areaUnit: "SQFT",
  featured: true,
  coverImage: { url: "/api/files/test.webp", alt: "Front of the house" },
  publishedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  favoriteCount: 4,
  viewCount: 120,
  isFavorited: false,
  ownerId: "user_1",
};

describe("PropertyCard", () => {
  it("renders the key facts and links to the listing", () => {
    render(<PropertyCard property={property} signedIn={false} />);
    expect(screen.getByRole("heading", { name: property.title })).toBeInTheDocument();
    expect(screen.getByText("$749,000")).toBeInTheDocument();
    expect(screen.getByText("Austin, TX")).toBeInTheDocument();
    expect(screen.getByText("Featured")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: property.title })).toHaveAttribute("href", `/properties/${property.slug}`);
    expect(screen.getByRole("img", { name: "Front of the house" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save to favorites" })).toHaveAttribute("aria-pressed", "false");
  });

  it("shows monthly pricing for rentals and the status badge when requested", () => {
    render(<PropertyCard property={{ ...property, listingType: "RENT", price: 3450, status: "RESERVED" }} signedIn showStatus />);
    expect(screen.getByText("$3,450/mo")).toBeInTheDocument();
    expect(screen.getByText("Reserved")).toBeInTheDocument();
  });
});

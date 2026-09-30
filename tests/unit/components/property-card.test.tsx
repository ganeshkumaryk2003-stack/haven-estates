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
  slug: "sunlit-3-bhk-jp-nagar-abc123",
  title: "Sunlit 3 BHK independent house with a private garden in JP Nagar",
  listingType: "SALE",
  propertyType: "HOUSE",
  status: "ACTIVE",
  price: 18500000,
  currency: "INR",
  address: "No. 412, 24th Main, JP Nagar 7th Phase",
  city: "Bengaluru",
  state: "Karnataka",
  country: "India",
  latitude: null,
  longitude: null,
  bedrooms: 3,
  bathrooms: 2.5,
  parkingSpaces: 1,
  interiorArea: 2100,
  lotArea: 2400,
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
    expect(screen.getByText("₹1,85,00,000")).toBeInTheDocument();
    expect(screen.getByText("Bengaluru, Karnataka")).toBeInTheDocument();
    expect(screen.getByText("BHK")).toBeInTheDocument();
    expect(screen.getByText("Featured")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: property.title })).toHaveAttribute("href", `/properties/${property.slug}`);
    expect(screen.getByRole("img", { name: "Front of the house" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save to favorites" })).toHaveAttribute("aria-pressed", "false");
  });

  it("shows monthly pricing for rentals and the status badge when requested", () => {
    render(<PropertyCard property={{ ...property, listingType: "RENT", price: 34500, status: "RESERVED" }} signedIn showStatus />);
    expect(screen.getByText("₹34,500/month")).toBeInTheDocument();
    expect(screen.getByText("Reserved")).toBeInTheDocument();
  });

  it("shows the plot area instead of BHK for plots", () => {
    render(<PropertyCard property={{ ...property, propertyType: "PLOT_INDUSTRIAL", bedrooms: 0, bathrooms: 0, interiorArea: null, lotArea: 130680 }} signedIn={false} />);
    expect(screen.queryByText("BHK")).not.toBeInTheDocument();
    expect(screen.getByText("plot")).toBeInTheDocument();
    expect(screen.getByText(/1,30,680 sq ft/)).toBeInTheDocument();
  });
});

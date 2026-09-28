"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROPERTY_TYPES, PROPERTY_TYPE_LABELS } from "@/lib/constants";
import { propertiesHref } from "@/lib/search-params";
import type { PropertyFilters } from "@/validations/property";

export function HeroSearch() {
  const router = useRouter();
  const [listingType, setListingType] = React.useState<"SALE" | "RENT">("SALE");
  const [location, setLocation] = React.useState("");
  const [propertyType, setPropertyType] = React.useState<string>("any");
  const [maxPrice, setMaxPrice] = React.useState<string>("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    router.push(
      propertiesHref({
        listingType,
        location: location.trim() || undefined,
        propertyType: propertyType === "any" ? undefined : ([propertyType] as PropertyFilters["propertyType"]),
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
      }),
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl border bg-background/95 p-3 shadow-xl backdrop-blur sm:p-4" aria-label="Search properties">
      <div className="flex gap-1 rounded-lg bg-muted p-1 sm:w-fit" role="group" aria-label="Listing type">
        {(["SALE", "RENT"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setListingType(type)}
            aria-pressed={listingType === type}
            className={`flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-colors sm:flex-none ${listingType === type ? "bg-background shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
          >
            {type === "SALE" ? "Buy" : "Rent"}
          </button>
        ))}
      </div>
      <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_auto]">
        <div className="flex flex-col gap-1">
          <Label htmlFor="hero-location" className="sr-only">
            Location
          </Label>
          <Input id="hero-location" placeholder="City, neighbourhood or postal code" value={location} onChange={(event) => setLocation(event.target.value)} className="h-11" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="hero-type" className="sr-only">
            Property type
          </Label>
          <Select value={propertyType} onValueChange={setPropertyType}>
            <SelectTrigger id="hero-type" className="h-11">
              <SelectValue placeholder="Any type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any type</SelectItem>
              {PROPERTY_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {PROPERTY_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="hero-price" className="sr-only">
            Maximum price
          </Label>
          <Input id="hero-price" type="number" min={0} inputMode="numeric" placeholder={listingType === "RENT" ? "Max monthly rent" : "Max price"} value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} className="h-11" />
        </div>
        <Button type="submit" size="lg" className="h-11">
          <Search /> Search
        </Button>
      </div>
    </form>
  );
}

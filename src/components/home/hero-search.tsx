"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { APP_SHORT_NAME, PROPERTY_TYPES, PROPERTY_TYPE_LABELS } from "@/lib/constants";
import { propertiesHref } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import type { PropertyFilters } from "@/validations/property";

// Buy and Rent search the marketplace. Sell is a shortcut into the listing flow rather than a
// search filter, so it never becomes a listingType query param.
const MODES = [
  { value: "SALE", label: "Buy" },
  { value: "RENT", label: "Rent" },
  { value: "SELL", label: "Sell" },
] as const;
type HeroMode = (typeof MODES)[number]["value"];

export function HeroSearch({ signedIn = false }: { signedIn?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = React.useState<HeroMode>("SALE");
  const [location, setLocation] = React.useState("");
  const [propertyType, setPropertyType] = React.useState<string>("any");
  const [maxPrice, setMaxPrice] = React.useState<string>("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (mode === "SELL") return;
    router.push(
      propertiesHref({
        listingType: mode,
        location: location.trim() || undefined,
        propertyType: propertyType === "any" ? undefined : ([propertyType] as PropertyFilters["propertyType"]),
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
      }),
    );
  }

  return (
    <form
      onSubmit={submit}
      className="scheme-light flex w-full max-w-[960px] flex-col gap-3 rounded-[20px] bg-card p-3 text-card-foreground shadow-[0_28px_60px_-24px_rgba(10,19,48,0.6)] sm:p-4"
      aria-label={mode === "SELL" ? "List a property" : "Search properties"}
    >
      <div className="flex gap-1 rounded-lg bg-muted p-1 sm:w-fit" role="group" aria-label="I want to">
        {MODES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setMode(option.value)}
            aria-pressed={mode === option.value}
            className={cn(
              "flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-colors sm:flex-none",
              mode === option.value ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      {mode === "SELL" ? (
        <div className="flex flex-col gap-4 rounded-xl border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">List your property on {APP_SHORT_NAME}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Post a flat, house or plot in minutes, receive enquiries and offers in one dashboard, and let buyers reserve with a token deposit.
              {signedIn ? "" : " You will be asked to sign in or create a free account first."}
            </p>
          </div>
          <Button asChild size="lg" variant="gold" className="h-11 shrink-0">
            <Link href="/properties/new">List a property</Link>
          </Button>
        </div>
      ) : (
        // Fields sit side by side separated by hairlines rather than each in its own box.
        <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_auto] md:gap-0 md:divide-x md:divide-border">
          <div className="flex flex-col gap-1 md:pr-3">
            <Label htmlFor="hero-location" className="sr-only">
              Location
            </Label>
            <Input id="hero-location" placeholder="City, locality or PIN code, e.g. Whitefield, Bengaluru" value={location} onChange={(event) => setLocation(event.target.value)} className="h-11 md:border-0 md:shadow-none" />
          </div>
          <div className="flex flex-col gap-1 md:px-3">
            <Label htmlFor="hero-type" className="sr-only">
              Property type
            </Label>
            <Select value={propertyType} onValueChange={setPropertyType}>
              <SelectTrigger id="hero-type" className="h-11 md:border-0 md:shadow-none">
                <SelectValue placeholder="Any type" />
              </SelectTrigger>
              <SelectContent className="scheme-light">
                <SelectItem value="any">Any type</SelectItem>
                {PROPERTY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {PROPERTY_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 md:px-3">
            <Label htmlFor="hero-price" className="sr-only">
              Maximum price
            </Label>
            <Input id="hero-price" type="number" min={0} inputMode="numeric" placeholder={mode === "RENT" ? "Max rent per month (₹)" : "Max budget (₹)"} value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} className="h-11 md:border-0 md:shadow-none" />
          </div>
          <div className="md:pl-3">
            <Button type="submit" size="lg" className="h-11 w-full">
              <Search /> Search
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}

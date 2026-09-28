"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  FURNISHED_LABELS,
  FURNISHED_STATUSES,
  LISTING_TYPE_LABELS,
  LISTING_TYPES,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
} from "@/lib/constants";
import { countActiveFilters, propertiesHref } from "@/lib/search-params";
import type { AmenityDTO } from "@/types/dto";
import type { PropertyFilters } from "@/validations/property";

interface PropertyFiltersPanelProps {
  filters: PropertyFilters;
  amenities: AmenityDTO[];
}

const LISTED_WITHIN_OPTIONS = [
  { value: "1", label: "Last 24 hours" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
] as const;

function FiltersForm({ filters, amenities, onApplied }: PropertyFiltersPanelProps & { onApplied?: () => void }) {
  const router = useRouter();
  const [draft, setDraft] = React.useState<PropertyFilters>(filters);

  function update<K extends keyof PropertyFilters>(key: K, value: PropertyFilters[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleInList(key: "propertyType" | "amenities", value: string) {
    setDraft((current) => {
      const list = (current[key] as string[] | undefined) ?? [];
      const next = list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
      return { ...current, [key]: next.length ? next : undefined } as PropertyFilters;
    });
  }

  function apply(event: React.FormEvent) {
    event.preventDefault();
    router.push(propertiesHref(draft));
    onApplied?.();
  }

  function clear() {
    router.push(propertiesHref({ sort: filters.sort, view: filters.view }));
    onApplied?.();
  }

  const numberValue = (value: number | undefined) => (value === undefined ? "" : String(value));
  const parseNumber = (value: string) => (value === "" ? undefined : Number(value));

  return (
    <form onSubmit={apply} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="filter-q">Keywords</Label>
        <Input id="filter-q" placeholder="Garden, renovated, view…" value={draft.q ?? ""} onChange={(event) => update("q", event.target.value || undefined)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="filter-location">Location</Label>
        <Input id="filter-location" placeholder="City, state or postal code" value={draft.location ?? ""} onChange={(event) => update("location", event.target.value || undefined)} />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Listing type</legend>
        <div className="grid grid-cols-3 gap-2">
          <Button type="button" size="sm" variant={!draft.listingType ? "default" : "outline"} onClick={() => update("listingType", undefined)}>
            Any
          </Button>
          {LISTING_TYPES.map((type) => (
            <Button key={type} type="button" size="sm" variant={draft.listingType === type ? "default" : "outline"} onClick={() => update("listingType", type)}>
              {LISTING_TYPE_LABELS[type].replace("For ", "")}
            </Button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Property type</legend>
        <div className="grid grid-cols-2 gap-2">
          {PROPERTY_TYPES.map((type) => (
            <Label key={type} htmlFor={`type-${type}`} className="flex items-center gap-2 font-normal">
              <Checkbox id={`type-${type}`} checked={draft.propertyType?.includes(type) ?? false} onCheckedChange={() => toggleInList("propertyType", type)} />
              {PROPERTY_TYPE_LABELS[type]}
            </Label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Price</legend>
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" inputMode="numeric" min={0} placeholder="Min" aria-label="Minimum price" value={numberValue(draft.minPrice)} onChange={(event) => update("minPrice", parseNumber(event.target.value))} />
          <Input type="number" inputMode="numeric" min={0} placeholder="Max" aria-label="Maximum price" value={numberValue(draft.maxPrice)} onChange={(event) => update("maxPrice", parseNumber(event.target.value))} />
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="filter-bedrooms">Bedrooms</Label>
          <Select value={draft.bedrooms ? String(draft.bedrooms) : "any"} onValueChange={(value) => update("bedrooms", value === "any" ? undefined : Number(value))}>
            <SelectTrigger id="filter-bedrooms">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              {[1, 2, 3, 4, 5].map((value) => (
                <SelectItem key={value} value={String(value)}>
                  {value}+
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="filter-bathrooms">Bathrooms</Label>
          <Select value={draft.bathrooms ? String(draft.bathrooms) : "any"} onValueChange={(value) => update("bathrooms", value === "any" ? undefined : Number(value))}>
            <SelectTrigger id="filter-bathrooms">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              {[1, 1.5, 2, 3, 4].map((value) => (
                <SelectItem key={value} value={String(value)}>
                  {value}+
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Interior area (sq ft / m²)</legend>
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" inputMode="numeric" min={0} placeholder="Min" aria-label="Minimum area" value={numberValue(draft.minArea)} onChange={(event) => update("minArea", parseNumber(event.target.value))} />
          <Input type="number" inputMode="numeric" min={0} placeholder="Max" aria-label="Maximum area" value={numberValue(draft.maxArea)} onChange={(event) => update("maxArea", parseNumber(event.target.value))} />
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="filter-furnished">Furnished</Label>
          <Select value={draft.furnished ?? "any"} onValueChange={(value) => update("furnished", value === "any" ? undefined : (value as PropertyFilters["furnished"]))}>
            <SelectTrigger id="filter-furnished">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              {FURNISHED_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {FURNISHED_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="filter-listed">Listed</Label>
          <Select value={draft.listedWithin ?? "any"} onValueChange={(value) => update("listedWithin", value === "any" ? undefined : (value as PropertyFilters["listedWithin"]))}>
            <SelectTrigger id="filter-listed">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any time</SelectItem>
              {LISTED_WITHIN_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {amenities.length > 0 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Amenities</legend>
          <div className="grid grid-cols-2 gap-2">
            {amenities.map((amenity) => (
              <Label key={amenity.id} htmlFor={`amenity-${amenity.slug}`} className="flex items-center gap-2 font-normal">
                <Checkbox id={`amenity-${amenity.slug}`} checked={draft.amenities?.includes(amenity.slug) ?? false} onCheckedChange={() => toggleInList("amenities", amenity.slug)} />
                {amenity.name}
              </Label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="sticky bottom-0 flex gap-2 border-t bg-background pt-4">
        <Button type="button" variant="outline" className="flex-1" onClick={clear}>
          Clear all
        </Button>
        <Button type="submit" className="flex-1">
          Apply filters
        </Button>
      </div>
    </form>
  );
}

export function PropertyFiltersPanel(props: PropertyFiltersPanelProps) {
  const [open, setOpen] = React.useState(false);
  const activeCount = countActiveFilters(props.filters);
  // Remount the form whenever the URL filters change so the draft picks up the new values.
  const formKey = JSON.stringify(props.filters);
  return (
    <>
      <aside className="hidden lg:block" aria-label="Filters">
        <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-xl border bg-card p-5 scrollbar-thin">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
            <SlidersHorizontal className="size-4" /> Filters
          </h2>
          <FiltersForm key={formKey} {...props} />
        </div>
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="lg:hidden">
            <SlidersHorizontal /> Filters {activeCount > 0 ? `(${activeCount})` : ""}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6">
            <FiltersForm key={formKey} {...props} onApplied={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function ActiveFilterChips({ filters, amenities }: PropertyFiltersPanelProps) {
  const chips: { key: string; label: string; remove: Partial<PropertyFilters> }[] = [];
  if (filters.q) chips.push({ key: "q", label: `“${filters.q}”`, remove: { q: undefined } });
  if (filters.location) chips.push({ key: "location", label: filters.location, remove: { location: undefined } });
  if (filters.listingType) chips.push({ key: "listingType", label: LISTING_TYPE_LABELS[filters.listingType], remove: { listingType: undefined } });
  for (const type of filters.propertyType ?? []) {
    chips.push({ key: `type-${type}`, label: PROPERTY_TYPE_LABELS[type], remove: { propertyType: filters.propertyType?.filter((entry) => entry !== type) } });
  }
  if (filters.minPrice !== undefined) chips.push({ key: "minPrice", label: `Min $${filters.minPrice.toLocaleString()}`, remove: { minPrice: undefined } });
  if (filters.maxPrice !== undefined) chips.push({ key: "maxPrice", label: `Max $${filters.maxPrice.toLocaleString()}`, remove: { maxPrice: undefined } });
  if (filters.bedrooms) chips.push({ key: "bedrooms", label: `${filters.bedrooms}+ beds`, remove: { bedrooms: undefined } });
  if (filters.bathrooms) chips.push({ key: "bathrooms", label: `${filters.bathrooms}+ baths`, remove: { bathrooms: undefined } });
  if (filters.minArea) chips.push({ key: "minArea", label: `Min ${filters.minArea.toLocaleString()} area`, remove: { minArea: undefined } });
  if (filters.maxArea) chips.push({ key: "maxArea", label: `Max ${filters.maxArea.toLocaleString()} area`, remove: { maxArea: undefined } });
  if (filters.furnished) chips.push({ key: "furnished", label: FURNISHED_LABELS[filters.furnished], remove: { furnished: undefined } });
  if (filters.listedWithin) chips.push({ key: "listedWithin", label: LISTED_WITHIN_OPTIONS.find((option) => option.value === filters.listedWithin)?.label ?? "", remove: { listedWithin: undefined } });
  for (const slug of filters.amenities ?? []) {
    chips.push({ key: `amenity-${slug}`, label: amenities.find((amenity) => amenity.slug === slug)?.name ?? slug, remove: { amenities: filters.amenities?.filter((entry) => entry !== slug) } });
  }
  if (chips.length === 0) return null;

  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label="Active filters">
      {chips.map((chip) => (
        <li key={chip.key}>
          <ChipLink href={propertiesHref(filters, chip.remove)} label={chip.label} />
        </li>
      ))}
      <li>
        <ChipLink href={propertiesHref({ sort: filters.sort, view: filters.view })} label="Clear all" clear />
      </li>
    </ul>
  );
}

function ChipLink({ href, label, clear }: { href: string; label: string; clear?: boolean }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className={
        clear
          ? "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          : "inline-flex items-center gap-1 rounded-full border bg-accent/60 px-3 py-1 text-xs font-medium text-accent-foreground hover:bg-accent"
      }
      aria-label={clear ? "Clear all filters" : `Remove filter ${label}`}
    >
      {label}
      {!clear ? <X className="size-3" aria-hidden="true" /> : null}
    </button>
  );
}

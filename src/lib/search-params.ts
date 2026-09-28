import { propertyFiltersSchema, type PropertyFilters } from "@/validations/property";

export type RawSearchParams = Record<string, string | string[] | undefined>;

const ARRAY_KEYS = ["propertyType", "amenities"] as const;

// Turns Next.js searchParams into validated filters. Invalid values are dropped rather than
// failing the page so shared links with typos still render.
export function parsePropertyFilters(raw: RawSearchParams): PropertyFilters {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined || value === "") continue;
    if ((ARRAY_KEYS as readonly string[]).includes(key)) {
      const list = (Array.isArray(value) ? value : value.split(",")).map((entry) => entry.trim()).filter(Boolean);
      if (list.length > 0) normalized[key] = list;
    } else {
      normalized[key] = Array.isArray(value) ? value[0] : value;
    }
  }
  const parsed = propertyFiltersSchema.safeParse(normalized);
  if (parsed.success) return parsed.data;

  // Drop the offending keys and try again.
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string") delete normalized[key];
  }
  const retry = propertyFiltersSchema.safeParse(normalized);
  return retry.success ? retry.data : propertyFiltersSchema.parse({});
}

export function filtersToSearchParams(filters: Partial<PropertyFilters>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(","));
      continue;
    }
    if (key === "page" && value === 1) continue;
    if (key === "sort" && value === "newest") continue;
    if (key === "view" && value === "grid") continue;
    params.set(key, String(value));
  }
  return params;
}

export function propertiesHref(filters: Partial<PropertyFilters>, overrides: Partial<PropertyFilters> = {}) {
  const merged = { ...filters, ...overrides };
  // Any filter change resets pagination unless the page was explicitly set.
  if (!("page" in overrides)) merged.page = 1;
  const query = filtersToSearchParams(merged).toString();
  return query ? `/properties?${query}` : "/properties";
}

export function countActiveFilters(filters: PropertyFilters) {
  const ignored = new Set(["sort", "page", "view"]);
  return Object.entries(filters).filter(([key, value]) => {
    if (ignored.has(key) || value === undefined || value === "") return false;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }).length;
}

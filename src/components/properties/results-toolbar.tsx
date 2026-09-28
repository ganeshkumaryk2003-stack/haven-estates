"use client";

import { useRouter } from "next/navigation";
import { LayoutGrid, List, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SORT_LABELS, SORT_OPTIONS } from "@/lib/constants";
import { propertiesHref } from "@/lib/search-params";
import type { PropertyFilters } from "@/validations/property";

export function ResultsToolbar({ filters, total }: { filters: PropertyFilters; total: number }) {
  const router = useRouter();
  const views = [
    { value: "grid", icon: LayoutGrid, label: "Grid view" },
    { value: "list", icon: List, label: "List view" },
    { value: "map", icon: Map, label: "Map view" },
  ] as const;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground" role="status">
        <span className="font-semibold text-foreground">{total.toLocaleString()}</span> {total === 1 ? "property" : "properties"} found
      </p>
      <div className="flex items-center gap-2">
        <Label htmlFor="sort" className="sr-only">
          Sort by
        </Label>
        <Select value={filters.sort} onValueChange={(value) => router.push(propertiesHref(filters, { sort: value as PropertyFilters["sort"], page: filters.page }))}>
          <SelectTrigger id="sort" size="sm" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {SORT_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex rounded-md border" role="group" aria-label="View">
          {views.map((view) => (
            <Button
              key={view.value}
              type="button"
              variant={filters.view === view.value ? "secondary" : "ghost"}
              size="icon-sm"
              aria-label={view.label}
              aria-pressed={filters.view === view.value}
              onClick={() => router.push(propertiesHref(filters, { view: view.value, page: view.value === "map" ? 1 : filters.page }))}
            >
              <view.icon />
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

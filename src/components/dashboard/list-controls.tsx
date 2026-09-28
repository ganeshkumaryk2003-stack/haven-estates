"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, Search, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ListControlsProps {
  statusOptions: { value: string; label: string }[];
  showViewToggle?: boolean;
  searchPlaceholder?: string;
}

// URL-driven search / status filter / view toggle for dashboard lists.
export function ListControls({ statusOptions, showViewToggle = false, searchPlaceholder = "Search…" }: ListControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = React.useState(params.get("q") ?? "");

  function update(next: Record<string, string | null>) {
    const search = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "" || value === "all") search.delete(key);
      else search.set(key, value);
    }
    const qs = search.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        update({ q: query });
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <div className="relative flex-1 min-w-48">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Label htmlFor="list-search" className="sr-only">
          Search
        </Label>
        <Input id="list-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} className="pl-9" />
      </div>
      <Label htmlFor="list-status" className="sr-only">
        Status
      </Label>
      <Select value={params.get("status") ?? "all"} onValueChange={(value) => update({ status: value })}>
        <SelectTrigger id="list-status" className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" variant="secondary">
        Search
      </Button>
      {showViewToggle ? (
        <div className="flex rounded-md border" role="group" aria-label="View">
          <Button type="button" variant={(params.get("view") ?? "table") === "table" ? "secondary" : "ghost"} size="icon-sm" aria-label="Table view" onClick={() => update({ view: "table" })}>
            <Table2 />
          </Button>
          <Button type="button" variant={params.get("view") === "cards" ? "secondary" : "ghost"} size="icon-sm" aria-label="Card view" onClick={() => update({ view: "cards" })}>
            <LayoutGrid />
          </Button>
        </div>
      ) : null}
    </form>
  );
}

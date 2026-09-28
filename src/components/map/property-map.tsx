"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/misc";
import type { MapMarker } from "@/components/map/leaflet-map";

// Leaflet touches `window` at import time, so it is only ever loaded in the browser.
const LeafletMap = dynamic(() => import("@/components/map/leaflet-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-xl" />,
});

interface PropertyMapProps {
  markers: MapMarker[];
  className?: string;
  zoom?: number;
  interactive?: boolean;
}

export function PropertyMap({ markers, className, zoom, interactive }: PropertyMapProps) {
  return (
    <div className={className} role="region" aria-label="Map">
      <LeafletMap markers={markers} zoom={zoom} interactive={interactive} className="h-full w-full" />
    </div>
  );
}

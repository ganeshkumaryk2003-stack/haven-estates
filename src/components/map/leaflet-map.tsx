"use client";

import * as React from "react";
import Link from "next/link";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { DEFAULT_CURRENCY } from "@/lib/constants";
import { formatPrice } from "@/lib/format";

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  price?: number;
  currency?: string;
  listingType?: "SALE" | "RENT";
  href?: string;
  imageUrl?: string | null;
}

interface LeafletMapProps {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  interactive?: boolean;
}

// Leaflet's default icon paths break under bundlers; use an inline SVG pin instead.
const pinIcon = L.divIcon({
  className: "",
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 24 30" aria-hidden="true"><path d="M12 0C6.5 0 2 4.5 2 10c0 7 10 20 10 20s10-13 10-20C22 4.5 17.5 0 12 0z" fill="#0f766e" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="10" r="4" fill="#fff"/></svg>`,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -36],
});

function FitBounds({ markers }: { markers: MapMarker[] }) {
  const map = useMap();
  React.useEffect(() => {
    if (markers.length === 0) return;
    if (markers.length === 1) {
      const only = markers[0]!;
      map.setView([only.latitude, only.longitude], 14);
      return;
    }
    map.fitBounds(L.latLngBounds(markers.map((marker) => [marker.latitude, marker.longitude] as [number, number])), { padding: [40, 40], maxZoom: 15 });
  }, [map, markers]);
  return null;
}

// Where the map opens when there is nothing to show yet: roughly the centre of India.
const INDIA_CENTER: [number, number] = [22.5, 79];
const INDIA_ZOOM = 5;

export default function LeafletMap({ markers, center, zoom = 12, className, interactive = true }: LeafletMapProps) {
  const hasFocus = Boolean(center || markers[0]);
  const initialCenter: [number, number] = center ?? (markers[0] ? [markers[0].latitude, markers[0].longitude] : INDIA_CENTER);
  return (
    <div className={className}>
      <MapContainer
        center={initialCenter}
        zoom={hasFocus ? zoom : INDIA_ZOOM}
        scrollWheelZoom={interactive}
        dragging={interactive}
        zoomControl={interactive}
        doubleClickZoom={interactive}
        attributionControl
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds markers={markers} />
        {markers.map((marker) => (
          <Marker key={marker.id} position={[marker.latitude, marker.longitude]} icon={pinIcon} title={marker.title}>
            <Popup>
              <div className="flex w-48 flex-col gap-1">
                {marker.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={marker.imageUrl} alt="" className="h-24 w-full rounded-md object-cover" />
                ) : null}
                <p className="text-sm font-semibold leading-tight">{marker.title}</p>
                {marker.price !== undefined ? (
                  <p className="text-sm font-bold text-[#0f766e]">{formatPrice(marker.price, marker.currency ?? DEFAULT_CURRENCY, marker.listingType ?? "SALE")}</p>
                ) : null}
                {marker.href ? (
                  <Link href={marker.href} className="text-xs font-medium underline">
                    View listing
                  </Link>
                ) : null}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

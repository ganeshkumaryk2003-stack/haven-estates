import { ImageResponse } from "next/og";
import { BRAND_DOOR_COLOR, BRAND_DOORWAY_COLOR } from "@/components/layout/brand-mark";

// iOS home-screen icon: the D-doorway mark on a warm white tile. iOS rounds the corners itself.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#FBFAF8" }}>
        <svg width="132" height="145" viewBox="0 0 40 44">
          <defs>
            <linearGradient id="dk-light" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FAF3E7" />
              <stop offset="1" stopColor="#E6C47F" />
            </linearGradient>
          </defs>
          <path d="M3 2.5A1.5 1.5 0 0 1 4.5 1H19a20 21 0 0 1 0 42H4.5A1.5 1.5 0 0 1 3 41.5Z" fill={BRAND_DOOR_COLOR} />
          <path d="M9 8H22V37H9Z" fill={BRAND_DOORWAY_COLOR} />
          <path d="M9 8L19.5 10V35.2L9 38Z" fill="url(#dk-light)" />
          <circle cx="16.8" cy="23" r="1.25" fill={BRAND_DOOR_COLOR} />
        </svg>
      </div>
    ),
    size,
  );
}

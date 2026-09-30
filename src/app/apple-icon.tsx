import { ImageResponse } from "next/og";
import { BRAND_COLOR, BRAND_DOOR_PATH, BRAND_KEYHOLE_PATH } from "@/components/layout/brand-mark";

// iOS home-screen icon. iOS rounds the corners itself, so this one is a full-bleed tile.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND_COLOR }}>
        <svg width="180" height="180" viewBox="0 0 32 32">
          <path d={BRAND_DOOR_PATH} fill="#ffffff" />
          <path d={BRAND_KEYHOLE_PATH} fill={BRAND_COLOR} />
        </svg>
      </div>
    ),
    size,
  );
}

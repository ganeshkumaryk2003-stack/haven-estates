import { ImageResponse } from "next/og";
import { BRAND_COLOR, BRAND_DOOR_PATH, BRAND_KEYHOLE_PATH } from "@/components/layout/brand-mark";

// Favicon: the Doorkey mark on a rounded teal tile with transparent corners.
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND_COLOR, borderRadius: 14 }}>
        <svg width="64" height="64" viewBox="0 0 32 32">
          <path d={BRAND_DOOR_PATH} fill="#ffffff" />
          <path d={BRAND_KEYHOLE_PATH} fill={BRAND_COLOR} />
        </svg>
      </div>
    ),
    size,
  );
}

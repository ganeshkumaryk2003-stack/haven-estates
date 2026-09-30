import { ImageResponse } from "next/og";
import { BRAND_DOOR_COLOR, BRAND_DOORWAY_COLOR, BRAND_NAVY } from "@/components/layout/brand-mark";
import { APP_DESCRIPTION, APP_NAME, APP_SHORT_NAME, APP_TAGLINE } from "@/lib/constants";

// Social sharing card (Open Graph; Twitter/X falls back to it). Rendered once at build time.
export const alt = `${APP_NAME} - ${APP_DESCRIPTION}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: BRAND_NAVY,
          background: "#FBFAF8",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          <svg width="150" height="165" viewBox="0 0 40 44">
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
          <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}>
            <div style={{ fontSize: 112, fontWeight: 600, letterSpacing: -3, lineHeight: 1 }}>{APP_SHORT_NAME}</div>
            <div style={{ fontSize: 40, fontFamily: "sans-serif", color: "#566479" }}>{APP_TAGLINE}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 44, fontWeight: 600, lineHeight: 1.2, maxWidth: 1000 }}>Find a home. Make an offer. Reserve it.</div>
          <div style={{ fontSize: 26, lineHeight: 1.4, fontFamily: "sans-serif", color: "#566479", maxWidth: 1000 }}>{APP_DESCRIPTION}</div>
        </div>
      </div>
    ),
    size,
  );
}

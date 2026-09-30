import { ImageResponse } from "next/og";
import { BRAND_COLOR, BRAND_COLOR_DARK, BRAND_DOOR_PATH, BRAND_KEYHOLE_PATH } from "@/components/layout/brand-mark";
import { APP_DESCRIPTION, APP_FULL_NAME, APP_NAME, APP_TAGLINE } from "@/lib/constants";

// Social sharing card (Open Graph; Twitter/X falls back to it). Rendered once at build time.
export const alt = `${APP_FULL_NAME} - ${APP_DESCRIPTION}`;
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
          color: "#ffffff",
          background: `radial-gradient(circle at 15% 20%, rgba(15,118,110,0.55), transparent 55%), ${BRAND_COLOR_DARK}`,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          <div style={{ width: 168, height: 168, display: "flex", alignItems: "center", justifyContent: "center", background: BRAND_COLOR, borderRadius: 40 }}>
            <svg width="168" height="168" viewBox="0 0 32 32">
              <path d={BRAND_DOOR_PATH} fill="#ffffff" />
              <path d={BRAND_KEYHOLE_PATH} fill={BRAND_COLOR} />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 112, fontWeight: 700, letterSpacing: -4, lineHeight: 1 }}>{APP_NAME}</div>
            <div style={{ marginTop: 14, fontSize: 34, fontWeight: 600, letterSpacing: 14, textTransform: "uppercase", color: "#5eead4" }}>{APP_TAGLINE}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 40, fontWeight: 600, lineHeight: 1.2, maxWidth: 1000 }}>Find a home you love. Reserve it with confidence.</div>
          <div style={{ fontSize: 26, lineHeight: 1.4, color: "rgba(255,255,255,0.72)", maxWidth: 1000 }}>{APP_DESCRIPTION}</div>
        </div>
      </div>
    ),
    size,
  );
}

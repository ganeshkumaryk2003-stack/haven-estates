import { cn } from "@/lib/utils";

// Doorkey mark: an arched door with a keyhole. Drawn on a 32x32 grid so it stays crisp from a
// 16px favicon up to the social card. The keyhole is a separate path painted in the background
// colour (instead of an evenodd hole) so the same geometry renders identically in the browser,
// in emails and inside next/og's Satori renderer.
export const BRAND_DOOR_PATH = "M10 25V13a6 6 0 0 1 12 0v12Z";
export const BRAND_KEYHOLE_PATH = "M16 14.3a2.2 2.2 0 0 0-1.61 3.7L13.9 22h4.2l-.49-4A2.2 2.2 0 0 0 16 14.3Z";

// Brand teal, kept in sync with --primary in globals.css (oklch(0.48 0.1 185) ≈ #0f766e) for
// places that cannot read CSS variables (favicons, OG image, HTML emails).
export const BRAND_COLOR = "#0f766e";
export const BRAND_COLOR_DARK = "#171a21";

// Glyph only (no background); inherits its colours from the parent via currentColor and the
// theme's fill-primary utility so it works on the primary square in both light and dark mode.
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden="true" focusable="false">
      <path d={BRAND_DOOR_PATH} fill="currentColor" />
      <path d={BRAND_KEYHOLE_PATH} className="fill-primary" />
    </svg>
  );
}

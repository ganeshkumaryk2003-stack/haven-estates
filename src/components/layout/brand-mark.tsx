import { useId } from "react";
import { cn } from "@/lib/utils";

// DoorKey mark: the letter D drawn as a doorway, with the door leaf catching the light.
// The blues come from CSS tokens (--door / --door-shadow) so the mark adapts to dark mode;
// the door leaf keeps a fixed cream-to-gold gradient in both themes.
export const BRAND_DOOR_COLOR = "#2F54C4";
export const BRAND_DOORWAY_COLOR = "#1E3A8F";
export const BRAND_NAVY = "#16233B";

export function BrandMark({ className }: { className?: string }) {
  // The logo renders in the header, the footer and the mobile sheet, so the gradient id must be
  // unique per instance or the browser resolves every url(#id) to the first one it finds.
  const gradientId = `dk-light-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 40 44" className={cn("h-8 w-auto", className)} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FAF3E7" />
          <stop offset="1" stopColor="#E6C47F" />
        </linearGradient>
      </defs>
      <path d="M3 2.5A1.5 1.5 0 0 1 4.5 1H19a20 21 0 0 1 0 42H4.5A1.5 1.5 0 0 1 3 41.5Z" fill="var(--door)" />
      <path d="M9 8H22V37H9Z" fill="var(--door-shadow)" />
      <path d="M9 8L19.5 10V35.2L9 38Z" fill={`url(#${gradientId})`} />
      <circle cx="16.8" cy="23" r="1.25" fill="var(--door)" />
    </svg>
  );
}

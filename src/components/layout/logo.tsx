import Link from "next/link";
import { BrandMark } from "@/components/layout/brand-mark";
import { APP_NAME, APP_SHORT_NAME, APP_TAGLINE } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)} aria-label={`${APP_NAME} home`}>
      <BrandMark />
      {compact ? null : (
        <span className="flex items-baseline gap-1.5 leading-none">
          <span className="font-display text-xl font-semibold tracking-[-0.015em] text-foreground">{APP_SHORT_NAME}</span>
          <span className="hidden text-sm text-muted-foreground min-[400px]:inline">{APP_TAGLINE}</span>
        </span>
      )}
    </Link>
  );
}

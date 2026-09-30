import Link from "next/link";
import { BrandMark } from "@/components/layout/brand-mark";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5 font-display", className)} aria-label={`${APP_NAME} ${APP_TAGLINE} home`}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <BrandMark className="size-9" />
      </span>
      {compact ? null : (
        <span className="flex flex-col leading-none">
          <span className="text-lg font-bold tracking-tight">{APP_NAME}</span>
          <span className="mt-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground">{APP_TAGLINE}</span>
        </span>
      )}
    </Link>
  );
}

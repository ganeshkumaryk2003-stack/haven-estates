import Link from "next/link";
import { Home } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 font-display text-lg font-bold tracking-tight", className)} aria-label={`${APP_NAME} home`}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Home className="size-4" aria-hidden="true" />
      </span>
      {compact ? null : <span>{APP_NAME}</span>}
    </Link>
  );
}

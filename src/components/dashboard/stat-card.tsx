import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  /** Kept for API compatibility; the redesign shows the number without an icon chip. */
  icon: LucideIcon;
  href?: string;
  tone?: "default" | "primary" | "warning";
}

export function StatCard({ label, value, hint, href, tone = "default" }: StatCardProps) {
  const content = (
    <CardContent className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        {tone === "warning" ? <Badge variant="warning">Needs you</Badge> : null}
      </div>
      <p className={cn("font-display text-3xl font-semibold tabular-nums", tone === "primary" && "text-primary")}>{typeof value === "number" ? value.toLocaleString() : value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </CardContent>
  );
  // Porch-light left edge marks the cards that need a decision.
  const cardClass = cn("h-full py-5", tone === "warning" && "border-l-[3px] border-l-gold");
  if (href) {
    return (
      <Link href={href} className="rounded-[20px] focus-visible:outline-2 focus-visible:outline-ring">
        <Card className={cn(cardClass, "transition-colors hover:border-input")}>{content}</Card>
      </Link>
    );
  }
  return <Card className={cardClass}>{content}</Card>;
}

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  href?: string;
  tone?: "default" | "primary" | "warning";
}

export function StatCard({ label, value, hint, icon: Icon, href, tone = "default" }: StatCardProps) {
  const content = (
    <CardContent className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          tone === "primary" && "bg-primary/10 text-primary",
          tone === "warning" && "bg-warning/20 text-amber-700 dark:text-amber-300",
          tone === "default" && "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
    </CardContent>
  );
  if (href) {
    return (
      <Link href={href} className="rounded-xl focus-visible:outline-2 focus-visible:outline-ring">
        <Card className="h-full py-5 transition-shadow hover:shadow-md">{content}</Card>
      </Link>
    );
  }
  return <Card className="py-5">{content}</Card>;
}

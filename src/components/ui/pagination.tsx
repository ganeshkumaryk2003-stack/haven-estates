import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
  className?: string;
}

function pageWindow(page: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  if (page <= 3) pages.add(2).add(3).add(4);
  if (page >= totalPages - 2) pages.add(totalPages - 1).add(totalPages - 2).add(totalPages - 3);
  const sorted = [...pages].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  for (const [index, value] of sorted.entries()) {
    if (index > 0 && value - (sorted[index - 1] as number) > 1) result.push("…");
    result.push(value);
  }
  return result;
}

export function Pagination({ page, totalPages, hrefForPage, className }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className={cn("flex items-center justify-center gap-1", className)}>
      <Link
        href={hrefForPage(Math.max(1, page - 1))}
        aria-disabled={page === 1}
        tabIndex={page === 1 ? -1 : undefined}
        className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }), page === 1 && "pointer-events-none opacity-50")}
      >
        <ChevronLeft />
        <span className="sr-only">Previous page</span>
      </Link>
      {pageWindow(page, totalPages).map((value, index) =>
        value === "…" ? (
          <span key={`gap-${index}`} className="px-2 text-sm text-muted-foreground" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={value}
            href={hrefForPage(value)}
            aria-current={value === page ? "page" : undefined}
            className={cn(buttonVariants({ variant: value === page ? "default" : "outline", size: "icon-sm" }), "text-xs")}
          >
            {value}
          </Link>
        ),
      )}
      <Link
        href={hrefForPage(Math.min(totalPages, page + 1))}
        aria-disabled={page === totalPages}
        tabIndex={page === totalPages ? -1 : undefined}
        className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }), page === totalPages && "pointer-events-none opacity-50")}
      >
        <ChevronRight />
        <span className="sr-only">Next page</span>
      </Link>
    </nav>
  );
}

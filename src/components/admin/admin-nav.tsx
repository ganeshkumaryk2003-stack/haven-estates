"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Flag, LayoutDashboard, Receipt, ScrollText, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/properties", label: "Listings", icon: Building2 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/transactions", label: "Transactions", icon: Receipt },
  { href: "/admin/reports", label: "Reports", icon: Flag },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
];

export function AdminNav({ badges }: { badges: Partial<Record<string, number>> }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Administration" className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:pb-0">
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
        const badge = badges[item.href];
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors hover:bg-accent",
              active ? "bg-accent text-accent-foreground" : "text-muted-foreground",
            )}
          >
            <item.icon className="size-4" aria-hidden="true" />
            {item.label}
            {badge ? <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-destructive-foreground">{badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

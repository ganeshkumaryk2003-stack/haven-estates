"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Building2, HandCoins, Inbox, LayoutDashboard, Receipt, Settings, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  badge?: number;
}

const ICONS = {
  overview: LayoutDashboard,
  properties: Building2,
  enquiries: Inbox,
  offers: HandCoins,
  reservations: Receipt,
  connections: Users,
  notifications: Bell,
  settings: Settings,
} satisfies Record<string, LucideIcon>;

export function DashboardNav({ items }: { items: DashboardNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Dashboard" className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:pb-0">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
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
            <Icon className="size-4" aria-hidden="true" />
            {item.label}
            {item.badge ? (
              <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">{item.badge}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

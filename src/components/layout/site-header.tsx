import Link from "next/link";
import { Plus } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { MainNav, type NavItem } from "@/components/layout/main-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { getUnreadMessageCount } from "@/server/services/messaging";
import { getUnreadNotificationCount } from "@/server/services/notifications";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const [unreadMessages, unreadNotifications] = user
    ? await Promise.all([getUnreadMessageCount(user.id), getUnreadNotificationCount(user.id)])
    : [0, 0];

  const items: NavItem[] = [
    { href: "/", label: "Home" },
    { href: "/properties", label: "Browse" },
    { href: "/properties/new", label: "List a property" },
    ...(user
      ? [
          { href: "/favorites", label: "Favorites" },
          { href: "/messages", label: "Messages", badge: unreadMessages },
          { href: "/dashboard", label: "My dashboard" },
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/92 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-3">
        <MobileNav items={items} signedIn={Boolean(user)} />
        <Logo />
        <MainNav items={items} className="ml-6 hidden md:block" />
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          {user ? (
            <>
              <NotificationsBell initialUnread={unreadNotifications} />
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href="/properties/new">
                  <Plus /> List
                </Link>
              </Button>
              <UserMenu user={{ id: user.id, name: user.name, email: user.email, image: user.image, role: user.role }} />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

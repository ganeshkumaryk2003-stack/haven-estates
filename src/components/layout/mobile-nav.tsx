"use client";

import * as React from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { MainNav, type NavItem } from "@/components/layout/main-nav";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { signOutAction } from "@/server/actions/auth";

export function MobileNav({ items, signedIn }: { items: NavItem[]; signedIn: boolean }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <SheetHeader>
          <SheetTitle asChild>
            <Logo />
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 px-4 pb-4">
          <MainNav items={items} onNavigate={() => setOpen(false)} />
          <div className="mt-auto flex flex-col gap-2">
            {signedIn ? (
              <Button variant="outline" onClick={() => void signOutAction()}>
                Sign out
              </Button>
            ) : (
              <>
                <Button asChild variant="outline" onClick={() => setOpen(false)}>
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild onClick={() => setOpen(false)}>
                  <Link href="/signup">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

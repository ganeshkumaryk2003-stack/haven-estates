import Link from "next/link";
import { HeroDoorway } from "@/components/home/hero-doorway";
import { Logo } from "@/components/layout/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="container-page flex h-16 items-center justify-between">
        <Logo />
        <Link href="/properties" className="text-sm text-muted-foreground hover:text-foreground">
          Browse properties
        </Link>
      </header>
      <main id="main" className="flex flex-1">
        {/* Sky panel with the doorway, shown from lg up. The form on the right is unchanged. */}
        <aside aria-hidden="true" className="relative hidden w-[42%] flex-col justify-end overflow-hidden bg-sky px-12 pb-0 pt-12 lg:flex">
          <p className="mb-8 max-w-xs font-display text-3xl font-semibold tracking-tight text-foreground">Every offer on the record.</p>
          <HeroDoorway tone="door" className="h-[320px]" />
        </aside>
        <div className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </main>
      <footer className="py-6 text-center text-xs text-muted-foreground">Demo marketplace. Reservation deposits use Stripe test mode.</footer>
    </div>
  );
}

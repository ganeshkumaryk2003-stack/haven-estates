import Link from "next/link";
import { Logo } from "@/components/layout/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="container-page flex h-16 items-center justify-between">
        <Logo />
        <Link href="/properties" className="text-sm text-muted-foreground hover:text-foreground">
          Browse properties
        </Link>
      </header>
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="py-6 text-center text-xs text-muted-foreground">Demo marketplace · Reservation deposits use Stripe test mode.</footer>
    </div>
  );
}

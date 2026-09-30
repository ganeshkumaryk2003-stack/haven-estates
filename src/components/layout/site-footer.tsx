import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { APP_DESCRIPTION, APP_FULL_NAME } from "@/lib/constants";

const columns = [
  {
    title: "Explore",
    links: [
      { href: "/properties?listingType=SALE", label: "Properties for sale" },
      { href: "/properties?listingType=RENT", label: "Properties for rent" },
      { href: "/properties?propertyType=APARTMENT", label: "Flats & apartments" },
      { href: "/properties?propertyType=PLOT_RESIDENTIAL", label: "Residential plots" },
      { href: "/properties?propertyType=PLOT_INDUSTRIAL", label: "Industrial plots & sites" },
    ],
  },
  {
    title: "Sell",
    links: [
      { href: "/properties/new", label: "List a property" },
      { href: "/dashboard/properties", label: "Manage listings" },
      { href: "/dashboard/offers", label: "Offers" },
      { href: "/dashboard/enquiries", label: "Enquiries" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/messages", label: "Messages" },
      { href: "/favorites", label: "Favorites" },
      { href: "/settings/profile", label: "Settings" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-muted/30">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">{APP_DESCRIPTION}</p>
          <p className="text-xs text-muted-foreground">
            Token deposits are processed by Stripe in test mode. Reservations are not a legal transfer of ownership; the sale agreement and registration happen offline with your legal advisers.
          </p>
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title} className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">{column.title}</h2>
            <ul className="flex flex-col gap-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t">
        <div className="container-page flex flex-col gap-2 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {APP_FULL_NAME}. Demo marketplace application.
          </p>
          <p>Built with Next.js, Prisma, Auth.js and Stripe.</p>
        </div>
      </div>
    </footer>
  );
}

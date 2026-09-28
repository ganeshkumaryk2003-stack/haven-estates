import Link from "next/link";
import { ArrowRight, Building2, Home, Landmark, MapPinned, ShieldCheck, Store, Trees, Warehouse, Wallet } from "lucide-react";
import { HeroSearch } from "@/components/home/hero-search";
import { PropertyCard } from "@/components/properties/property-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { APP_NAME, PROPERTY_TYPE_LABELS, type PropertyTypeValue } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { getFeaturedProperties, getMarketplaceStats, getPropertyTypeCounts, getRecentProperties } from "@/server/services/properties";

const CATEGORY_ICONS: Record<PropertyTypeValue, typeof Home> = {
  HOUSE: Home,
  APARTMENT: Building2,
  CONDO: Landmark,
  TOWNHOUSE: Warehouse,
  LAND: Trees,
  COMMERCIAL: Store,
  OTHER: MapPinned,
};

const STEPS = [
  { title: "Search & save", description: "Filter by location, price, size and amenities. Save favourites and share searches with a link." },
  { title: "Enquire & chat", description: "Send an enquiry or message the seller in real time. Every contact creates a connection you can manage." },
  { title: "Offer & reserve", description: "Make an offer, negotiate counteroffers, then reserve the home with a secure Stripe deposit once accepted." },
];

const TESTIMONIALS = [
  { quote: "The offer flow was refreshingly clear. I knew exactly where things stood, and the deposit receipt arrived instantly.", name: "Priya N.", role: "First-time buyer, Austin" },
  { quote: "Listing my townhouse took ten minutes. Enquiries and offers land in one dashboard instead of my inbox.", name: "Marcus D.", role: "Seller, Denver" },
  { quote: "I manage a dozen rentals here. Messaging, connections and notifications keep every conversation in one place.", name: "Elena R.", role: "Letting agent, Portland" },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  const [featured, recent, stats, typeCounts] = await Promise.all([getFeaturedProperties(user?.id, 6), getRecentProperties(user?.id, 8), getMarketplaceStats(), getPropertyTypeCounts()]);
  const countByType = Object.fromEntries(typeCounts.map((entry) => [entry.propertyType, entry.count])) as Partial<Record<PropertyTypeValue, number>>;

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-[radial-gradient(ellipse_at_top_left,_var(--color-accent),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_color-mix(in_oklch,var(--color-primary)_18%,transparent),_transparent_50%)]">
        <div className="container-page flex flex-col gap-10 py-16 sm:py-24">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Real estate, end to end</p>
            <h1 className="text-balance text-4xl font-bold sm:text-5xl lg:text-6xl">Find a home you love. Reserve it with confidence.</h1>
            <p className="mt-5 max-w-2xl text-balance text-lg text-muted-foreground">
              {APP_NAME} connects buyers, renters, sellers and agents with verified profiles, real-time messaging, transparent offers and secure reservation deposits.
            </p>
          </div>
          <HeroSearch />
          <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { label: "Active listings", value: stats.activeListings },
              { label: "Cities covered", value: stats.cities },
              { label: "Sellers & agents", value: stats.sellers },
              { label: "Reservations made", value: stats.reservations },
            ].map((stat) => (
              <div key={stat.label}>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{stat.label}</dt>
                <dd className="text-2xl font-bold sm:text-3xl">{formatNumber(stat.value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 ? (
        <section className="container-page flex flex-col gap-6 py-16" aria-labelledby="featured-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="featured-heading" className="text-3xl font-bold">
                Featured homes
              </h2>
              <p className="mt-1 text-muted-foreground">Hand-picked listings from verified sellers.</p>
            </div>
            <Button asChild variant="ghost">
              <Link href="/properties">
                View all <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {featured.map((property, index) => (
              <PropertyCard key={property.id} property={property} signedIn={Boolean(user)} priority={index < 3} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Categories */}
      <section className="border-y bg-muted/30" aria-labelledby="categories-heading">
        <div className="container-page flex flex-col gap-6 py-16">
          <h2 id="categories-heading" className="text-3xl font-bold">
            Browse by property type
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyTypeValue[]).map((type) => {
              const Icon = CATEGORY_ICONS[type];
              return (
                <li key={type}>
                  <Link href={`/properties?propertyType=${type}`} className="flex flex-col items-center gap-2 rounded-xl border bg-card p-5 text-center transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring">
                    <Icon className="size-6 text-primary" aria-hidden="true" />
                    <span className="text-sm font-semibold">{PROPERTY_TYPE_LABELS[type]}</span>
                    <span className="text-xs text-muted-foreground">{countByType[type] ?? 0} listings</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Recent */}
      {recent.length > 0 ? (
        <section className="container-page flex flex-col gap-6 py-16" aria-labelledby="recent-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="recent-heading" className="text-3xl font-bold">
                Recently listed
              </h2>
              <p className="mt-1 text-muted-foreground">Fresh on the market this week.</p>
            </div>
            <Button asChild variant="ghost">
              <Link href="/properties?sort=newest">
                Newest first <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {recent.map((property) => (
              <PropertyCard key={property.id} property={property} signedIn={Boolean(user)} />
            ))}
          </div>
        </section>
      ) : null}

      {/* How it works */}
      <section className="border-y bg-muted/30" aria-labelledby="how-heading">
        <div className="container-page flex flex-col gap-10 py-16">
          <div className="max-w-2xl">
            <h2 id="how-heading" className="text-3xl font-bold">
              How it works
            </h2>
            <p className="mt-2 text-muted-foreground">From the first search to a reserved home, every step happens inside {APP_NAME}.</p>
          </div>
          <ol className="grid gap-6 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex flex-col gap-3 rounded-xl border bg-card p-6">
                <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{index + 1}</span>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </li>
            ))}
          </ol>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: ShieldCheck, title: "Verified accounts", text: "Email verification is required before anyone can contact you." },
              { icon: Wallet, title: "Secure deposits", text: "Reservation deposits are processed by Stripe; card details never touch our servers." },
              { icon: MapPinned, title: "Map-first search", text: "See every result on a map and share any search with a single link." },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <item.icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container-page flex flex-col gap-6 py-16" aria-labelledby="testimonials-heading">
        <h2 id="testimonials-heading" className="text-3xl font-bold">
          What people say
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((testimonial) => (
            <Card key={testimonial.name}>
              <CardContent className="flex flex-col gap-4">
                <blockquote className="text-sm leading-relaxed">“{testimonial.quote}”</blockquote>
                <footer className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{testimonial.name}</span> · {testimonial.role}
                </footer>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-page pb-20">
        <div className="flex flex-col items-start gap-6 rounded-2xl bg-primary px-8 py-12 text-primary-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold">Selling or letting a property?</h2>
            <p className="mt-2 max-w-xl text-primary-foreground/85">Create a listing in minutes, receive enquiries and offers in one dashboard, and let buyers reserve with a deposit.</p>
          </div>
          <Button asChild size="lg" variant="secondary">
            <Link href="/properties/new">
              List a property <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

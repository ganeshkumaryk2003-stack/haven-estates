import Link from "next/link";
import { HeroDoorway } from "@/components/home/hero-doorway";
import { HeroSearch } from "@/components/home/hero-search";
import { HeroSkyline } from "@/components/home/hero-skyline";
import { JourneyRail } from "@/components/offers/journey-rail";
import { PropertyCard } from "@/components/properties/property-card";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { PROPERTY_TYPES, PROPERTY_TYPE_LABELS, type PropertyTypeValue } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { getFeaturedProperties, getMarketplaceStats, getPropertyTypeCounts, getRecentProperties } from "@/server/services/properties";

const HOW_IT_WORKS = [
  "You choose how long an offer stays open.",
  "A seller can counter once, and you accept or decline.",
  "The deposit comes last and is taken by Stripe only after acceptance.",
];

const TRUST = [
  "Verified accounts: email verification is required before anyone can contact you.",
  "Secure deposits: reservation deposits are processed by Stripe; card details never touch our servers.",
  "Map search: see every result on a map and share any search with a single link.",
];

export default async function HomePage() {
  const user = await getCurrentUser();
  const [featured, recent, stats, typeCounts] = await Promise.all([getFeaturedProperties(user?.id, 6), getRecentProperties(user?.id, 8), getMarketplaceStats(), getPropertyTypeCounts()]);
  const countByType = Object.fromEntries(typeCounts.map((entry) => [entry.propertyType, entry.count])) as Partial<Record<PropertyTypeValue, number>>;

  return (
    <div className="flex flex-col">
      {/* Hero: dawn in light mode, dusk in dark mode (see --hero-* tokens). */}
      <section className="relative overflow-hidden text-white" style={{ background: "linear-gradient(180deg, var(--hero-top) 0%, var(--hero-upper) 45%, var(--hero-mid) 100%)" }}>
        {/* Dusk only: a pale moon with two faint halo rings in the top-right corner. */}
        <svg aria-hidden="true" focusable="false" viewBox="0 0 200 200" className="pointer-events-none absolute top-6 right-6 hidden size-40 sm:top-10 sm:right-12 sm:size-52 dark:block">
          <circle cx="100" cy="100" r="96" fill="none" stroke="#FCE7B8" strokeOpacity="0.08" strokeWidth="2" />
          <circle cx="100" cy="100" r="70" fill="none" stroke="#FCE7B8" strokeOpacity="0.14" strokeWidth="2" />
          <circle cx="100" cy="100" r="44" fill="#FCE7B8" />
        </svg>

        <div className="container-page relative z-10 flex flex-col gap-10 pt-16 pb-12 sm:pt-24 sm:pb-16">
          <div className="max-w-3xl">
            <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Find a home.
              <br />
              Make an offer.
              <br />
              Reserve it.
            </h1>
            <p className="mt-6 max-w-xl text-lg" style={{ color: "var(--hero-text-soft)" }}>
              Every offer and counteroffer is on the record, and the deposit comes only after the seller says yes.
            </p>
          </div>
          <HeroSearch signedIn={Boolean(user)} />
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
            {[
              { label: "Active listings", value: stats.activeListings },
              { label: "Cities covered", value: stats.cities },
              { label: "Sellers and agents", value: stats.sellers },
              { label: "Reservations made", value: stats.reservations },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col-reverse gap-0.5">
                <dt className="text-sm" style={{ color: "var(--hero-text-muted)" }}>
                  {stat.label}
                </dt>
                <dd className="font-display text-3xl font-semibold tabular-nums text-white">{formatNumber(stat.value)}</dd>
              </div>
            ))}
          </dl>
        </div>
        <HeroSkyline />
      </section>

      {/* Featured */}
      {featured.length > 0 ? (
        <section className="container-page flex flex-col gap-6 py-16" aria-labelledby="featured-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="featured-heading" className="text-3xl">
                Featured homes
              </h2>
              <p className="mt-1 text-muted-foreground">Hand-picked listings from verified sellers.</p>
            </div>
            <Button asChild variant="link">
              <Link href="/properties">View all</Link>
            </Button>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((property, index) => (
              <PropertyCard key={property.id} property={property} signedIn={Boolean(user)} priority={index < 3} size={index === 0 ? "large" : "default"} featuredTag={false} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Browse by property type */}
      <section className="border-y border-border bg-sky/60 dark:bg-sky" aria-labelledby="categories-heading">
        <div className="container-page flex flex-col gap-6 py-16">
          <h2 id="categories-heading" className="text-3xl">
            Browse by property type
          </h2>
          <ul className="grid gap-x-12 sm:grid-cols-2">
            {PROPERTY_TYPES.map((type) => (
              <li key={type} className="border-b border-border">
                <Link href={`/properties?propertyType=${type}`} className="flex items-baseline justify-between gap-4 py-3.5 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring">
                  <span className="font-display text-lg font-semibold">{PROPERTY_TYPE_LABELS[type]}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {formatNumber(countByType[type] ?? 0)} {countByType[type] === 1 ? "listing" : "listings"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Recent */}
      {recent.length > 0 ? (
        <section className="container-page flex flex-col gap-6 py-16" aria-labelledby="recent-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="recent-heading" className="text-3xl">
                Recently listed
              </h2>
              <p className="mt-1 text-muted-foreground">Fresh on the market this week.</p>
            </div>
            <Button asChild variant="link">
              <Link href="/properties?sort=newest">Newest first</Link>
            </Button>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {recent.map((property) => (
              <PropertyCard key={property.id} property={property} signedIn={Boolean(user)} />
            ))}
          </div>
        </section>
      ) : null}

      {/* How it works */}
      <section className="border-y border-border bg-muted/40" aria-labelledby="how-heading">
        <div className="container-page flex flex-col gap-10 py-16">
          <div className="max-w-2xl">
            <h2 id="how-heading" className="text-3xl">
              How it works
            </h2>
            <p className="mt-2 text-muted-foreground">Five steps from the first question to a reserved home, and every one of them is on the record.</p>
          </div>
          <JourneyRail current={4} complete className="max-w-4xl" />
          <ul className="grid gap-3 text-base md:grid-cols-3">
            {HOW_IT_WORKS.map((line) => (
              <li key={line} className="border-l-2 border-door pl-4">
                {line}
              </li>
            ))}
          </ul>
          <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            {TRUST.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page py-20">
        <div className="relative overflow-hidden rounded-3xl bg-cta-panel px-8 pt-12 pb-12 text-white md:pr-72 md:pb-14">
          <div className="max-w-xl">
            <h2 className="text-3xl text-white">Selling or renting out a property?</h2>
            <p className="mt-3 text-white/85">Create a listing in minutes, receive enquiries and offers in one dashboard, and let buyers reserve with a token deposit.</p>
            <Button asChild size="lg" variant="gold" className="mt-8">
              <Link href="/properties/new">List a property</Link>
            </Button>
          </div>
          <HeroDoorway tone="white" className="absolute right-10 bottom-0 hidden md:block" />
        </div>
      </section>
    </div>
  );
}

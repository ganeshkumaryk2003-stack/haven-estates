import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PropertyCard } from "@/components/properties/property-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { toPropertyCard } from "@/server/services/properties";

export const metadata: Metadata = { title: "Favorites", robots: { index: false } };

export default async function FavoritesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/favorites");

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      property: {
        include: {
          images: { orderBy: { position: "asc" }, take: 1, select: { url: true, alt: true } },
          favorites: { where: { userId: user.id }, select: { id: true } },
        },
      },
    },
  });
  const properties = favorites.map((favorite) => toPropertyCard(favorite.property));

  return (
    <div className="container-page flex flex-col gap-8 py-10">
      <PageHeader title="Saved properties" description={`${properties.length} ${properties.length === 1 ? "property" : "properties"} you have saved. Sold or withdrawn listings stay here so you can track them.`} />
      {properties.length === 0 ? (
        <EmptyState
          icon={<Heart />}
          title="No saved properties yet"
          description="Tap the heart on any listing to keep it here for later."
          action={
            <Button asChild>
              <Link href="/properties">Browse properties</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} signedIn showStatus />
          ))}
        </div>
      )}
    </div>
  );
}

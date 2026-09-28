import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const properties = await prisma.property.findMany({
    where: { status: { in: ["ACTIVE", "UNDER_OFFER"] } },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 5000,
  });
  return [
    { url: absoluteUrl("/"), lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/properties"), lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: absoluteUrl("/properties?listingType=SALE"), changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/properties?listingType=RENT"), changeFrequency: "daily", priority: 0.8 },
    ...properties.map((property) => ({
      url: absoluteUrl(`/properties/${property.slug}`),
      lastModified: property.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}

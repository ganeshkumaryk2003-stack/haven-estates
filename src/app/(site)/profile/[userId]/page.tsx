import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Building2, CalendarDays, Globe, MapPin, MessageSquare, Phone } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PropertyCard } from "@/components/properties/property-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { UserAvatar } from "@/components/ui/user-avatar";
import { getCurrentUser } from "@/lib/auth/session";
import { APP_NAME, ROLE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { toPropertyCard } from "@/server/services/properties";
import { getPublicProfile } from "@/server/services/users";

interface PageProps {
  params: Promise<{ userId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { userId } = await params;
  const profile = await getPublicProfile(userId);
  return { title: profile ? `${profile.name ?? "Member"} · Profile` : "Profile", robots: { index: false } };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { userId } = await params;
  const [profile, viewer] = await Promise.all([getPublicProfile(userId), getCurrentUser()]);
  if (!profile) notFound();

  const listings = await prisma.property.findMany({
    where: { ownerId: userId, status: { in: ["ACTIVE", "UNDER_OFFER", "RESERVED"] } },
    orderBy: { publishedAt: "desc" },
    take: 12,
    include: {
      images: { orderBy: { position: "asc" }, take: 1, select: { url: true, alt: true } },
      favorites: { where: { userId: viewer?.id ?? "__anonymous__" }, select: { id: true } },
    },
  });
  const isSelf = viewer?.id === profile.id;

  return (
    <div className="container-page flex flex-col gap-8 py-10">
      <Card>
        <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <UserAvatar name={profile.name} image={profile.image} className="size-24 text-2xl" />
          <div className="flex flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{profile.name ?? `${APP_NAME} member`}</h1>
              <Badge variant="secondary">{ROLE_LABELS[profile.role]}</Badge>
              {profile.emailVerified ? (
                <Badge variant="success">
                  <BadgeCheck /> Verified
                </Badge>
              ) : null}
            </div>
            {profile.profile?.bio ? <p className="max-w-2xl text-sm text-muted-foreground">{profile.profile.bio}</p> : null}
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              {profile.profile?.company ? (
                <li className="flex items-center gap-1.5">
                  <Building2 className="size-4" aria-hidden="true" /> {profile.profile.company}
                </li>
              ) : null}
              {profile.profile?.location ? (
                <li className="flex items-center gap-1.5">
                  <MapPin className="size-4" aria-hidden="true" /> {profile.profile.location}
                </li>
              ) : null}
              {profile.profile?.website ? (
                <li className="flex items-center gap-1.5">
                  <Globe className="size-4" aria-hidden="true" />
                  <a href={profile.profile.website} target="_blank" rel="noopener noreferrer nofollow" className="hover:underline">
                    Website
                  </a>
                </li>
              ) : null}
              {viewer && profile.profile?.phone ? (
                <li className="flex items-center gap-1.5">
                  <Phone className="size-4" aria-hidden="true" /> {profile.profile.phone}
                </li>
              ) : null}
              <li className="flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden="true" /> Joined {formatDate(profile.createdAt, "MMMM yyyy")}
              </li>
            </ul>
          </div>
          <div className="flex gap-2">
            {isSelf ? (
              <Button asChild variant="outline">
                <Link href="/settings/profile">Edit profile</Link>
              </Button>
            ) : viewer ? (
              <Button asChild variant="outline">
                <Link href={`/messages?to=${profile.id}`}>
                  <MessageSquare /> Message
                </Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-4">
        <PageHeader title={`Active listings (${profile._count.properties})`} />
        {listings.length === 0 ? (
          <EmptyState title="No active listings" description={isSelf ? "Publish your first listing to see it here." : "This member has no live listings right now."} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {listings.map((property) => (
              <PropertyCard key={property.id} property={toPropertyCard(property)} signedIn={Boolean(viewer)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

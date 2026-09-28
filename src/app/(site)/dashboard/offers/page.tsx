import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OfferList } from "@/components/dashboard/offer-list";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser } from "@/lib/auth/session";
import { stripeConfigured } from "@/lib/env";
import { listOffers } from "@/server/services/offers";

export const metadata: Metadata = { title: "Offers", robots: { index: false } };

export default async function OffersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard/offers");
  const { tab } = await searchParams;
  const [received, made] = await Promise.all([listOffers(user.id, "seller"), listOffers(user.id, "buyer")]);
  const active = tab === "made" ? "made" : received.length === 0 && made.length > 0 ? "made" : "received";

  return (
    <>
      <PageHeader
        title="Offers"
        description="Offers are not legally binding. Once an offer is accepted the buyer can reserve the property by paying the deposit through Stripe; the sale itself completes offline."
      />
      <Tabs defaultValue={active}>
        <TabsList>
          <TabsTrigger value="received" asChild>
            <Link href="/dashboard/offers?tab=received">Received ({received.length})</Link>
          </TabsTrigger>
          <TabsTrigger value="made" asChild>
            <Link href="/dashboard/offers?tab=made">Made ({made.length})</Link>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="received" className="pt-4">
          <OfferList offers={received} role="seller" stripeEnabled={stripeConfigured} />
        </TabsContent>
        <TabsContent value="made" className="pt-4">
          <OfferList offers={made} role="buyer" stripeEnabled={stripeConfigured} />
        </TabsContent>
      </Tabs>
    </>
  );
}

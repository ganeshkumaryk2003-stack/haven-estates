import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EnquiryList } from "@/components/dashboard/enquiry-list";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser } from "@/lib/auth/session";
import { listEnquiries } from "@/server/services/enquiries";

export const metadata: Metadata = { title: "Enquiries", robots: { index: false } };

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard/enquiries");
  const { tab } = await searchParams;
  const [received, sent] = await Promise.all([listEnquiries(user.id, "received"), listEnquiries(user.id, "sent")]);
  const active = tab === "sent" ? "sent" : "received";

  return (
    <>
      <PageHeader title="Enquiries" description="Questions from buyers about your listings, and the enquiries you've sent to sellers." />
      <Tabs defaultValue={active}>
        <TabsList>
          <TabsTrigger value="received" asChild>
            <Link href="/dashboard/enquiries?tab=received">Received ({received.length})</Link>
          </TabsTrigger>
          <TabsTrigger value="sent" asChild>
            <Link href="/dashboard/enquiries?tab=sent">Sent ({sent.length})</Link>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="received" className="pt-4">
          <EnquiryList enquiries={received} direction="received" />
        </TabsContent>
        <TabsContent value="sent" className="pt-4">
          <EnquiryList enquiries={sent} direction="sent" />
        </TabsContent>
      </Tabs>
    </>
  );
}

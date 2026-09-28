import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ConnectionList } from "@/components/dashboard/connection-list";
import { PageHeader } from "@/components/layout/page-header";
import { getCurrentUser } from "@/lib/auth/session";
import { listConnections } from "@/server/services/connections";

export const metadata: Metadata = { title: "My connections", robots: { index: false } };

export default async function ConnectionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard/connections");
  const connections = await listConnections(user.id);
  return (
    <>
      <PageHeader title="My connections" description="Everyone you have enquired with, messaged or exchanged offers with. Archive quiet connections or block anyone you no longer want to hear from." />
      <ConnectionList connections={connections} />
    </>
  );
}

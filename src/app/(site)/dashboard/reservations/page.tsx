import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ReservationList } from "@/components/dashboard/reservation-list";
import { PageHeader } from "@/components/layout/page-header";
import { FormError, FormSuccess } from "@/components/ui/form-field";
import { getCurrentUser } from "@/lib/auth/session";
import { stripeConfigured } from "@/lib/env";
import { listReservations } from "@/server/services/reservations";

export const metadata: Metadata = { title: "Reservations", robots: { index: false } };

export default async function ReservationsPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard/reservations");
  const { checkout } = await searchParams;
  const reservations = await listReservations(user.id);

  return (
    <>
      <PageHeader title="Reservations" description="Reservation deposits are collected by Stripe in test mode. A reservation holds the property while the legal purchase or lease is completed offline." />
      {checkout === "success" ? (
        <FormSuccess message="Thanks! Your payment is being confirmed. The status below updates automatically once Stripe notifies us (usually within a few seconds)." />
      ) : null}
      {checkout === "cancelled" ? <FormError message="Checkout was cancelled. You can pay the deposit whenever you're ready." /> : null}
      {!stripeConfigured ? <FormError message="Stripe keys are not configured on this server, so deposit payments are disabled. See .env.example." /> : null}
      <ReservationList reservations={reservations} currentUserId={user.id} stripeEnabled={stripeConfigured} />
    </>
  );
}

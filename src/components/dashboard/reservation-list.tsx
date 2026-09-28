"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Receipt } from "lucide-react";
import { toast } from "sonner";
import { ReserveButton } from "@/components/properties/reserve-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatDateTime, formatMoney, formatRelative } from "@/lib/format";
import { cancelReservationAction } from "@/server/actions/engagement";
import type { ReservationDTO } from "@/types/dto";

export const RESERVATION_STATUS_LABELS: Record<ReservationDTO["status"], string> = {
  PENDING_PAYMENT: "Awaiting deposit",
  DEPOSIT_PAID: "Deposit paid",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

const STATUS_VARIANTS: Record<ReservationDTO["status"], "default" | "success" | "secondary" | "muted" | "destructive"> = {
  PENDING_PAYMENT: "default",
  DEPOSIT_PAID: "success",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
  EXPIRED: "muted",
};

export function ReservationList({ reservations, currentUserId, stripeEnabled }: { reservations: ReservationDTO[]; currentUserId: string; stripeEnabled: boolean }) {
  const router = useRouter();
  const [reason, setReason] = React.useState("");
  const [pending, setPending] = React.useState<string | null>(null);

  async function cancel(reservationId: string) {
    setPending(reservationId);
    const result = await cancelReservationAction(reservationId, reason);
    setPending(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Reservation cancelled");
    setReason("");
    router.refresh();
  }

  if (reservations.length === 0) {
    return <EmptyState icon={<Receipt />} title="No reservations yet" description="When an offer is accepted, the buyer can reserve the property by paying a deposit. Reservations appear here for both parties." />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {reservations.map((reservation) => {
        const isBuyer = reservation.buyer.id === currentUserId;
        const other = isBuyer ? reservation.seller : reservation.buyer;
        const latestPayment = reservation.payments[0];
        return (
          <li key={reservation.id} className="flex flex-col gap-4 rounded-xl border bg-card p-4 lg:flex-row lg:items-start">
            <Link href={`/properties/${reservation.property.slug}`} className="relative h-24 w-full shrink-0 overflow-hidden rounded-lg bg-muted lg:w-36">
              {reservation.property.coverImage ? <Image src={reservation.property.coverImage} alt="" fill sizes="144px" className="object-cover" /> : null}
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/properties/${reservation.property.slug}`} className="font-medium hover:underline">
                  {reservation.property.title}
                </Link>
                <Badge variant={STATUS_VARIANTS[reservation.status]}>{RESERVATION_STATUS_LABELS[reservation.status]}</Badge>
                <span className="font-mono text-xs text-muted-foreground">{reservation.reference}</span>
              </div>
              <div className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">Agreed price:</span> <strong>{formatMoney(reservation.offer.counterAmount ?? reservation.offer.amount, reservation.currency)}</strong>
                </p>
                <p>
                  <span className="text-muted-foreground">Deposit:</span> <strong>{formatMoney(reservation.depositAmount, reservation.currency)}</strong>
                </p>
                <p>
                  <span className="text-muted-foreground">Created:</span> {formatRelative(reservation.createdAt)}
                </p>
                {reservation.paidAt ? (
                  <p>
                    <span className="text-muted-foreground">Paid:</span> {formatDateTime(reservation.paidAt)}
                  </p>
                ) : null}
                {reservation.completedAt ? (
                  <p>
                    <span className="text-muted-foreground">Completed:</span> {formatDateTime(reservation.completedAt)}
                  </p>
                ) : null}
                {reservation.cancelledAt ? (
                  <p>
                    <span className="text-muted-foreground">Cancelled:</span> {formatDateTime(reservation.cancelledAt)}
                  </p>
                ) : null}
              </div>
              {latestPayment ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Last payment attempt: {latestPayment.status.toLowerCase()} · {formatRelative(latestPayment.createdAt)}
                  {latestPayment.receiptUrl ? (
                    <>
                      {" · "}
                      <a href={latestPayment.receiptUrl} target="_blank" rel="noopener noreferrer" className="underline">
                        Receipt
                      </a>
                    </>
                  ) : null}
                </p>
              ) : null}
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <UserAvatar name={other.name} image={other.image} className="size-5 text-[9px]" />
                {isBuyer ? "Seller" : "Buyer"}:{" "}
                <Link href={`/profile/${other.id}`} className="hover:underline">
                  {other.name ?? "Haven user"}
                </Link>
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 lg:w-48">
              {isBuyer && reservation.status === "PENDING_PAYMENT" ? (
                stripeEnabled ? <ReserveButton offerId={reservation.offer.id} size="sm" label="Pay deposit" /> : <p className="text-xs text-muted-foreground">Payments not configured.</p>
              ) : null}
              {reservation.status === "PENDING_PAYMENT" ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" disabled={pending === reservation.id}>
                      Cancel reservation
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel this reservation?</AlertDialogTitle>
                      <AlertDialogDescription>The listing goes back on the market and the accepted offer is withdrawn.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason (optional)" rows={3} aria-label="Cancellation reason" />
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(event) => {
                          event.preventDefault();
                          void cancel(reservation.id);
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Cancel reservation
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
              {reservation.status === "DEPOSIT_PAID" ? (
                <p className="text-xs text-muted-foreground">Deposit held. An administrator marks the transaction complete after conveyancing, or cancels it with a refund.</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { RESERVATION_STATUS_LABELS } from "@/components/dashboard/reservation-list";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatMoney } from "@/lib/format";
import { adminReservationAction } from "@/server/actions/admin";
import { listReservationsForAdmin } from "@/server/services/admin";

export const metadata: Metadata = { title: "Admin · Transactions", robots: { index: false } };

export default async function AdminTransactionsPage() {
  const reservations = await listReservationsForAdmin();
  const paidTotal = reservations.filter((row) => row.status === "DEPOSIT_PAID" || row.status === "COMPLETED").reduce((sum, row) => sum + Number(row.depositAmount), 0);

  return (
    <>
      <PageHeader
        title="Transactions"
        description={`Token deposits processed through Stripe. ${formatMoney(paidTotal)} collected across ${reservations.length} reservations. Mark a reservation complete once the sale agreement and registration are done, or cancel it (refunds are issued in the Stripe dashboard).`}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reference</TableHead>
            <TableHead>Property</TableHead>
            <TableHead>Buyer → Seller</TableHead>
            <TableHead className="text-right">Deposit</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last payment</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                No reservations yet.
              </TableCell>
            </TableRow>
          ) : null}
          {reservations.map((reservation) => {
            const payment = reservation.payments[0];
            return (
              <TableRow key={reservation.id}>
                <TableCell className="font-mono text-xs">{reservation.reference}</TableCell>
                <TableCell>
                  <Link href={`/properties/${reservation.property.slug}`} className="block max-w-56 truncate hover:underline">
                    {reservation.property.title}
                  </Link>
                  <span className="text-xs text-muted-foreground">{reservation.property.status.toLowerCase().replace("_", " ")}</span>
                </TableCell>
                <TableCell className="text-sm">
                  <p>{reservation.buyer.name ?? reservation.buyer.email}</p>
                  <p className="text-xs text-muted-foreground">→ {reservation.seller.name ?? reservation.seller.email}</p>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">{formatMoney(reservation.depositAmount.toString(), reservation.currency)}</TableCell>
                <TableCell>
                  <Badge variant={reservation.status === "DEPOSIT_PAID" ? "success" : reservation.status === "CANCELLED" ? "destructive" : "secondary"}>{RESERVATION_STATUS_LABELS[reservation.status]}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {payment ? (
                    <>
                      {payment.status.toLowerCase()} · {formatDateTime(payment.createdAt)}
                      {payment.stripePaymentIntentId ? <p className="font-mono">{payment.stripePaymentIntentId}</p> : null}
                    </>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {reservation.status === "DEPOSIT_PAID" ? (
                      <AdminActionButton
                        label="Mark complete"
                        confirm={{ title: "Complete this transaction?", description: "The property is marked sold/rented and both parties are notified." }}
                        action={adminReservationAction.bind(null, reservation.id, "complete")}
                        successMessage="Transaction completed"
                      />
                    ) : null}
                    {reservation.status === "PENDING_PAYMENT" || reservation.status === "DEPOSIT_PAID" ? (
                      <AdminActionButton
                        label="Cancel"
                        variant="outline"
                        confirm={{ title: "Cancel this reservation?", description: "The listing returns to active and the offer is withdrawn. Refund any paid deposit in the Stripe dashboard.", reasonLabel: "Reason (sent to both parties)", destructive: true }}
                        action={adminReservationAction.bind(null, reservation.id, "cancel")}
                        successMessage="Reservation cancelled"
                      />
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}

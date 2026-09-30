"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { HandCoins } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { ReserveButton } from "@/components/properties/reserve-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FormError, FormField, fieldA11y } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/user-avatar";
import { APP_NAME, DEFAULT_CURRENCY, FINANCING_LABELS } from "@/lib/constants";
import { formatDate, formatMoney, formatRelative } from "@/lib/format";
import { counterOfferAction, decideOfferAction } from "@/server/actions/engagement";
import type { OfferDTO } from "@/types/dto";
import { counterOfferSchema, type CounterOfferInput } from "@/validations/engagement";

const STATUS_VARIANTS: Record<OfferDTO["status"], "default" | "secondary" | "success" | "muted" | "destructive" | "warning"> = {
  PENDING: "default",
  COUNTERED: "warning",
  ACCEPTED: "success",
  REJECTED: "destructive",
  WITHDRAWN: "muted",
  EXPIRED: "muted",
};

interface OfferListProps {
  offers: OfferDTO[];
  role: "buyer" | "seller";
  stripeEnabled: boolean;
}

export function OfferList({ offers, role, stripeEnabled }: OfferListProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);
  const [countering, setCountering] = React.useState<OfferDTO | null>(null);

  async function decide(offerId: string, decision: "accept" | "reject" | "withdraw" | "accept_counter" | "reject_counter") {
    setPending(offerId);
    const result = await decideOfferAction({ offerId, decision });
    setPending(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Offer updated");
    router.refresh();
  }

  if (offers.length === 0) {
    return (
      <EmptyState
        icon={<HandCoins />}
        title={role === "seller" ? "No offers received yet" : "You haven't made any offers"}
        description={role === "seller" ? "Offers from buyers on your listings appear here for you to accept, counter or decline." : "Make an offer from any listing page and track its status here."}
      />
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {offers.map((offer) => {
          const other = role === "seller" ? offer.buyer : offer.seller;
          const isOpen = offer.status === "PENDING" || offer.status === "COUNTERED";
          const busy = pending === offer.id;
          return (
            <li key={offer.id} className="flex flex-col gap-4 rounded-xl border bg-card p-4 lg:flex-row lg:items-start">
              <Link href={`/properties/${offer.property.slug}`} className="relative h-24 w-full shrink-0 overflow-hidden rounded-lg bg-muted lg:w-36">
                {offer.property.coverImage ? <Image src={offer.property.coverImage} alt="" fill sizes="144px" className="object-cover" /> : null}
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/properties/${offer.property.slug}`} className="font-medium hover:underline">
                    {offer.property.title}
                  </Link>
                  <Badge variant={STATUS_VARIANTS[offer.status]}>{offer.status.toLowerCase()}</Badge>
                  <span className="text-xs text-muted-foreground">{formatRelative(offer.createdAt)}</span>
                </div>
                <div className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                  <p>
                    <span className="text-muted-foreground">Offer:</span> <strong>{formatMoney(offer.amount, offer.currency)}</strong>{" "}
                    <span className="text-xs text-muted-foreground">(asking {formatMoney(offer.property.price, offer.currency)})</span>
                  </p>
                  {offer.counterAmount ? (
                    <p>
                      <span className="text-muted-foreground">Counter:</span> <strong>{formatMoney(offer.counterAmount, offer.currency)}</strong>
                    </p>
                  ) : null}
                  <p>
                    <span className="text-muted-foreground">Financing:</span> {offer.financing ? FINANCING_LABELS[offer.financing] : "Not specified"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Valid until:</span> {formatDate(offer.expiresAt)}
                  </p>
                </div>
                {offer.conditions ? (
                  <p className="mt-2 text-sm">
                    <span className="text-muted-foreground">Conditions:</span> {offer.conditions}
                  </p>
                ) : null}
                {offer.message ? <p className="mt-1 text-sm text-muted-foreground">“{offer.message}”</p> : null}
                {offer.counterMessage ? <p className="mt-1 text-sm text-muted-foreground">Seller: “{offer.counterMessage}”</p> : null}
                <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UserAvatar name={other.name} image={other.image} className="size-5 text-[9px]" />
                  {role === "seller" ? "From" : "To"}{" "}
                  <Link href={`/profile/${other.id}`} className="hover:underline">
                    {other.name ?? `${APP_NAME} user`}
                  </Link>
                  <span aria-hidden="true">·</span>
                  <Link href={`/messages?to=${other.id}&property=${offer.property.id}`} className="hover:underline">
                    Message
                  </Link>
                </p>
              </div>

              <div className="flex shrink-0 flex-col gap-2 lg:w-48">
                {role === "seller" && offer.status === "PENDING" ? (
                  <>
                    <Button size="sm" onClick={() => void decide(offer.id, "accept")} loading={busy}>
                      Accept
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setCountering(offer)} disabled={busy}>
                      Counter
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void decide(offer.id, "reject")} disabled={busy}>
                      Decline
                    </Button>
                  </>
                ) : null}
                {role === "seller" && offer.status === "COUNTERED" ? <p className="text-xs text-muted-foreground">Waiting for the buyer to respond to your counteroffer.</p> : null}
                {role === "buyer" && offer.status === "COUNTERED" ? (
                  <>
                    <Button size="sm" onClick={() => void decide(offer.id, "accept_counter")} loading={busy}>
                      Accept counter
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void decide(offer.id, "reject_counter")} disabled={busy}>
                      Decline counter
                    </Button>
                  </>
                ) : null}
                {role === "buyer" && isOpen ? (
                  <Button size="sm" variant="outline" onClick={() => void decide(offer.id, "withdraw")} disabled={busy}>
                    Withdraw offer
                  </Button>
                ) : null}
                {role === "buyer" && offer.status === "ACCEPTED" ? (
                  offer.reservationId ? (
                    <Button asChild size="sm" variant="secondary">
                      <Link href="/dashboard/reservations">View reservation</Link>
                    </Button>
                  ) : stripeEnabled ? (
                    <ReserveButton offerId={offer.id} size="sm" label="Reserve & pay deposit" />
                  ) : (
                    <p className="text-xs text-muted-foreground">Payments are not configured on this server.</p>
                  )
                ) : null}
                {role === "seller" && offer.status === "ACCEPTED" ? (
                  <p className="text-xs text-muted-foreground">{offer.reservationId ? "Reservation in progress." : "Accepted - waiting for the buyer to pay the deposit."}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <CounterOfferDialog offer={countering} onClose={() => setCountering(null)} />
    </>
  );
}

function CounterOfferDialog({ offer, onClose }: { offer: OfferDTO | null; onClose: () => void }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<z.input<typeof counterOfferSchema>, unknown, CounterOfferInput>({
    resolver: zodResolver(counterOfferSchema),
    values: offer ? { offerId: offer.id, counterAmount: offer.property.price, counterMessage: "" } : undefined,
  });

  async function onSubmit(values: CounterOfferInput) {
    setError(null);
    const result = await counterOfferAction(values);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Counteroffer sent");
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={offer !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Counter this offer</DialogTitle>
          <DialogDescription>{offer ? `The buyer offered ${formatMoney(offer.amount, offer.currency)} on ${offer.property.title}.` : null}</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <FormError message={error} />
          <input type="hidden" {...form.register("offerId")} />
          <FormField id="counter-amount" label={`Counter amount (${offer?.currency ?? DEFAULT_CURRENCY})`} error={form.formState.errors.counterAmount?.message} required>
            <Input type="number" min={1} step="1" inputMode="decimal" {...fieldA11y("counter-amount", form.formState.errors.counterAmount?.message)} {...form.register("counterAmount")} />
          </FormField>
          <FormField id="counter-message" label="Message (optional)" error={form.formState.errors.counterMessage?.message}>
            <Textarea rows={3} {...fieldA11y("counter-message", form.formState.errors.counterMessage?.message)} {...form.register("counterMessage")} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              Send counteroffer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

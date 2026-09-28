"use client";

import * as React from "react";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { startCheckoutAction } from "@/server/actions/engagement";

interface ReserveButtonProps extends ButtonProps {
  offerId: string;
  label?: string;
}

// Starts a Stripe Checkout session for the accepted offer's reservation deposit.
export function ReserveButton({ offerId, label = "Pay reservation deposit", ...props }: ReserveButtonProps) {
  const [pending, setPending] = React.useState(false);
  async function reserve() {
    setPending(true);
    const result = await startCheckoutAction(offerId);
    if (!result.ok) {
      setPending(false);
      toast.error(result.error);
      return;
    }
    window.location.assign(result.data.url);
  }
  return (
    <Button type="button" onClick={reserve} loading={pending} {...props}>
      <CreditCard /> {label}
    </Button>
  );
}

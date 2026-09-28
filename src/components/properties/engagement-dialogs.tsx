"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, format } from "date-fns";
import { Flag, HandCoins, Mail, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FormError, FormField, fieldA11y } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CONTACT_METHODS, CONTACT_METHOD_LABELS, FINANCING_LABELS, FINANCING_METHODS, REPORT_REASONS, REPORT_REASON_LABELS } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { createEnquiryAction, createOfferAction, reportPropertyAction } from "@/server/actions/engagement";
import { startConversationAction } from "@/server/actions/messaging";
import type { PropertyDetailDTO } from "@/types/dto";
import { enquirySchema, offerSchema, reportSchema, startConversationSchema, type EnquiryInput, type OfferInput, type ReportInput, type StartConversationInput } from "@/validations/engagement";
import { z } from "zod";

interface DialogProps {
  property: PropertyDetailDTO;
  triggerProps?: ButtonProps;
}

function useGate(signedIn: boolean, verified: boolean) {
  const router = useRouter();
  return (open: () => void) => {
    if (!signedIn) {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (!verified) {
      toast.error("Verify your email address first. You can resend the link from account settings.", {
        action: { label: "Settings", onClick: () => router.push("/settings/account") },
      });
      return;
    }
    open();
  };
}

// ---------------------------------------------------------------------------
// Enquiry
// ---------------------------------------------------------------------------

export function EnquiryDialog({ property, signedIn, verified, triggerProps }: DialogProps & { signedIn: boolean; verified: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const gate = useGate(signedIn, verified);
  const form = useForm<z.input<typeof enquirySchema>, unknown, EnquiryInput>({
    resolver: zodResolver(enquirySchema),
    defaultValues: {
      propertyId: property.id,
      subject: `Enquiry about ${property.title}`,
      message: `Hi, I'm interested in ${property.title} in ${property.city}. Is it still available and could we arrange a viewing?`,
      phone: "",
      preferredContact: "EMAIL",
    },
  });
  const errors = form.formState.errors;

  async function onSubmit(values: EnquiryInput) {
    setError(null);
    const result = await createEnquiryAction(values);
    if (!result.ok) {
      setError(result.error);
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) form.setError(field as keyof EnquiryInput, { message: messages[0] });
      return;
    }
    toast.success("Enquiry sent. The seller will get back to you.");
    setOpen(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" {...triggerProps} onClick={() => gate(() => setOpen(true))}>
        <Mail /> Enquire
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enquire about this property</DialogTitle>
          <DialogDescription>Your message goes straight to {property.owner.name ?? "the seller"}. They can reply by your preferred method.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <FormError message={error} />
          <input type="hidden" {...form.register("propertyId")} />
          <FormField id="enquiry-subject" label="Subject" error={errors.subject?.message} required>
            <Input {...fieldA11y("enquiry-subject", errors.subject?.message)} {...form.register("subject")} />
          </FormField>
          <FormField id="enquiry-message" label="Message" error={errors.message?.message} required>
            <Textarea rows={5} {...fieldA11y("enquiry-message", errors.message?.message)} {...form.register("message")} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="enquiry-phone" label="Phone (optional)" error={errors.phone?.message}>
              <Input type="tel" autoComplete="tel" {...fieldA11y("enquiry-phone", errors.phone?.message)} {...form.register("phone")} />
            </FormField>
            <FormField id="enquiry-contact" label="Preferred contact" error={errors.preferredContact?.message}>
              <Controller
                control={form.control}
                name="preferredContact"
                render={({ field }) => (
                  <Select value={field.value ?? "EMAIL"} onValueChange={field.onChange}>
                    <SelectTrigger id="enquiry-contact">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTACT_METHODS.map((method) => (
                        <SelectItem key={method} value={method}>
                          {CONTACT_METHOD_LABELS[method]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              Send enquiry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Message seller
// ---------------------------------------------------------------------------

export function MessageSellerDialog({ property, signedIn, verified, triggerProps }: DialogProps & { signedIn: boolean; verified: boolean }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const gate = useGate(signedIn, verified);
  const form = useForm<StartConversationInput>({
    resolver: zodResolver(startConversationSchema),
    defaultValues: { recipientId: property.owner.id, propertyId: property.id, body: "" },
  });

  async function onSubmit(values: StartConversationInput) {
    setError(null);
    const result = await startConversationAction(values);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.push(`/messages/${result.data.conversationId}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" {...triggerProps} onClick={() => gate(() => setOpen(true))}>
        <MessageSquare /> Message
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Message {property.owner.name ?? "the seller"}</DialogTitle>
          <DialogDescription>Start a real-time conversation about {property.title}. You can attach photos and documents later.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <FormError message={error} />
          <FormField id="message-body" label="Your message" error={form.formState.errors.body?.message} required>
            <Textarea rows={5} placeholder="Hi! I'd love to know more about…" {...fieldA11y("message-body", form.formState.errors.body?.message)} {...form.register("body")} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              Send message
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Offer
// ---------------------------------------------------------------------------

export function OfferDialog({ property, signedIn, verified, triggerProps }: DialogProps & { signedIn: boolean; verified: boolean }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const gate = useGate(signedIn, verified);
  const form = useForm<z.input<typeof offerSchema>, unknown, OfferInput>({
    resolver: zodResolver(offerSchema),
    defaultValues: {
      propertyId: property.id,
      amount: property.price,
      financing: "",
      conditions: "",
      message: "",
      expiresAt: format(addDays(new Date(), 7), "yyyy-MM-dd"),
    },
  });
  const errors = form.formState.errors;

  async function onSubmit(values: OfferInput) {
    setError(null);
    const result = await createOfferAction(values);
    if (!result.ok) {
      setError(result.error);
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) form.setError(field as keyof OfferInput, { message: messages[0] });
      return;
    }
    toast.success("Offer submitted. We'll notify you when the seller responds.");
    setOpen(false);
    router.push("/dashboard/offers");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="secondary" {...triggerProps} onClick={() => gate(() => setOpen(true))}>
        <HandCoins /> Make an offer
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Make an offer</DialogTitle>
          <DialogDescription>
            Asking price {formatMoney(property.price, property.currency)}. If accepted, you can reserve the property with a {formatMoney(property.depositAmount, property.currency)} deposit.
            The offer is not legally binding; conveyancing happens offline.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <FormError message={error} />
          <input type="hidden" {...form.register("propertyId")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="offer-amount" label={`Offer amount (${property.currency})`} error={errors.amount?.message} required>
              <Input type="number" min={1} step="1" inputMode="decimal" {...fieldA11y("offer-amount", errors.amount?.message)} {...form.register("amount")} />
            </FormField>
            <FormField id="offer-expires" label="Offer valid until" error={errors.expiresAt?.message} required>
              <Input type="date" min={format(addDays(new Date(), 1), "yyyy-MM-dd")} {...fieldA11y("offer-expires", errors.expiresAt?.message)} {...form.register("expiresAt")} />
            </FormField>
          </div>
          <FormField id="offer-financing" label="Financing (optional)" error={errors.financing?.message}>
            <Controller
              control={form.control}
              name="financing"
              render={({ field }) => (
                <Select value={field.value || "none"} onValueChange={(value) => field.onChange(value === "none" ? "" : value)}>
                  <SelectTrigger id="offer-financing">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Prefer not to say</SelectItem>
                    {FINANCING_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {FINANCING_LABELS[method]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField id="offer-conditions" label="Conditions (optional)" error={errors.conditions?.message} description="e.g. subject to survey, mortgage approval, completion date">
            <Textarea rows={3} {...fieldA11y("offer-conditions", errors.conditions?.message, true)} {...form.register("conditions")} />
          </FormField>
          <FormField id="offer-message" label="Message to the seller (optional)" error={errors.message?.message}>
            <Textarea rows={3} {...fieldA11y("offer-message", errors.message?.message)} {...form.register("message")} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              Submit offer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

export function ReportDialog({ property, signedIn }: DialogProps & { signedIn: boolean }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<z.input<typeof reportSchema>, unknown, ReportInput>({
    resolver: zodResolver(reportSchema),
    defaultValues: { propertyId: property.id, reason: "INACCURATE", details: "" },
  });

  async function onSubmit(values: ReportInput) {
    setError(null);
    const result = await reportPropertyAction(values);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Thanks, our team will review this listing.");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={(event) => {
            if (!signedIn) {
              event.preventDefault();
              router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
            }
          }}
        >
          <Flag /> Report listing
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this listing</DialogTitle>
          <DialogDescription>Reports are reviewed by moderators. The seller is not told who reported the listing.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <FormError message={error} />
          <FormField id="report-reason" label="Reason" required>
            <Controller
              control={form.control}
              name="reason"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="report-reason">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_REASONS.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {REPORT_REASON_LABELS[reason]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField id="report-details" label="Details (optional)" error={form.formState.errors.details?.message}>
            <Textarea rows={4} {...fieldA11y("report-details", form.formState.errors.details?.message)} {...form.register("details")} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" loading={form.formState.isSubmitting}>
              Submit report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

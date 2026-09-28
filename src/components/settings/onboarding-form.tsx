"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { FormError, FormField, fieldA11y } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/misc";
import { ROLE_LABELS } from "@/lib/constants";
import { completeOnboardingAction } from "@/server/actions/profile";
import { onboardingSchema, type OnboardingFormValues, type OnboardingInput } from "@/validations/profile";

export function OnboardingForm({ defaults, callbackUrl }: { defaults: Partial<OnboardingFormValues>; callbackUrl: string }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<OnboardingFormValues, unknown, OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { name: defaults.name ?? "", role: defaults.role ?? "BUYER", phone: defaults.phone ?? "", location: defaults.location ?? "", company: defaults.company ?? "" },
  });
  const errors = form.formState.errors;
  const role = useWatch({ control: form.control, name: "role" });

  async function onSubmit(values: OnboardingInput) {
    setError(null);
    const result = await completeOnboardingAction(values);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <FormError message={error} />
      <FormField id="name" label="Your name" error={errors.name?.message} required>
        <Input autoComplete="name" {...fieldA11y("name", errors.name?.message)} {...form.register("name")} />
      </FormField>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">I mostly want to…</legend>
        <Controller
          control={form.control}
          name="role"
          render={({ field }) => (
            <RadioGroup value={field.value} onValueChange={field.onChange} className="grid gap-2 sm:grid-cols-3">
              {(["BUYER", "SELLER", "AGENT"] as const).map((value) => (
                <Label
                  key={value}
                  htmlFor={`onboarding-role-${value}`}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent/50"
                >
                  <RadioGroupItem value={value} id={`onboarding-role-${value}`} />
                  {value === "BUYER" ? "Buy or rent" : value === "SELLER" ? "Sell or let" : ROLE_LABELS[value]}
                </Label>
              ))}
            </RadioGroup>
          )}
        />
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="phone" label="Phone (optional)" error={errors.phone?.message}>
          <Input type="tel" autoComplete="tel" {...fieldA11y("phone", errors.phone?.message)} {...form.register("phone")} />
        </FormField>
        <FormField id="location" label="Location (optional)" error={errors.location?.message}>
          <Input placeholder="City, State" {...fieldA11y("location", errors.location?.message)} {...form.register("location")} />
        </FormField>
        {role !== "BUYER" ? (
          <FormField id="company" label="Agency or company (optional)" error={errors.company?.message} className="sm:col-span-2">
            <Input autoComplete="organization" {...fieldA11y("company", errors.company?.message)} {...form.register("company")} />
          </FormField>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" onClick={() => router.push(callbackUrl)}>
          Skip for now
        </Button>
        <Button type="submit" loading={form.formState.isSubmitting}>
          Continue
        </Button>
      </div>
    </form>
  );
}

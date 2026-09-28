"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormError, FormField, fieldA11y } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem, Separator } from "@/components/ui/misc";
import { signupAction } from "@/server/actions/auth";
import { signupSchema, type SignupFormValues, type SignupInput } from "@/validations/auth";

const ROLE_OPTIONS = [
  { value: "BUYER", label: "I'm looking to buy or rent", description: "Save homes, enquire, make offers." },
  { value: "SELLER", label: "I'm selling or renting out", description: "List properties and manage offers." },
  { value: "AGENT", label: "I'm an agent", description: "Manage listings on behalf of clients." },
] as const;

export function SignupForm({ callbackUrl, googleEnabled }: { callbackUrl?: string; googleEnabled: boolean }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<SignupFormValues, unknown, SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "", role: "BUYER", acceptTerms: false },
  });
  const errors = form.formState.errors;

  async function onSubmit(values: SignupInput) {
    setError(null);
    const result = await signupAction(values);
    if (!result.ok) {
      setError(result.error);
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        form.setError(field as keyof SignupFormValues, { message: messages[0] });
      }
      return;
    }
    router.push(callbackUrl && callbackUrl.startsWith("/") ? `/onboarding?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/onboarding");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>Join Haven to browse, enquire, list and make offers.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <FormError message={error} />
          <FormField id="name" label="Full name" error={errors.name?.message} required>
            <Input autoComplete="name" placeholder="Alex Morgan" {...fieldA11y("name", errors.name?.message)} {...form.register("name")} />
          </FormField>
          <FormField id="email" label="Email" error={errors.email?.message} required>
            <Input type="email" autoComplete="email" placeholder="you@example.com" {...fieldA11y("email", errors.email?.message)} {...form.register("email")} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="password" label="Password" error={errors.password?.message} description="8+ characters with upper, lower case and a number." required>
              <Input type="password" autoComplete="new-password" {...fieldA11y("password", errors.password?.message, true)} {...form.register("password")} />
            </FormField>
            <FormField id="confirmPassword" label="Confirm password" error={errors.confirmPassword?.message} required>
              <Input type="password" autoComplete="new-password" {...fieldA11y("confirmPassword", errors.confirmPassword?.message)} {...form.register("confirmPassword")} />
            </FormField>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">How will you use Haven?</legend>
            <Controller
              control={form.control}
              name="role"
              render={({ field }) => (
                <RadioGroup value={field.value} onValueChange={field.onChange} className="gap-2">
                  {ROLE_OPTIONS.map((option) => (
                    <Label
                      key={option.value}
                      htmlFor={`role-${option.value}`}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent/50"
                    >
                      <RadioGroupItem value={option.value} id={`role-${option.value}`} className="mt-0.5" />
                      <span className="flex flex-col gap-0.5">
                        <span className="font-medium">{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </span>
                    </Label>
                  ))}
                </RadioGroup>
              )}
            />
          </fieldset>
          <div className="flex flex-col gap-1">
            <Controller
              control={form.control}
              name="acceptTerms"
              render={({ field }) => (
                <div className="flex items-start gap-2">
                  <Checkbox id="acceptTerms" checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} aria-invalid={Boolean(errors.acceptTerms)} />
                  <Label htmlFor="acceptTerms" className="text-sm font-normal leading-snug">
                    I agree to the terms of service and understand this is a demo marketplace.
                  </Label>
                </div>
              )}
            />
            {errors.acceptTerms ? (
              <p role="alert" className="text-xs font-medium text-destructive">
                {errors.acceptTerms.message}
              </p>
            ) : null}
          </div>
          <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
            Create account
          </Button>
        </form>
        {googleEnabled ? (
          <>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Separator className="flex-1" /> or <Separator className="flex-1" />
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={() => void signIn("google", { callbackUrl: "/onboarding" })}>
              Continue with Google
            </Button>
          </>
        ) : null}
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

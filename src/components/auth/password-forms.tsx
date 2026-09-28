"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormError, FormField, FormSuccess, fieldA11y } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { forgotPasswordAction, resetPasswordAction } from "@/server/actions/auth";
import { forgotPasswordSchema, resetPasswordSchema, type ForgotPasswordInput, type ResetPasswordInput } from "@/validations/auth";

export function ForgotPasswordForm() {
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);
  const form = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });

  async function onSubmit(values: ForgotPasswordInput) {
    setError(null);
    const result = await forgotPasswordAction(values);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSent(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Reset your password</CardTitle>
        <CardDescription>Enter your email and we&apos;ll send a link to choose a new password.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {sent ? (
          <FormSuccess message="If an account exists for that email, a reset link is on its way. It expires in 1 hour." />
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <FormError message={error} />
            <FormField id="email" label="Email" error={form.formState.errors.email?.message} required>
              <Input type="email" autoComplete="email" {...fieldA11y("email", form.formState.errors.email?.message)} {...form.register("email")} />
            </FormField>
            <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
              Send reset link
            </Button>
          </form>
        )}
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Back to log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { token, password: "", confirmPassword: "" } });
  const errors = form.formState.errors;

  async function onSubmit(values: ResetPasswordInput) {
    setError(null);
    const result = await resetPasswordAction(values);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/login?notice=password-reset");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Choose a new password</CardTitle>
        <CardDescription>Use at least 8 characters with upper and lower case letters and a number.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <FormError message={error} />
          <input type="hidden" {...form.register("token")} />
          <FormField id="password" label="New password" error={errors.password?.message} required>
            <Input type="password" autoComplete="new-password" {...fieldA11y("password", errors.password?.message)} {...form.register("password")} />
          </FormField>
          <FormField id="confirmPassword" label="Confirm new password" error={errors.confirmPassword?.message} required>
            <Input type="password" autoComplete="new-password" {...fieldA11y("confirmPassword", errors.confirmPassword?.message)} {...form.register("confirmPassword")} />
          </FormField>
          <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
            Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

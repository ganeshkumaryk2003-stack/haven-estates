"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormError, FormField, FormSuccess, fieldA11y } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/misc";
import { loginAction } from "@/server/actions/auth";
import { loginSchema, type LoginInput } from "@/validations/auth";

interface LoginFormProps {
  callbackUrl?: string;
  googleEnabled: boolean;
  notice?: string | null;
}

export function LoginForm({ callbackUrl, googleEnabled, notice }: LoginFormProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  async function onSubmit(values: LoginInput) {
    setError(null);
    const result = await loginAction(values, callbackUrl);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(result.data.redirectTo);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to manage listings, messages and offers.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <FormSuccess message={notice} />
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <FormError message={error} />
          <FormField id="email" label="Email" error={form.formState.errors.email?.message} required>
            <Input type="email" autoComplete="email" placeholder="e.g. rahul.sharma@gmail.com" {...fieldA11y("email", form.formState.errors.email?.message)} {...form.register("email")} />
          </FormField>
          <FormField id="password" label="Password" error={form.formState.errors.password?.message} required>
            <Input type="password" autoComplete="current-password" {...fieldA11y("password", form.formState.errors.password?.message)} {...form.register("password")} />
          </FormField>
          <div className="flex items-center justify-between text-sm">
            <Link href="/forgot-password" className="text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
            Log in
          </Button>
        </form>
        {googleEnabled ? (
          <>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Separator className="flex-1" /> or <Separator className="flex-1" />
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={() => void signIn("google", { callbackUrl: callbackUrl ?? "/dashboard" })}>
              Continue with Google
            </Button>
          </>
        ) : null}
        <p className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href={callbackUrl ? `/signup?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/signup"} className="text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

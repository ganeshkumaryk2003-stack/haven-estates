"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck, MailWarning } from "lucide-react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormError, FormField, fieldA11y } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { changePasswordAction, deleteAccountAction, resendVerificationAction } from "@/server/actions/auth";
import { updateNotificationPreferencesAction } from "@/server/actions/profile";
import { changePasswordSchema, type ChangePasswordInput } from "@/validations/auth";
import type { NotificationPreferencesInput } from "@/validations/profile";

interface AccountSettingsProps {
  email: string;
  emailVerified: boolean;
  hasPassword: boolean;
  isAdmin: boolean;
  preferences: NotificationPreferencesInput;
}

export function VerificationCard({ email, emailVerified }: Pick<AccountSettingsProps, "email" | "emailVerified">) {
  const [sending, setSending] = React.useState(false);
  async function resend() {
    setSending(true);
    const result = await resendVerificationAction();
    setSending(false);
    if (result.ok) toast.success("Verification email sent. Check your inbox.");
    else toast.error(result.error);
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {emailVerified ? <MailCheck className="size-5 text-success" /> : <MailWarning className="size-5 text-warning" />} Email verification
        </CardTitle>
        <CardDescription>
          {emailVerified ? `${email} is verified.` : `${email} is not verified yet. Verify to enquire, message, make offers and publish listings.`}
        </CardDescription>
      </CardHeader>
      {!emailVerified ? (
        <CardContent>
          <Button variant="outline" loading={sending} onClick={resend}>
            Resend verification email
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}

export function NotificationPreferencesCard({ preferences }: Pick<AccountSettingsProps, "preferences">) {
  const [values, setValues] = React.useState(preferences);
  const [saving, setSaving] = React.useState(false);

  async function toggle(key: keyof NotificationPreferencesInput, checked: boolean) {
    const next = { ...values, [key]: checked };
    setValues(next);
    setSaving(true);
    const result = await updateNotificationPreferencesAction(next);
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      setValues(values);
    }
  }

  const options: { key: keyof NotificationPreferencesInput; label: string; description: string }[] = [
    { key: "emailOnEnquiry", label: "New enquiries", description: "Email me when someone enquires about my listing." },
    { key: "emailOnMessage", label: "New messages", description: "Email me when I receive a new message." },
    { key: "emailOnOffer", label: "Offers", description: "Email me about new offers, counteroffers and decisions." },
    { key: "emailOnReservation", label: "Reservations", description: "Email me about reservation deposits and status changes." },
  ];

  return (
    <Card id="notifications">
      <CardHeader>
        <CardTitle>Email notifications</CardTitle>
        <CardDescription>In-app notifications are always on. Choose which ones are also sent by email.{saving ? " Saving…" : ""}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col divide-y">
        {options.map((option) => (
          <div key={option.key} className="flex items-center justify-between gap-4 py-3">
            <div>
              <Label htmlFor={option.key} className="font-medium">
                {option.label}
              </Label>
              <p className="text-xs text-muted-foreground">{option.description}</p>
            </div>
            <Switch id={option.key} checked={values[option.key]} onCheckedChange={(checked) => void toggle(option.key, checked)} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function ChangePasswordCard({ hasPassword }: Pick<AccountSettingsProps, "hasPassword">) {
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: "", password: "", confirmPassword: "" } });
  const errors = form.formState.errors;

  async function onSubmit(values: ChangePasswordInput) {
    setError(null);
    const result = await changePasswordAction(values);
    if (!result.ok) {
      setError(result.error);
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) form.setError(field as keyof ChangePasswordInput, { message: messages[0] });
      return;
    }
    toast.success("Password updated");
    form.reset();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{hasPassword ? "Change password" : "Set a password"}</CardTitle>
        <CardDescription>{hasPassword ? "Use a strong password you don't reuse elsewhere." : "Your account uses Google sign-in. Add a password to also sign in with email."}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <FormError message={error} />
          {hasPassword ? (
            <FormField id="currentPassword" label="Current password" error={errors.currentPassword?.message} required>
              <Input type="password" autoComplete="current-password" {...fieldA11y("currentPassword", errors.currentPassword?.message)} {...form.register("currentPassword")} />
            </FormField>
          ) : (
            <input type="hidden" value="n/a" {...form.register("currentPassword")} />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="password" label="New password" error={errors.password?.message} required>
              <Input type="password" autoComplete="new-password" {...fieldA11y("password", errors.password?.message)} {...form.register("password")} />
            </FormField>
            <FormField id="confirmPassword" label="Confirm" error={errors.confirmPassword?.message} required>
              <Input type="password" autoComplete="new-password" {...fieldA11y("confirmPassword", errors.confirmPassword?.message)} {...form.register("confirmPassword")} />
            </FormField>
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={form.formState.isSubmitting}>
              Update password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function DeleteAccountCard({ hasPassword, isAdmin }: Pick<AccountSettingsProps, "hasPassword" | "isAdmin">) {
  const [confirmation, setConfirmation] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onDelete(event: React.MouseEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await deleteAccountAction({ confirmation, password });
    setPending(false);
    if (result && !result.ok) setError(result.error);
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive">Delete account</CardTitle>
        <CardDescription>
          Permanently removes your profile, listings, favorites, messages and offers. Accounts with a paid reservation deposit cannot be deleted until the reservation is
          completed or cancelled.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isAdmin}>
              {isAdmin ? "Admins cannot self-delete" : "Delete my account"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>This cannot be undone. Type DELETE to confirm{hasPassword ? " and enter your password" : ""}.</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col gap-3">
              <FormError message={error} />
              <FormField id="delete-confirmation" label="Type DELETE">
                <Input id="delete-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" />
              </FormField>
              {hasPassword ? (
                <FormField id="delete-password" label="Current password">
                  <Input id="delete-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
                </FormField>
              ) : null}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                disabled={confirmation !== "DELETE" || pending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {pending ? "Deleting…" : "Delete account"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

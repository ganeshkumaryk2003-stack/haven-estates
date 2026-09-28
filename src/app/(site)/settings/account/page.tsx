import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChangePasswordCard, DeleteAccountCard, NotificationPreferencesCard, VerificationCard } from "@/components/settings/account-settings";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserWithProfile } from "@/server/services/users";

export const metadata: Metadata = { title: "Account settings" };

export default async function AccountSettingsPage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) redirect("/login?callbackUrl=/settings/account");
  const user = await getUserWithProfile(sessionUser.id);
  if (!user) redirect("/login");

  return (
    <>
      <VerificationCard email={user.email} emailVerified={Boolean(user.emailVerified)} />
      <NotificationPreferencesCard
        preferences={{
          emailOnEnquiry: user.profile?.emailOnEnquiry ?? true,
          emailOnMessage: user.profile?.emailOnMessage ?? true,
          emailOnOffer: user.profile?.emailOnOffer ?? true,
          emailOnReservation: user.profile?.emailOnReservation ?? true,
        }}
      />
      <ChangePasswordCard hasPassword={Boolean(user.passwordHash)} />
      <DeleteAccountCard hasPassword={Boolean(user.passwordHash)} isAdmin={user.role === "ADMIN"} />
    </>
  );
}

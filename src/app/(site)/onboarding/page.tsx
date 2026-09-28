import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/settings/onboarding-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserWithProfile } from "@/server/services/users";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) redirect("/login?callbackUrl=/onboarding");
  const { callbackUrl } = await searchParams;
  const target = callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/dashboard";
  const user = await getUserWithProfile(sessionUser.id);
  if (!user) redirect("/login");
  if (user.profile?.onboardingCompleted) redirect(target);

  return (
    <div className="container-page flex justify-center py-12">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to Haven, {user.name?.split(" ")[0] ?? "there"}</CardTitle>
          <CardDescription>
            A few details help sellers and buyers trust you. {!user.emailVerified ? "We also sent a verification link to your inbox - verify your email to unlock enquiries, messages and offers." : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm
            defaults={{
              name: user.name ?? "",
              role: user.role === "ADMIN" ? "AGENT" : user.role,
              phone: user.profile?.phone ?? "",
              location: user.profile?.location ?? "",
              company: user.profile?.company ?? "",
            }}
            callbackUrl={target}
          />
        </CardContent>
      </Card>
    </div>
  );
}

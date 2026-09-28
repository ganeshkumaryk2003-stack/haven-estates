import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { googleAuthConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Log in" };

const NOTICES: Record<string, string> = {
  "password-reset": "Your password was updated. Sign in with your new password.",
  verified: "Your email is verified. Sign in to continue.",
  "signed-out": "You have been signed out.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; notice?: string; error?: string }> }) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl && params.callbackUrl.startsWith("/") ? params.callbackUrl : undefined;
  const notice = params.notice ? NOTICES[params.notice] ?? null : null;
  return <LoginForm callbackUrl={callbackUrl} googleEnabled={googleAuthConfigured} notice={notice} />;
}

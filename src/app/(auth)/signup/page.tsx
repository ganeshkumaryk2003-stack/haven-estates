import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";
import { googleAuthConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl && params.callbackUrl.startsWith("/") ? params.callbackUrl : undefined;
  return <SignupForm callbackUrl={callbackUrl} googleEnabled={googleAuthConfigured} />;
}

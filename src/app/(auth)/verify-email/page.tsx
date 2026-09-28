import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { verifyEmailWithToken } from "@/server/services/users";

export const metadata: Metadata = { title: "Verify email" };
export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const result = token ? await verifyEmailWithToken(token) : { ok: false as const, reason: "This verification link is missing its token." };
  const user = await getCurrentUser();

  return (
    <Card>
      <CardHeader className="items-center text-center">
        {result.ok ? <CheckCircle2 className="size-10 text-success" aria-hidden="true" /> : <XCircle className="size-10 text-destructive" aria-hidden="true" />}
        <CardTitle className="text-2xl">{result.ok ? "Email verified" : "Verification failed"}</CardTitle>
        <CardDescription>
          {result.ok ? `${result.email} is now verified. You can enquire, message sellers, make offers and publish listings.` : result.reason}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {result.ok ? (
          <Button asChild className="w-full">
            <Link href={user ? "/dashboard" : "/login?notice=verified"}>{user ? "Go to dashboard" : "Log in"}</Link>
          </Button>
        ) : (
          <Button asChild variant="outline" className="w-full">
            <Link href={user ? "/settings/account" : "/login"}>{user ? "Resend from account settings" : "Log in"}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

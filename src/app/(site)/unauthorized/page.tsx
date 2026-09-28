import type { Metadata } from "next";
import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Unauthorized", robots: { index: false } };

export default function UnauthorizedPage() {
  return (
    <div className="container-page py-20">
      <EmptyState
        icon={<Lock />}
        title="You don't have access to this page"
        description="This area is restricted. If you think you should have access, contact an administrator."
        action={
          <Button asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}

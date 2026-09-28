"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-page py-20">
      <EmptyState
        icon={<AlertTriangle />}
        title="Something went wrong"
        description={error.digest ? `We've logged the problem (reference ${error.digest}). Please try again.` : "An unexpected error occurred. Please try again."}
        action={
          <div className="flex gap-2">
            <Button onClick={reset}>Try again</Button>
            <Button asChild variant="outline">
              <Link href="/">Go home</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}

import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <div className="container-page py-20">
      <EmptyState
        icon={<Compass />}
        title="We couldn't find that page"
        description="The listing may have been removed, or the link is out of date."
        action={
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/properties">Browse properties</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Go home</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}

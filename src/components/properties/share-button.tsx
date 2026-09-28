"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ShareButton({ title, url }: { title: string; url: string }) {
  async function share() {
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch (error) {
      if ((error as Error).name !== "AbortError") toast.error("Could not share this listing");
    }
  }
  return (
    <Button type="button" variant="outline" onClick={share}>
      <Share2 /> Share
    </Button>
  );
}

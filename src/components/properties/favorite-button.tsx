"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleFavoriteAction } from "@/server/actions/properties";

interface FavoriteButtonProps {
  propertyId: string;
  initialFavorited: boolean;
  initialCount?: number;
  signedIn: boolean;
  variant?: "icon" | "full";
  className?: string;
}

export function FavoriteButton({ propertyId, initialFavorited, initialCount, signedIn, variant = "icon", className }: FavoriteButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [favorited, setFavorited] = React.useState(initialFavorited);
  const [count, setCount] = React.useState(initialCount ?? 0);
  const [pending, startTransition] = React.useTransition();

  function toggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!signedIn) {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }
    const next = !favorited;
    setFavorited(next);
    setCount((value) => Math.max(0, value + (next ? 1 : -1)));
    startTransition(async () => {
      const result = await toggleFavoriteAction(propertyId);
      if (!result.ok) {
        setFavorited(!next);
        setCount((value) => Math.max(0, value + (next ? -1 : 1)));
        toast.error(result.error);
        return;
      }
      setFavorited(result.data.favorited);
      setCount(result.data.count);
    });
  }

  const label = favorited ? "Remove from favorites" : "Save to favorites";

  if (variant === "full") {
    return (
      <Button type="button" variant={favorited ? "secondary" : "outline"} onClick={toggle} disabled={pending} aria-pressed={favorited} className={className}>
        <Heart className={cn(favorited && "fill-destructive text-destructive")} />
        {favorited ? "Saved" : "Save"}
        {initialCount !== undefined ? <span className="text-muted-foreground">({count})</span> : null}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={favorited}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-ring",
        className,
      )}
    >
      <Heart className={cn("size-4", favorited && "fill-destructive text-destructive")} />
    </button>
  );
}

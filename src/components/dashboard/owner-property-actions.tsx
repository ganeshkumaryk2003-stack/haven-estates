"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, CheckCircle2, Eye, EyeOff, MoreHorizontal, Pencil, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { propertyStatusAction } from "@/server/actions/properties";
import type { OwnerPropertyDTO } from "@/server/services/properties";

type Action = "publish" | "unpublish" | "archive" | "restore" | "mark_sold" | "mark_rented" | "delete";

const CONFIRMATIONS: Partial<Record<Action, { title: string; description: string; confirm: string; destructive?: boolean }>> = {
  delete: { title: "Delete this listing?", description: "The listing, its photos and enquiries will be permanently removed. This cannot be undone.", confirm: "Delete", destructive: true },
  archive: { title: "Archive this listing?", description: "Archived listings are hidden from buyers and open offers are closed. You can restore it later.", confirm: "Archive" },
  mark_sold: { title: "Mark as sold?", description: "The listing will show as sold and any open offers will be closed.", confirm: "Mark sold" },
  mark_rented: { title: "Mark as rented?", description: "The listing will show as rented and any open offers will be closed.", confirm: "Mark rented" },
  unpublish: { title: "Unpublish this listing?", description: "The listing goes back to draft and disappears from search. Open offers are closed.", confirm: "Unpublish" },
};

export function OwnerPropertyActions({ property }: { property: OwnerPropertyDTO }) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = React.useState<Action | null>(null);
  const [confirming, setConfirming] = React.useState<Action | null>(null);

  async function run(action: Action) {
    setPendingAction(action);
    const result = await propertyStatusAction({ propertyId: property.id, action });
    setPendingAction(null);
    setConfirming(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(
      action === "delete"
        ? "Listing deleted"
        : action === "publish"
          ? result.data.status === "ACTIVE"
            ? "Listing published"
            : "Submitted for review"
          : "Listing updated",
    );
    router.refresh();
  }

  function trigger(action: Action) {
    if (CONFIRMATIONS[action]) setConfirming(action);
    else void run(action);
  }

  const status = property.status;
  const canPublish = ["DRAFT", "REJECTED", "ARCHIVED"].includes(status);
  const canUnpublish = ["ACTIVE", "PENDING_REVIEW"].includes(status);
  const canArchive = ["DRAFT", "PENDING_REVIEW", "ACTIVE", "REJECTED", "SOLD", "RENTED"].includes(status);
  const canRestore = status === "ARCHIVED";
  const canClose = ["ACTIVE", "UNDER_OFFER", "RESERVED"].includes(status);
  const canDelete = ["DRAFT", "REJECTED", "ARCHIVED"].includes(status);
  const canEdit = !["RESERVED", "SOLD", "RENTED"].includes(status);
  const confirmation = confirming ? CONFIRMATIONS[confirming] : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${property.title}`} loading={pendingAction !== null}>
            {pendingAction ? null : <MoreHorizontal />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem asChild>
            <Link href={`/properties/${property.slug}`}>
              <Eye /> Preview
            </Link>
          </DropdownMenuItem>
          {canEdit ? (
            <DropdownMenuItem asChild>
              <Link href={`/properties/${property.slug}/edit`}>
                <Pencil /> Edit
              </Link>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          {canPublish ? (
            <DropdownMenuItem onSelect={() => trigger("publish")}>
              <Send /> Publish
            </DropdownMenuItem>
          ) : null}
          {canUnpublish ? (
            <DropdownMenuItem onSelect={() => trigger("unpublish")}>
              <EyeOff /> Unpublish
            </DropdownMenuItem>
          ) : null}
          {canClose ? (
            <DropdownMenuItem onSelect={() => trigger(property.listingType === "RENT" ? "mark_rented" : "mark_sold")}>
              <CheckCircle2 /> Mark as {property.listingType === "RENT" ? "rented" : "sold"}
            </DropdownMenuItem>
          ) : null}
          {canArchive ? (
            <DropdownMenuItem onSelect={() => trigger("archive")}>
              <Archive /> Archive
            </DropdownMenuItem>
          ) : null}
          {canRestore ? (
            <DropdownMenuItem onSelect={() => trigger("restore")}>
              <ArchiveRestore /> Restore to draft
            </DropdownMenuItem>
          ) : null}
          {canDelete ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => trigger("delete")}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirming !== null} onOpenChange={(open) => !open && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmation?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmation?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (confirming) void run(confirming);
              }}
              className={confirmation?.destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
              disabled={pendingAction !== null}
            >
              {pendingAction ? "Working…" : confirmation?.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

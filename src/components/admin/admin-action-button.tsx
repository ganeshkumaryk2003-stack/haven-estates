"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/errors";

interface AdminActionButtonProps extends Omit<ButtonProps, "onClick"> {
  label: string;
  /** When set, a confirmation dialog with an optional reason textarea is shown first. */
  confirm?: { title: string; description: string; reasonLabel?: string; destructive?: boolean };
  /**
   * A server action, pre-bound with its arguments (e.g. `moderateAction.bind(null, id, "approve")`).
   * Plain inline closures cannot cross the server → client boundary; bound server actions can.
   * The optional reason from the confirmation dialog is appended as the last argument.
   */
  action: (reason?: string) => Promise<ActionResult>;
  successMessage?: string;
}

// Generic button for admin operations: optional confirmation + reason, toast feedback, refresh.
export function AdminActionButton({ label, confirm, action, successMessage = "Done", ...buttonProps }: AdminActionButtonProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [open, setOpen] = React.useState(false);

  async function run() {
    setPending(true);
    const result = await action(reason || undefined);
    setPending(false);
    setOpen(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(successMessage);
    setReason("");
    router.refresh();
  }

  if (!confirm) {
    return (
      <Button size="sm" {...buttonProps} onClick={() => void run()} loading={pending}>
        {label}
      </Button>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" {...buttonProps}>
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
          <AlertDialogDescription>{confirm.description}</AlertDialogDescription>
        </AlertDialogHeader>
        {confirm.reasonLabel ? <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder={confirm.reasonLabel} rows={3} aria-label={confirm.reasonLabel} /> : null}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              void run();
            }}
            disabled={pending}
            className={confirm.destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
          >
            {pending ? "Working…" : label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

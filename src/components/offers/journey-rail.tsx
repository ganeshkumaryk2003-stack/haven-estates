import { Check, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

// The signature element: the five steps every purchase walks through. Purely presentational -
// callers pass the current step, usually via stepFromStatus() below.

export const JOURNEY_STEPS = [
  { label: "Enquire", hint: "Ask the seller anything" },
  { label: "Offer", hint: "You choose how long it stays open" },
  { label: "Counteroffer", hint: "The seller can counter once" },
  { label: "Accepted", hint: "Nothing is charged before this" },
  { label: "Reserved", hint: "Pay the deposit through Stripe" },
] as const;

export type JourneyStep = 0 | 1 | 2 | 3 | 4;

interface JourneyRailProps {
  current: JourneyStep;
  complete?: boolean;
  orientation?: "horizontal" | "vertical";
  size?: "full" | "mini";
  className?: string;
}

// Maps the statuses a page already has to a rail position. Dead offers return null so callers
// can render nothing instead of a misleading half-finished rail.
export function stepFromStatus(offerStatus?: string | null, reservationStatus?: string | null): { current: JourneyStep; complete: boolean } | null {
  if (reservationStatus === "DEPOSIT_PAID" || reservationStatus === "COMPLETED") return { current: 4, complete: true };
  switch (offerStatus) {
    case undefined:
    case null:
    case "":
      return { current: 0, complete: false };
    case "PENDING":
      return { current: 1, complete: false };
    case "COUNTERED":
      return { current: 2, complete: false };
    case "ACCEPTED":
      return { current: 3, complete: false };
    case "REJECTED":
    case "WITHDRAWN":
    case "EXPIRED":
      return null;
    default:
      return { current: 0, complete: false };
  }
}

type NodeState = "done" | "current" | "future";

function stateFor(index: number, current: JourneyStep, complete: boolean): NodeState {
  if (complete) return "done";
  if (index < current) return "done";
  if (index === current) return "current";
  return "future";
}

const nodeClasses: Record<NodeState, string> = {
  done: "border-door bg-door text-primary-foreground",
  // Porch light: navy number on gold with a soft yellow halo around the node.
  current: "border-gold bg-gold text-gold-foreground ring-4 ring-gold/35",
  future: "border-input bg-card text-muted-foreground",
};

export function JourneyRail({ current, complete = false, orientation = "horizontal", size = "full", className }: JourneyRailProps) {
  const label = complete ? "Offer progress: reserved" : `Step ${current + 1} of 5: ${JOURNEY_STEPS[current].label}`;

  if (size === "mini") {
    return (
      <ol aria-label="Offer progress" className={cn("flex items-center gap-1.5", className)}>
        {JOURNEY_STEPS.map((step, index) => {
          const state = stateFor(index, current, complete);
          return (
            <li
              key={step.label}
              aria-current={!complete && index === current ? "step" : undefined}
              className={cn(
                "size-2 rounded-full",
                state === "done" && "bg-door",
                state === "current" && "bg-gold ring-2 ring-gold/35",
                state === "future" && "border border-input bg-card",
              )}
            >
              <span className="sr-only">
                {index === 0 ? `${label}. ` : ""}
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    );
  }

  const vertical = orientation === "vertical";

  return (
    <ol aria-label="Offer progress" className={cn(vertical ? "flex flex-col" : "flex items-start", className)}>
      {JOURNEY_STEPS.map((step, index) => {
        const state = stateFor(index, current, complete);
        const isLast = index === JOURNEY_STEPS.length - 1;
        const isCurrent = !complete && index === current;
        // The line after a node is door blue when the step after it has been reached.
        const lineDone = complete || index < current;
        return (
          <li
            key={step.label}
            aria-current={isCurrent ? "step" : undefined}
            className={cn("relative flex", vertical ? "gap-4 pb-6 last:pb-0" : "flex-1 flex-col items-center text-center")}
          >
            {!isLast ? (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute",
                  vertical ? "top-8 bottom-0 left-4 w-px -translate-x-1/2" : "top-4 left-1/2 h-px w-full -translate-y-1/2",
                  lineDone ? "bg-door" : "bg-border",
                )}
              />
            ) : null}
            <span
              aria-hidden="true"
              className={cn("relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold", nodeClasses[state])}
            >
              {isLast ? <KeyRound className="size-4" /> : state === "done" ? <Check className="size-4" /> : index + 1}
            </span>
            <span className={cn("flex flex-col", vertical ? "pt-1" : "mt-2 items-center px-1")}>
              <span className={cn("text-sm font-semibold", state === "future" && "text-muted-foreground")}>{step.label}</span>
              {vertical ? <span className="text-sm text-muted-foreground">{step.hint}</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

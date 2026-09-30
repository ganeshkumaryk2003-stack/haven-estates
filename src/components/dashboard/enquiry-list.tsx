"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Inbox, Mail, MessageSquare, Phone } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserAvatar } from "@/components/ui/user-avatar";
import { APP_NAME, CONTACT_METHOD_LABELS } from "@/lib/constants";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { markEnquiriesReadAction, updateEnquiryStatusAction } from "@/server/actions/engagement";
import type { EnquiryDTO } from "@/types/dto";

const STATUS_VARIANTS: Record<EnquiryDTO["status"], "default" | "secondary" | "success" | "muted" | "destructive"> = {
  NEW: "default",
  READ: "secondary",
  REPLIED: "success",
  CLOSED: "muted",
  SPAM: "destructive",
};

export function EnquiryList({ enquiries, direction }: { enquiries: EnquiryDTO[]; direction: "received" | "sent" }) {
  const router = useRouter();

  // Opening the received tab marks new enquiries as read (like an inbox).
  React.useEffect(() => {
    if (direction !== "received") return;
    const fresh = enquiries.filter((enquiry) => enquiry.status === "NEW").map((enquiry) => enquiry.id);
    if (fresh.length > 0) void markEnquiriesReadAction(fresh).then(() => router.refresh());
  }, [direction, enquiries, router]);

  async function setStatus(enquiryId: string, status: "READ" | "REPLIED" | "CLOSED" | "SPAM") {
    const result = await updateEnquiryStatusAction(enquiryId, status);
    if (!result.ok) toast.error(result.error);
    else router.refresh();
  }

  if (enquiries.length === 0) {
    return (
      <EmptyState
        icon={<Inbox />}
        title={direction === "received" ? "No enquiries yet" : "You haven't sent any enquiries"}
        description={direction === "received" ? "Enquiries from buyers about your listings show up here." : "Ask a seller about any listing and track the conversation here."}
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {enquiries.map((enquiry) => {
        const other = direction === "received" ? enquiry.sender : enquiry.recipient;
        return (
          <li key={enquiry.id} className={cn("flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-start", enquiry.status === "NEW" && "border-primary/40")}>
            <Link href={`/properties/${enquiry.property.slug}`} className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
              {enquiry.property.coverImage ? <Image src={enquiry.property.coverImage} alt="" fill sizes="80px" className="object-cover" /> : null}
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/properties/${enquiry.property.slug}`} className="font-medium hover:underline">
                  {enquiry.property.title}
                </Link>
                <Badge variant={STATUS_VARIANTS[enquiry.status]}>{enquiry.status.toLowerCase()}</Badge>
                <span className="text-xs text-muted-foreground">{formatRelative(enquiry.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm font-semibold">{enquiry.subject}</p>
              <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{enquiry.message}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <UserAvatar name={other.name} image={other.image} className="size-5 text-[9px]" />
                  <Link href={`/profile/${other.id}`} className="hover:underline">
                    {other.name ?? `${APP_NAME} user`}
                  </Link>
                </span>
                <span>Prefers {CONTACT_METHOD_LABELS[enquiry.preferredContact].toLowerCase()}</span>
                {direction === "received" && enquiry.sender.email ? (
                  <a href={`mailto:${enquiry.sender.email}`} className="flex items-center gap-1 hover:underline">
                    <Mail className="size-3" /> {enquiry.sender.email}
                  </a>
                ) : null}
                {direction === "received" && enquiry.phone ? (
                  <a href={`tel:${enquiry.phone}`} className="flex items-center gap-1 hover:underline">
                    <Phone className="size-3" /> {enquiry.phone}
                  </a>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:w-44">
              <Button asChild size="sm" variant="outline">
                <Link href={`/messages?to=${other.id}&property=${enquiry.property.id}`}>
                  <MessageSquare /> {direction === "received" ? "Reply in messages" : "Open conversation"}
                </Link>
              </Button>
              {direction === "received" ? (
                <Select value={enquiry.status === "NEW" ? "READ" : enquiry.status} onValueChange={(value) => void setStatus(enquiry.id, value as "READ" | "REPLIED" | "CLOSED" | "SPAM")}>
                  <SelectTrigger size="sm" aria-label="Update enquiry status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="READ">Mark as read</SelectItem>
                    <SelectItem value="REPLIED">Mark as replied</SelectItem>
                    <SelectItem value="CLOSED">Close</SelectItem>
                    <SelectItem value="SPAM">Mark as spam</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Ban, MessageSquare, ShieldOff, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { UserAvatar } from "@/components/ui/user-avatar";
import { APP_NAME, ROLE_LABELS } from "@/lib/constants";
import { formatRelative } from "@/lib/format";
import { updateConnectionAction } from "@/server/actions/engagement";
import type { ConnectionAction } from "@/server/services/connections";
import type { ConnectionDTO } from "@/types/dto";

export function ConnectionList({ connections }: { connections: ConnectionDTO[] }) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);

  async function run(connectionId: string, action: ConnectionAction) {
    setPending(connectionId);
    const result = await updateConnectionAction(connectionId, action);
    setPending(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  if (connections.length === 0) {
    return <EmptyState icon={<Users />} title="No connections yet" description="A connection is created automatically when you enquire, message or make an offer to someone." />;
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {connections.map((connection) => {
        const busy = pending === connection.id;
        return (
          <li key={connection.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
            <div className="flex items-start gap-3">
              <UserAvatar name={connection.otherUser.name} image={connection.otherUser.image} className="size-12" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/profile/${connection.otherUser.id}`} className="font-semibold hover:underline">
                    {connection.otherUser.name ?? `${APP_NAME} user`}
                  </Link>
                  <Badge variant="outline">{ROLE_LABELS[connection.otherUser.role]}</Badge>
                  {connection.status === "ARCHIVED" ? <Badge variant="muted">Archived</Badge> : null}
                  {connection.status === "BLOCKED" ? <Badge variant="destructive">{connection.blockedByMe ? "Blocked" : "Unavailable"}</Badge> : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {connection.role === "buyer" ? "You enquired as a buyer" : "They contacted you as a buyer"}
                  {connection.otherUser.location ? ` · ${connection.otherUser.location}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">Last interaction {formatRelative(connection.lastInteractionAt)}</p>
              </div>
            </div>
            {connection.properties.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5" aria-label="Related properties">
                {connection.properties.slice(0, 4).map((property) => (
                  <li key={property.id}>
                    <Link href={`/properties/${property.slug}`} className="inline-flex max-w-56 truncate rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs hover:bg-accent">
                      {property.title}
                    </Link>
                  </li>
                ))}
                {connection.properties.length > 4 ? <li className="text-xs text-muted-foreground">+{connection.properties.length - 4} more</li> : null}
              </ul>
            ) : null}
            <div className="mt-auto flex flex-wrap gap-2">
              {connection.status !== "BLOCKED" ? (
                <Button asChild size="sm">
                  <Link href={connection.conversationId ? `/messages/${connection.conversationId}` : `/messages?to=${connection.otherUser.id}`}>
                    <MessageSquare /> Message
                  </Link>
                </Button>
              ) : null}
              {connection.status === "ACTIVE" ? (
                <Button size="sm" variant="outline" onClick={() => void run(connection.id, "archive")} disabled={busy}>
                  <Archive /> Archive
                </Button>
              ) : null}
              {connection.status === "ARCHIVED" ? (
                <Button size="sm" variant="outline" onClick={() => void run(connection.id, "unarchive")} disabled={busy}>
                  <ArchiveRestore /> Restore
                </Button>
              ) : null}
              {connection.status !== "BLOCKED" ? (
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void run(connection.id, "block")} disabled={busy}>
                  <Ban /> Block
                </Button>
              ) : connection.blockedByMe ? (
                <Button size="sm" variant="outline" onClick={() => void run(connection.id, "unblock")} disabled={busy}>
                  <ShieldOff /> Unblock
                </Button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

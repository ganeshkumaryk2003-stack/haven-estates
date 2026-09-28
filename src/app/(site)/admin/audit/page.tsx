import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { listAuditLogs } from "@/server/services/admin";

export const metadata: Metadata = { title: "Admin · Audit log", robots: { index: false } };

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: rawPage } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);
  const result = await listAuditLogs(page, 50);

  return (
    <>
      <PageHeader title="Audit log" description={`${result.total} recorded events. Every sensitive action (sign-ins, listing changes, moderation, offers, payments) is stored with its actor and metadata.`} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Metadata</TableHead>
            <TableHead>IP</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</TableCell>
              <TableCell>
                <Badge variant="muted" className="font-mono text-[10px]">
                  {entry.action}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">{entry.actor ? entry.actor.name ?? entry.actor.email : <span className="text-muted-foreground">system</span>}</TableCell>
              <TableCell className="font-mono text-xs">
                {entry.targetType}/{entry.targetId.slice(-8)}
              </TableCell>
              <TableCell className="max-w-xs truncate font-mono text-xs text-muted-foreground">{entry.metadata ? JSON.stringify(entry.metadata) : "—"}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{entry.ipAddress ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination page={page} totalPages={result.totalPages} hrefForPage={(next) => (next > 1 ? `/admin/audit?page=${next}` : "/admin/audit")} />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PROPERTY_STATUS_LABELS, REPORT_REASON_LABELS } from "@/lib/constants";
import { formatRelative } from "@/lib/format";
import { adminModeratePropertyAction, adminResolveReportAction } from "@/server/actions/admin";
import { listReports } from "@/server/services/admin";

export const metadata: Metadata = { title: "Admin · Reports", robots: { index: false } };

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const filter = status === "RESOLVED" || status === "DISMISSED" || status === "OPEN" ? status : undefined;
  const reports = await listReports(filter);

  return (
    <>
      <PageHeader
        title="Reported listings"
        description="Reports submitted by users. Resolve a report after acting on it, dismiss it if the listing is fine, or remove the listing directly."
        actions={
          <div className="flex gap-1">
            {[undefined, "OPEN", "RESOLVED", "DISMISSED"].map((value) => (
              <Link
                key={value ?? "all"}
                href={value ? `/admin/reports?status=${value}` : "/admin/reports"}
                className={`rounded-md px-3 py-1.5 text-sm ${filter === value ? "bg-accent font-medium" : "text-muted-foreground hover:bg-accent/60"}`}
              >
                {value ? value.charAt(0) + value.slice(1).toLowerCase() : "All"}
              </Link>
            ))}
          </div>
        }
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Listing</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Reporter</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                No reports in this view.
              </TableCell>
            </TableRow>
          ) : null}
          {reports.map((report) => (
            <TableRow key={report.id}>
              <TableCell>
                <Link href={`/properties/${report.property.slug}`} className="block max-w-56 truncate font-medium hover:underline">
                  {report.property.title}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {PROPERTY_STATUS_LABELS[report.property.status]} · owner {report.property.owner.name ?? "unknown"}
                </span>
              </TableCell>
              <TableCell>
                <p className="font-medium">{REPORT_REASON_LABELS[report.reason]}</p>
                {report.details ? <p className="max-w-64 text-xs text-muted-foreground">{report.details}</p> : null}
              </TableCell>
              <TableCell className="text-sm">
                {report.reporter.name ?? report.reporter.email}
              </TableCell>
              <TableCell>
                <Badge variant={report.status === "OPEN" ? "warning" : report.status === "RESOLVED" ? "success" : "muted"}>{report.status.toLowerCase()}</Badge>
                {report.resolution ? <p className="mt-1 max-w-48 text-xs text-muted-foreground">{report.resolution}</p> : null}
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatRelative(report.createdAt)}</TableCell>
              <TableCell>
                {report.status === "OPEN" ? (
                  <div className="flex flex-wrap gap-1">
                    <AdminActionButton
                      label="Resolve"
                      confirm={{ title: "Resolve this report?", description: "Use this after you have handled the listing.", reasonLabel: "Resolution note" }}
                      action={adminResolveReportAction.bind(null, report.id, "RESOLVED")}
                    />
                    <AdminActionButton label="Dismiss" variant="outline" action={adminResolveReportAction.bind(null, report.id, "DISMISSED", "No action needed.")} />
                    {!["ARCHIVED", "SOLD", "RENTED", "RESERVED"].includes(report.property.status) ? (
                      <AdminActionButton
                        label="Remove listing"
                        variant="ghost"
                        className="text-destructive"
                        confirm={{ title: "Remove the listing?", description: "Archives the listing and resolves all open reports on it.", reasonLabel: "Reason sent to the owner", destructive: true }}
                        action={adminModeratePropertyAction.bind(null, report.property.id, "archive")}
                        successMessage="Listing removed"
                      />
                    ) : null}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">by {report.resolvedBy?.name ?? "admin"}</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}

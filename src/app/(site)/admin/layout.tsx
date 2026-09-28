import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/admin");
  if (user.role !== "ADMIN") redirect("/unauthorized");

  const [pending, reports] = await Promise.all([prisma.property.count({ where: { status: "PENDING_REVIEW" } }), prisma.propertyReport.count({ where: { status: "OPEN" } })]);

  return (
    <div className="container-page grid gap-8 py-8 lg:grid-cols-[220px_1fr]">
      <div className="flex flex-col gap-3">
        <Badge variant="destructive" className="w-fit">
          Administrator
        </Badge>
        <AdminNav badges={{ "/admin/properties": pending, "/admin/reports": reports }} />
      </div>
      <div className="min-w-0 flex flex-col gap-6">{children}</div>
    </div>
  );
}

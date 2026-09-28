import { redirect } from "next/navigation";
import { DashboardNav, type DashboardNavItem } from "@/components/dashboard/dashboard-nav";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getUnreadNotificationCount } from "@/server/services/notifications";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  const [newEnquiries, openOffers, unreadNotifications] = await Promise.all([
    prisma.enquiry.count({ where: { recipientId: user.id, status: "NEW" } }),
    prisma.offer.count({ where: { OR: [{ sellerId: user.id, status: "PENDING" }, { buyerId: user.id, status: "COUNTERED" }] } }),
    getUnreadNotificationCount(user.id),
  ]);

  const items: DashboardNavItem[] = [
    { href: "/dashboard", label: "Overview", icon: "overview" },
    { href: "/dashboard/properties", label: "My properties", icon: "properties" },
    { href: "/dashboard/enquiries", label: "Enquiries", icon: "enquiries", badge: newEnquiries },
    { href: "/dashboard/offers", label: "Offers", icon: "offers", badge: openOffers },
    { href: "/dashboard/reservations", label: "Reservations", icon: "reservations" },
    { href: "/dashboard/connections", label: "My connections", icon: "connections" },
    { href: "/dashboard/notifications", label: "Notifications", icon: "notifications", badge: unreadNotifications },
    { href: "/settings/profile", label: "Settings", icon: "settings" },
  ];

  return (
    <div className="container-page grid gap-8 py-8 lg:grid-cols-[220px_1fr]">
      <DashboardNav items={items} />
      <div className="min-w-0 flex flex-col gap-6">{children}</div>
    </div>
  );
}

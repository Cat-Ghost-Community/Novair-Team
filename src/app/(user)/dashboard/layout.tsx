import { DashboardShell } from "@/components/layout/dashboard-shell";

export const dynamic = "force-dynamic";
export default async function UserDashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="USER">{children}</DashboardShell>;
}

import type { ReactNode } from "react";
import { requireRole } from "@/server/auth/guards";
import { SiteFooter, SiteHeader } from "./site-shell";
import { Container } from "@/components/ui/primitives";
import { AccountMenu } from "@/components/auth/account-menu";
import { DashboardNavigation } from "./dashboard-navigation";

export async function DashboardShell({ role, children }: { role: "USER" | "ADMIN"; children: ReactNode }) {
  const { user } = await requireRole(role);
  return <div className="site-shell"><SiteHeader /><Container className="dashboard-top"><p className="eyebrow">{role === "ADMIN" ? "ناحیهٔ مدیریت نوایر" : "ناحیهٔ کاربری نوایر"}</p><AccountMenu name={user.name} role={user.role} /></Container><Container className="dashboard-grid"><aside className="dashboard-sidebar"><DashboardNavigation role={role} /><p className="dashboard-nav-note">درخواست‌ها، پروژه‌ها و پاسخ‌های پشتیبانی را از همین حساب پیگیری کن.</p></aside><main id="main-content" tabIndex={-1} className="dashboard-main">{children}</main></Container><SiteFooter /></div>;
}

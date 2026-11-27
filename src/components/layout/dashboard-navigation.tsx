"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const userItems = [["/dashboard", "پیشخوان"], ["/dashboard/requests", "درخواست‌ها"], ["/dashboard/projects", "پروژه‌ها"], ["/dashboard/tickets", "پشتیبانی"], ["/dashboard/profile", "حساب و امنیت"]] as const;
const adminItems = [["/admin", "پیشخوان مدیریت"], ["/admin/requests", "درخواست‌ها"], ["/admin/projects", "پروژه‌ها"], ["/admin/tickets", "پشتیبانی"], ["/admin/users", "کاربران"], ["/admin/content", "محتوا"]] as const;
export function DashboardNavigation({ role }: { role: "USER" | "ADMIN" }) {
  const pathname = usePathname();
  return <nav aria-label={role === "ADMIN" ? "ناوبری مدیریت" : "ناوبری ناحیهٔ کاربری"} className="dashboard-navigation">{(role === "ADMIN" ? adminItems : userItems).map(([href, label]) => <Link key={href} href={href} aria-current={(pathname === href || (["/dashboard/requests","/dashboard/projects","/admin/requests","/admin/projects","/dashboard/tickets","/admin/tickets","/admin/content"].includes(href) && pathname.startsWith(`${href}/`))) ? "page" : undefined}>{label}</Link>)}</nav>;
}

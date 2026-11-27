import { notFound } from "next/navigation";
import { requireRole } from "@/server/auth/guards";
import Link from "next/link";
import { AccountSummary } from "@/components/auth/account-summary";
import { AccountForm } from "@/components/auth/account-form";
import { buttonClass } from "@/components/ui/button";
import { CustomerRequestPage } from "@/components/requests/request-pages";
import { CustomerProjectsPage, CustomerDashboardOverview } from "@/components/projects/project-pages";
import { SupportPage, SupportDashboard } from "@/components/tickets/pages";

export default async function DashboardRoute({ params, searchParams }: { params: Promise<{ section?: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { section = [] } = await params;
  if ((section.length > 1 && (!["requests", "projects", "tickets"].includes(section[0]!) || section.length > 2)) || (section[0] && !["requests", "projects", "tickets", "profile"].includes(section[0]))) notFound();
  // Page-level guard as well as layout guard: protect each future data access separately.
  const { user } = await requireRole("USER");
  const page = section[0];
  if (page === "requests") return <CustomerRequestPage part={section[1]} query={await searchParams} />;
  if (page === "projects") return <CustomerProjectsPage id={section[1]} query={await searchParams}/>;
  if (page === "tickets") return <SupportPage part={section[1]} query={await searchParams}/>;
  if (page === "profile") return <><h1>حساب و امنیت</h1><section className="dashboard-card" aria-labelledby="profile-title"><h2 id="profile-title">اطلاعات حساب تو</h2><AccountSummary user={user} /><p className="account-notice">تأیید ایمیل و بازیابی رمز از طریق ایمیل هنوز فعال نیست.</p></section><section className="dashboard-card" aria-labelledby="password-title"><h2 id="password-title">تغییر رمز عبور</h2><p className="muted">رمز جدید جایگزین رمز فعلی می‌شود و نشست‌های قبلی بسته می‌شوند.</p><AccountForm mode="password" /></section></>;
  return <><p className="eyebrow">خوش آمدی، {user.name}</p><CustomerDashboardOverview /><SupportDashboard/><section className="dashboard-card customer-account-overview"><h2>حساب تو</h2><AccountSummary user={user} /><Link href="/dashboard/profile" className={buttonClass("secondary")}>مدیریت حساب و رمز عبور</Link></section></>;
}

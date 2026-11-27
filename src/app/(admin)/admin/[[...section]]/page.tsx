import { notFound } from "next/navigation";
import { requireRole } from "@/server/auth/guards";
import { headers } from "next/headers";
import { readAdminOverview } from "@/server/auth/account-data";
import { getAuthentication } from "@/server/auth/runtime";
import { getDatabase } from "@/server/db/client";
import { AccountSummary } from "@/components/auth/account-summary";
import { AccountForm } from "@/components/auth/account-form";
import { ManagementPage, AdminOperationalOverview } from "@/components/management/pages";
import { SupportPage, SupportDashboard } from "@/components/tickets/pages";
import { ContentPage, ContentDashboard } from "@/components/content/pages";

export default async function AdminRoute({ params, searchParams }: { params: Promise<{ section?: string[] }>; searchParams:Promise<Record<string,string|string[]|undefined>> }) {
  const { section = [] } = await params;
  if (section[0] !== "content" && ((section.length > 1 && (!["requests","projects","tickets"].includes(section[0]!) || section.length>2)) || (section[0] && !["requests", "projects", "tickets", "users"].includes(section[0])))) notFound();
  const { user } = await requireRole("ADMIN");
  if(section[0]==="content")return <ContentPage parts={section.slice(1)} query={await searchParams}/>;
  if(section[0]==="requests"||section[0]==="projects")return <ManagementPage area={section[0]} id={section[1]} query={await searchParams}/>;
  if(section[0]==="tickets")return <SupportPage admin part={section[1]} query={await searchParams}/>;
  const titles: Record<string, string> = { requests: "درخواست‌ها", projects: "پروژه‌ها", tickets: "پشتیبانی", users: "کاربران", content: "محتوا" };
  if (section[0]) return <><h1>{titles[section[0]]}</h1><section className="dashboard-card"><h2>ابزار مدیریت این بخش هنوز فعال نیست.</h2><p>این مسیر برای تکمیل مدیریت در مراحل بعدی در نظر گرفته شده است. اطلاعات و رکورد ساختگی نمایش داده نمی‌شود.</p></section></>;
  const counts = await readAdminOverview(getAuthentication(), getDatabase(), await headers());
  return <><p className="eyebrow">خوش آمدی، {user.name}</p><h1>پیشخوان مدیریت</h1><AdminOperationalOverview /><SupportDashboard admin/><ContentDashboard compact/><section className="dashboard-card"><h2>وضعیت واقعی حساب‌ها</h2><dl className="account-facts"><div><dt>حساب‌های فعال</dt><dd>{new Intl.NumberFormat("fa-IR").format(counts.activeUsers)}</dd></div><div><dt>حساب‌های غیرفعال</dt><dd>{new Intl.NumberFormat("fa-IR").format(counts.disabledUsers)}</dd></div></dl><p className="muted">درخواست‌ها، پروژه‌ها و گفتگوهای پشتیبانی قابل مدیریت‌اند؛ محتوای عمومی از بخش مدیریت محتوا قابل ویرایش است؛ ابزار ویرایش کاربران هنوز فعال نیست.</p></section><section id="account" className="dashboard-card" aria-labelledby="admin-account-title"><h2 id="admin-account-title">حساب و امنیت مدیر</h2><AccountSummary user={user} /><p className="account-notice">تأیید ایمیل و بازیابی رمز از طریق ایمیل هنوز فعال نیست.</p><h3>تغییر رمز عبور</h3><AccountForm mode="password" /></section></>;
}

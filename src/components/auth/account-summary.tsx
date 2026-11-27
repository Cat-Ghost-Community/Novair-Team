import type { PublicAccount } from "@/shared/auth-contracts";

export function AccountSummary({ user }: { user: PublicAccount }) {
  const date = new Intl.DateTimeFormat("fa-IR", { dateStyle: "long", timeZone: "Asia/Tehran" }).format(new Date(user.createdAt));
  return <dl className="account-facts"><div><dt>نام نمایشی</dt><dd>{user.name}</dd></div><div><dt>ایمیل</dt><dd><bdi dir="ltr">{user.email}</bdi></dd></div><div><dt>وضعیت حساب</dt><dd>فعال</dd></div><div><dt>دسترسی</dt><dd>{user.role === "ADMIN" ? "مدیر" : "کاربر"}</dd></div><div><dt>تاریخ ساخت حساب</dt><dd>{date}</dd></div><div><dt>وضعیت ایمیل</dt><dd>{user.emailVerified ? "تأییدشده" : "تأییدنشده"}</dd></div></dl>;
}

import Link from "next/link";
import { ArrowUpLeft, KeyRound } from "lucide-react";
import { IdeaCompanion } from "@/components/art/landing-details";
import { Badge } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";

const copy = {
  login: {
    title: "ناحیهٔ کاربری در حال آماده‌سازی است",
    description: "برای شروع همکاری، ثبت درخواست از ناحیهٔ کاربری انجام خواهد شد. ورود به حساب و ثبت درخواست هنوز فعال نیست؛ فعلاً می‌توانید با توانایی‌های نوایر آشنا شوید.",
    alternate: { href: "/register", label: "وضعیت ثبت‌نام" },
  },
  register: {
    title: "ثبت‌نام هنوز فعال نشده است",
    description: "حساب کاربری پس از تکمیل زیرساخت ورود در دسترس قرار می‌گیرد. در حال حاضر اطلاعاتی از شما دریافت نمی‌کنیم.",
    alternate: { href: "/login", label: "وضعیت ورود" },
  },
} as const;

// Presentation only. No credential fields, auth client, endpoint or simulated account state.
export function AccountAccessState({ mode }: { mode: keyof typeof copy }) {
  const content = copy[mode];
  return (
    <section className="account-access" aria-labelledby="account-access-title">
      <div className="account-panel">
        <Badge><KeyRound size={15} aria-hidden="true" />حساب نوایر</Badge>
        <h1 id="account-access-title">{content.title}</h1>
        <p className="account-description">{content.description}</p>
        <p className="account-notice">ورود، ثبت‌نام و بازیابی رمز هنوز در دسترس نیستند. در این صفحه نیازی به واردکردن اطلاعات شخصی یا رمز عبور ندارید.</p>
        <div className="account-actions">
          <Link href="/#capabilities" className={buttonClass("primary")}>
            آشنایی با توانایی‌های نوایر<ArrowUpLeft size={18} aria-hidden="true" />
          </Link>
          <Link href={content.alternate.href} className={buttonClass("ghost")}>{content.alternate.label}</Link>
        </div>
        <Link href="/#faq" className="account-help">پرسشی دربارهٔ همکاری داری؟<ArrowUpLeft size={16} aria-hidden="true" /></Link>
      </div>
      <aside className="account-aside" aria-labelledby="account-aside-title">
        <p className="eyebrow">یک تیم کوچک، برای فکرهای بزرگ</p>
        <h2 id="account-aside-title">اول، ایده‌ات را<br />بهتر بشناسیم.</h2>
        <p>برای آشنایی با نوایر به حساب نیاز نداری. خدمات، شیوهٔ همکاری و پاسخ پرسش‌ها همین حالا در صفحهٔ اصلی در دسترس‌اند.</p>
        <IdeaCompanion />
        <Link href="/#process" className="text-link">مسیر همکاری را ببین<ArrowUpLeft size={17} aria-hidden="true" /></Link>
      </aside>
    </section>
  );
}

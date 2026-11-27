import Link from "next/link";
import { KeyRound, ArrowUpLeft } from "lucide-react";
import { AccountForm } from "./account-form";
import { IdeaCompanion } from "@/components/art/landing-details";
import { Badge } from "@/components/ui/primitives";

export function AccountPage({ mode, next, notice }: { mode: "login" | "register"; next?: string; notice?: string }) {
  return <section className="account-access" aria-labelledby="account-access-title">
    <div className="account-panel"><Badge><KeyRound size={15} aria-hidden="true" />حساب نوایر</Badge>
      <h1 id="account-access-title">{mode === "login" ? "ورود به نوایر" : "یک حساب، برای شروع آشنایی."}</h1>
      <p className="account-description">{mode === "login" ? "خوش برگشتی. با ایمیل و رمز عبورت وارد حساب شو." : "نام، ایمیل و یک رمز مخصوص این حساب را وارد کن."}</p>
      {notice && <p className="account-notice" role="status">{notice}</p>}
      <AccountForm mode={mode} next={next} />
      <p className="account-switch">{mode === "login" ? "هنوز حساب نداری؟" : "قبلاً حساب ساخته‌ای؟"} <Link href={`${mode === "login" ? "/register" : "/login"}${next && next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`}>{mode === "login" ? "ساخت حساب" : "ورود به حساب"}</Link></p>
      <p className="account-notice">ایمیل تأیید و بازیابی رمز از طریق ایمیل هنوز فعال نیست. حساب جدید با ایمیل تأییدنشده ساخته می‌شود؛ رمزت را در جای امن نگه دار.</p>
    </div>
    <aside className="account-aside" aria-labelledby="account-aside-title"><p className="eyebrow">دو نفر، هم‌فکر در ساختن</p><h2 id="account-aside-title">ایده‌ات را<br />نزدیک‌تر ببینیم.</h2><p>پس از ورود، درخواست پروژه‌ات را ثبت کن و وضعیتش را در حساب خودت ببین. بودجه و زمان نهایی پس از بررسی نیازها و توافق مشخص می‌شوند.</p><IdeaCompanion /><Link href="/#process" className="text-link">مسیر همکاری را ببین<ArrowUpLeft size={17} aria-hidden="true" /></Link></aside>
  </section>;
}

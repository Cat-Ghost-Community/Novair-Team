"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { Input, Textarea, Select, FormField } from "@/components/ui/form";
import { Button, buttonClass } from "@/components/ui/button";
import { requestSchema, requestCategories, budgetPreferences, timelinePreferences, requestStatuses, type RequestFeedback } from "@/shared/request-contracts";

export function RequestForm({ operationKey }: { operationKey: string }) {
  const prefix = useId();
  const busy = useRef(false);
  const feedback = useRef<HTMLParagraphElement>(null);
  const [phase, setPhase] = useState<"checking" | "ready" | "pending" | "blocked">("checking");
  const [result, setResult] = useState<RequestFeedback | null>(null);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [expired, setExpired] = useState(false);
  const [fault, setFault] = useState(false);
  const recover = useCallback((signal?: AbortSignal) => {
    return fetch(`/api/requests/operation/${operationKey}`, { cache: "no-store", signal }).then(async (response) => {
      const data: RequestFeedback = await response.json();
      if (response.ok && data.id) { setResult(data); setMessage(""); setFault(false); }
      else if (response.status === 404) { setPhase("ready"); setExpired(false); setFault(false); setMessage("می‌توانی اطلاعات درخواست را کامل کنی؛ با همین شناسه ارسال می‌شود."); }
      else { setPhase("blocked"); setFault(true); setExpired(response.status === 401); setMessage(data.message ?? "بررسی نتیجه ممکن نشد؛ دوباره بررسی کن."); }
    }).catch(() => {
      if (!signal?.aborted) { setPhase("blocked"); setFault(true); setMessage("ارتباط برقرار نشد. برای جلوگیری از ثبت تکراری، نتیجهٔ همین شناسه را دوباره بررسی کن."); }
    });
  }, [operationKey]);
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("operation", operationKey);
    window.history.replaceState(null, "", url);
    const controller = new AbortController();
    void recover(controller.signal);
    return () => controller.abort();
  }, [operationKey, recover]);

  function fail(form: HTMLFormElement, text: string, fieldErrors: Record<string, string[]> = {}) {
    setMessage(text); setErrors(fieldErrors); setFault(true);
    requestAnimationFrame(() => (form.querySelector<HTMLElement>("[aria-invalid=true]") ?? feedback.current)?.focus());
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || phase !== "ready") return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const parsed = requestSchema.safeParse({ ...values, operationKey });
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) if (typeof issue.path[0] === "string") (fieldErrors[issue.path[0]] ??= []).push(issue.message);
      fail(form, "لطفاً بخش‌های مشخص‌شده را بررسی کن.", fieldErrors); return;
    }
    busy.current = true; setPhase("pending"); setErrors({}); setMessage(""); setExpired(false); setFault(false);
    try {
      const response = await fetch("/api/requests", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const data: RequestFeedback = await response.json();
      if (response.ok && data.ok && data.id) { setResult(data); return; }
      setExpired(response.status === 401);
      fail(form, data.message ?? "درخواست ثبت نشد؛ دوباره تلاش کن.", data.fieldErrors);
    } catch { fail(form, "پاسخ ارسال دریافت نشد. اطلاعاتت حفظ شده؛ با همین شناسه دوباره ارسال کن یا نتیجهٔ ثبت را بررسی کن."); }
    finally { busy.current = false; setPhase("ready"); }
  }
  if (result?.id) return <section className="dashboard-card request-confirmation" aria-labelledby="request-saved-title" data-testid="request-confirmation">
    <CheckCircle2 size={40} aria-hidden="true" /><h1 id="request-saved-title">درخواستت ثبت شده است.</h1>
    <p role="status">{result.replayed ? "نتیجهٔ ثبت قبلی پیدا شد؛ درخواست تکراری ساخته نشد." : "اطلاعات درخواست و رخداد ثبت آن در حساب تو ذخیره شد."}</p>
    <p>شناسهٔ پیگیری</p><bdi dir="ltr" className="request-identifier">{result.id}</bdi>
    <p>وضعیت فعلی: {result.status ? requestStatuses[result.status] : "ثبت‌شده"}</p>
    <p>مرحلهٔ بعد، بررسی نیازهاست. ثبت درخواست به معنی پذیرش پروژه یا توافق بر زمان و هزینه نیست؛ وضعیت ثبت‌شده را در جزئیات ببین.</p>
    <div className="request-actions"><Link href={`/dashboard/requests/${result.id}`} className={buttonClass()}>جزئیات و پیگیری درخواست</Link><Link href="/dashboard/requests" className={buttonClass("secondary")}>همهٔ درخواست‌ها</Link><Link href="/dashboard/requests/new" prefetch={false} className="text-link">ثبت یک درخواست تازه</Link></div>
  </section>;
  const disabled = phase === "checking" || phase === "pending";
  return <section className="dashboard-card request-form-card">
    <p className="eyebrow">از ایده‌ات بگو</p><h1>درخواست تازه</h1>
    <p className="muted">لازم نیست مشخصات فنی بدانی؛ هدف و نیازت را روشن توضیح بده. بخش‌های «الزامی» برای ثبت لازم‌اند.</p>
    <form className="request-form" method="post" action="/api/requests" noValidate onSubmit={submit} aria-busy={disabled} data-preserve-draft="true">
      <FormField id={`${prefix}-title`} label="عنوان پروژه (الزامی)" hint="یک عنوان کوتاه؛ مثلاً وب‌سایت معرفی یک کارگاه." error={errors.title?.[0]}>{(props) => <Input {...props} name="title" required minLength={3} maxLength={150} autoComplete="off" disabled={disabled} />}</FormField>
      <FormField id={`${prefix}-category`} label="نوع خدمات (الزامی)" error={errors.category?.[0]}>{(props) => <Select {...props} name="category" required defaultValue="" disabled={disabled}><option value="" disabled>نوع خدمات را انتخاب کن</option>{Object.entries(requestCategories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>}</FormField>
      <FormField id={`${prefix}-description`} label="توضیحات پروژه (الزامی)" hint="برای چه کسانی و با چه امکاناتی؟ بین ۲۰ تا ۶۰۰۰ نویسه. رمز، کلید دسترسی یا اطلاعات محرمانه ننویس." error={errors.description?.[0]}>{(props) => <Textarea {...props} name="description" required minLength={20} maxLength={6000} rows={7} disabled={disabled} />}</FormField>
      <div className="request-preferences">
        <FormField id={`${prefix}-budget`} label="بودجهٔ تقریبی (اختیاری)" hint="این بازه فقط ترجیح توست، نه قیمت خدمات نوایر." error={errors.budgetPreference?.[0]}>{(props) => <Select {...props} name="budgetPreference" defaultValue="UNDECIDED" disabled={disabled}>{Object.entries(budgetPreferences).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>}</FormField>
        <FormField id={`${prefix}-timeline`} label="زمان موردنظر (اختیاری)" hint="زمان نهایی پس از بررسی و توافق مشخص می‌شود." error={errors.timelinePreference?.[0]}>{(props) => <Select {...props} name="timelinePreference" defaultValue="UNDECIDED" disabled={disabled}>{Object.entries(timelinePreferences).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>}</FormField>
      </div>
      <FormField id={`${prefix}-url`} label="لینک مرتبط (اختیاری)" hint="لینک عمومی سایت فعلی یا یک نمونه؛ با https و بدون اطلاعات ورود." error={errors.relevantUrl?.[0]}>{(props) => <Input {...props} name="relevantUrl" type="url" dir="ltr" inputMode="url" maxLength={1000} autoComplete="url" disabled={disabled} />}</FormField>
      {message && <p ref={feedback} tabIndex={-1} className={fault ? "form-feedback field-error" : "form-feedback"} role={fault ? "alert" : "status"}>{message}</p>}
      {expired && <p className="account-notice">نشستت معتبر نیست. <a className="inline-link" target="_blank" rel="noopener noreferrer" href="/login?reauth=1&next=%2Fdashboard%2Frequests%2Fnew">ورود دوباره در زبانهٔ جدید</a>؛ پس از ورود، به این زبانه برگرد و نتیجه را بررسی کن. اطلاعات واردشده اینجا حفظ می‌شود.</p>}
      <div className="request-actions"><Button type="submit" disabled={phase !== "ready"}>{disabled ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}{phase === "pending" ? "در حال ثبت…" : phase === "checking" ? "در حال بررسی شناسه…" : "ثبت درخواست"}</Button><Button type="button" variant="secondary" disabled={disabled} onClick={() => { setPhase("checking"); void recover(); }}>بررسی نتیجهٔ ثبت</Button></div>
      <p className="field-hint">شناسهٔ ارسال در نشانی همین صفحه حفظ می‌شود. اگر پاسخ قطع شد یا صفحه دوباره باز شد، نتیجهٔ ثبت قبلی بررسی می‌شود؛ متن فرم در حافظهٔ مرورگر ذخیره نمی‌شود.</p>
      <noscript><p>برای استفادهٔ امن از فرم، اجرای جاوااسکریپت لازم است.</p></noscript>
    </form>
  </section>;
}

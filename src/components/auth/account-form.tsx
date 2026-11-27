"use client";

import { useId, useRef, useState, type ComponentProps, type FormEvent } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { Input, FormField } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { loginSchema, registrationSchema, changePasswordSchema, type AuthFeedback } from "@/shared/auth-contracts";
import { announceAccountChange } from "./auth-sync";
import { useClientReady } from "./use-client-ready";

function PasswordInput({ label, ...props }: ComponentProps<"input"> & { label: string }) {
  const [visible, setVisible] = useState(false);
  return <div className="password-control"><Input {...props} type={visible ? "text" : "password"} dir="ltr" /><button type="button" disabled={props.disabled} aria-label={`${visible ? "پنهان‌کردن" : "نمایش"} ${label}`} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}</button></div>;
}

export function AccountForm({ mode, next = "/dashboard" }: { mode: "login" | "register" | "password"; next?: string }) {
  const prefix = useId();
  const ready = useClientReady();
  const busy = useRef(false);
  const feedback = useRef<HTMLParagraphElement>(null);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const fields = mode === "password" ? ["currentPassword", "newPassword", "passwordConfirmation"]
    : mode === "register" ? ["name", "email", "password", "passwordConfirmation"] : ["email", "password"];
  const labels: Record<string, string> = { name: "نام نمایشی", email: "ایمیل", password: "رمز عبور", passwordConfirmation: "تکرار رمز عبور", currentPassword: "رمز عبور فعلی", newPassword: "رمز عبور جدید" };

  function showFailure(form: HTMLFormElement, fieldErrors: Record<string, string[]>, text: string) {
    setErrors(fieldErrors); setMessage(text); setSuccess(false);
    requestAnimationFrame(() => {
      const first = form.querySelector<HTMLElement>("[aria-invalid=true]");
      if (first) first.focus(); else feedback.current?.focus();
    });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy.current) return;
    const form = event.currentTarget;
    const values: Record<string, string> = {};
    for (const field of fields) values[field] = String(new FormData(form).get(field) ?? "");
    if (mode === "login" || mode === "register") values.next = next;
    const schema = mode === "register" ? registrationSchema : mode === "password" ? changePasswordSchema : loginSchema;
    const validation = schema.safeParse(values);
    if (!validation.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of validation.error.issues) {
        const field = issue.path[0]; if (typeof field === "string") (fieldErrors[field] ??= []).push(issue.message);
      }
      showFailure(form, fieldErrors, "لطفاً اطلاعات مشخص‌شده را بررسی کنید."); return;
    }
    busy.current = true; setPending(true); setErrors({}); setMessage(""); setSuccess(false);
    const endpoint = mode === "register" ? "sign-up/email" : mode === "password" ? "change-password" : "sign-in/email";
    try {
      const response = await fetch(`/api/auth/${endpoint}`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validation.data) });
      const result: AuthFeedback = await response.json();
      if (!response.ok || !result.ok) { showFailure(form, result.fieldErrors ?? {}, result.message ?? "انجام درخواست ممکن نشد. دوباره تلاش کنید."); return; }
      announceAccountChange();
      if (mode === "password") { form.reset(); setSuccess(true); setMessage("رمز عبور تغییر کرد و نشست‌های قبلی بسته شدند."); feedback.current?.focus(); }
      else if (result.redirectTo && /^\/(dashboard|admin)(?:\/|$)/.test(result.redirectTo)) window.location.assign(result.redirectTo);
      // Auth transitions reload the document to discard stale router/account state.
      else window.location.assign(new URL("/dashboard", window.location.origin).href);
    } catch { showFailure(form, {}, "ارتباط با سرویس برقرار نشد. دوباره تلاش کنید."); }
    finally { busy.current = false; setPending(false); }
  }

  const action = `/api/auth/${mode === "register" ? "sign-up/email" : mode === "password" ? "change-password" : "sign-in/email"}`;
  return <form className="account-form" method="post" action={action} noValidate onSubmit={submit} aria-busy={pending || !ready}>
    {fields.map((field) => {
      const label = labels[field]!;
      const isPassword = field.toLowerCase().includes("password");
      const autoComplete = field === "name" ? "name" : field === "email" ? "email"
        : field === "currentPassword" || (mode === "login" && field === "password") ? "current-password" : "new-password";
      return <FormField key={field} id={`${prefix}-${field}`} label={label} error={errors[field]?.[0]}
        hint={(field === "password" && mode === "register") || field === "newPassword" ? "بین ۱۲ تا ۱۲۸ نویسه؛ رمز متفاوت و مخصوص این حساب انتخاب کنید." : undefined}>
        {(props) => isPassword ? <PasswordInput {...props} name={field} label={label} required autoComplete={autoComplete} minLength={12} maxLength={128} disabled={pending || !ready} />
          : <Input {...props} name={field} required autoComplete={autoComplete} type={field === "email" ? "email" : "text"} inputMode={field === "email" ? "email" : "text"} dir={field === "email" ? "ltr" : "rtl"} maxLength={field === "name" ? 100 : 191} disabled={pending || !ready} />}
      </FormField>;
    })}
    {message && <p ref={feedback} tabIndex={-1} role={success ? "status" : "alert"} className={success ? "form-feedback form-success" : "form-feedback field-error"}>{message}</p>}
    <Button type="submit" disabled={pending || !ready} className="account-submit">{pending && <LoaderCircle size={18} className="spin" aria-hidden="true" />}{pending ? "در حال بررسی…" : mode === "register" ? "ساخت حساب" : mode === "password" ? "تغییر رمز عبور" : "ورود به حساب"}</Button>
    <noscript><p className="account-notice">برای استفاده از فرم، اجرای جاوااسکریپت در مرورگر لازم است.</p></noscript>
    {mode === "password" && <p className="field-hint">با تغییر رمز، نشست‌های قبلی بسته می‌شوند. اگر بیش از یک ساعت از ورود گذشته، <a href="/login?reauth=1" className="inline-link">دوباره وارد حساب شوید</a>.</p>}
  </form>;
}

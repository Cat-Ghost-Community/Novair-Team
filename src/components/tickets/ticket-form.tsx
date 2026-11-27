"use client";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { LoaderCircle, Send, ShieldCheck } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { Input, Select, Textarea, FormField } from "@/components/ui/form";
import { useClientReady } from "@/components/auth/use-client-ready";
import { ticketCategories, ticketStatuses, ticketCreateSchema, ticketReplySchema, ticketNoteSchema, ticketStateSchema, type TicketFeedback, type SupportStatus } from "@/shared/ticket-contracts";
export function SupportForm({ kind, admin = false, id, version = 0, status = "OPEN", operationKey, projects = [] }: { kind: "create" | "reply" | "note" | "state"; admin?: boolean; id?: string; version?: number; status?: SupportStatus; operationKey: string; projects?: { id: string; title: string }[] }) {
  const ready = useClientReady(), prefix = useId(); const busy = useRef(false), committed = useRef<Record<string, unknown> | null>(null), feedback = useRef<HTMLParagraphElement>(null);
  const proposed = useRef<Record<string, unknown> | null>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const [pending, setPending] = useState(false), [message, setMessage] = useState(""), [errors, setErrors] = useState<Record<string, string[]>>({}), [expired, setExpired] = useState(false), [confirm, setConfirm] = useState(false);
  const base = admin ? "/api/admin/tickets" : "/api/tickets", home = admin ? "/admin/tickets" : "/dashboard/tickets";
  function report(form: HTMLFormElement | null, text: string, fields: Record<string, string[]> = {}) { setMessage(text); setErrors(fields); requestAnimationFrame(() => (form?.querySelector<HTMLElement>("[aria-invalid=true]") ?? feedback.current)?.focus()); }
  function destination(result: TicketFeedback) { if (!result.result?.id || !/^[a-zA-Z0-9-]{20,36}$/.test(result.result.id)) throw Error("Invalid result"); window.location.assign(new URL(`${home}/${result.result.id}?saved=1`, window.location.origin).href); }
  async function send(payload: Record<string, unknown>) {
    if (busy.current) return; busy.current = true; committed.current = payload; setPending(true); setErrors({}); setMessage("");
    const url = new URL(location.href); url.searchParams.set("supportOp", operationKey); url.searchParams.set("supportIntent", kind); history.replaceState(null, "", url);
    try { const response = await fetch(kind === "create" ? base : `${base}/${id}/${kind === "reply" ? "messages" : kind === "note" ? "notes" : "status"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const data: TicketFeedback = await response.json();
      if (response.ok && data.ok && data.result) { destination(data); return; } if ([400,413,415,429].includes(response.status)) committed.current = null; setExpired(response.status === 401); report(document.getElementById(`${prefix}-form`) as HTMLFormElement, data.message ?? "ارسال انجام نشد؛ متن حفظ شده است.", data.fieldErrors);
    } catch { report(null, "پاسخ دریافت نشد؛ متن و شناسهٔ همین ارسال حفظ شده‌اند. نتیجه را بررسی کن یا همان ارسال را تکرار کن."); }
    finally { busy.current = false; setPending(false); setConfirm(false); }
  }
  async function recover() { if (busy.current) return; busy.current = true; setPending(true); try { const response = await fetch(`${base}/operations/${operationKey}`, { cache: "no-store" }); const data: TicketFeedback = await response.json(); if (response.ok && data.result) destination(data); else { setExpired(response.status === 401); report(null, response.status === 404 ? "هنوز نتیجه‌ای برای این شناسه ثبت نشده؛ می‌توانی همان ارسال را تکرار کنی." : data.message ?? "بررسی نتیجه ممکن نشد."); } } catch { report(null, "بررسی نتیجه ممکن نشد؛ متن را نگه دار و دوباره تلاش کن."); } finally { busy.current = false; setPending(false); } }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!ready || busy.current) return; const form = event.currentTarget; const values = Object.fromEntries(new FormData(form)); const value = { ...values, operationKey, ...(kind === "create" ? { projectId: values.projectId || null } : kind === "state" ? { expectedVersion: version } : {}) }; const schema = kind === "create" ? ticketCreateSchema : kind === "reply" ? ticketReplySchema : kind === "note" ? ticketNoteSchema : ticketStateSchema; const parsed = schema.safeParse(value);
    if (!parsed.success) { const fields: Record<string, string[]> = {}; for (const i of parsed.error.issues) if (typeof i.path[0] === "string") (fields[i.path[0]] ??= []).push(i.message); report(form, "لطفاً بخش‌های مشخص‌شده را بررسی کن.", fields); return; }
    // Once attempted, this key remains tied to the exact payload until a result is recovered.
    if (committed.current && JSON.stringify(committed.current) !== JSON.stringify(parsed.data)) { report(form, "متن با ارسال قبلی این شناسه فرق دارد. ابتدا نتیجهٔ قبلی را بررسی کن؛ برای پیام تازه پس از بررسی، صفحه را بدون شناسهٔ قبلی باز کن."); return; }
    if (kind === "state") { proposed.current = parsed.data; setConfirm(true); } else void send(parsed.data);
  }
  const title = kind === "create" ? "ثبت تیکت" : kind === "reply" ? "ارسال پاسخ" : kind === "note" ? "ثبت یادداشت داخلی" : "بررسی تغییر وضعیت";
  const field = (name: string, label: string, content: (props: { id: string; "aria-describedby"?: string; "aria-invalid": boolean }) => React.ReactNode, hint?: string) => <FormField id={`${prefix}-${name}`} label={label} hint={hint} error={errors[name]?.[0]}>{content}</FormField>;
  return <form id={`${prefix}-form`} onSubmit={submit} method="post" noValidate className="support-form" aria-busy={pending}>
    <fieldset disabled={!ready || pending}>
      {kind === "create" && <>{field("subject", "موضوع تیکت (الزامی)", p => <Input {...p} name="subject" required maxLength={150} autoComplete="off"/>)}{field("category", "دستهٔ پیام (الزامی)", p => <Select {...p} name="category" required defaultValue="GENERAL">{Object.entries(ticketCategories).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</Select>)}{field("projectId", "پروژهٔ مرتبط (اختیاری)", p => <Select {...p} name="projectId" defaultValue=""><option value="">بدون پروژهٔ مرتبط</option>{projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</Select>, "فقط پروژه‌های متعلق به همین حساب قابل انتخاب‌اند.")}</>}
      {kind !== "state" && field("body", kind === "note" ? "یادداشت خصوصی مدیران (الزامی)" : kind === "create" ? "شرح موضوع (الزامی)" : "متن پاسخ (الزامی)", p => <Textarea {...p} name="body" required rows={6} minLength={3} maxLength={kind === "note" ? 4000 : 8000} dir="auto"/>, kind === "note" ? "این یادداشت فقط در بخش مدیریت نمایش داده می‌شود." : "متن ساده؛ اطلاعات ورود و رمز عبور را اینجا ننویس. ارسال فایل و اعلان ایمیلی فعال نیست.")}
      {kind === "state" && field("toStatus", "وضعیت بعدی", p => <Select {...p} name="toStatus" defaultValue={status === "CLOSED" ? "WAITING_SUPPORT" : "CLOSED"}>{status === "CLOSED" ? <option value="WAITING_SUPPORT">بازگشایی برای پشتیبانی</option> : <><option value="CLOSED">بستن تیکت</option>{admin && status !== "WAITING_CUSTOMER" && <option value="WAITING_CUSTOMER">منتظر پاسخ مشتری</option>}{admin && status !== "WAITING_SUPPORT" && <option value="WAITING_SUPPORT">منتظر پاسخ پشتیبانی</option>}</>}</Select>)}
      <Button type="submit"><span>{pending ? <LoaderCircle size={18} className="loading-spinner" aria-hidden="true"/> : kind === "note" ? <ShieldCheck size={18} aria-hidden="true"/> : <Send size={18} aria-hidden="true"/>}</span>{pending ? "در حال ثبت…" : title}</Button>
    </fieldset>
    <p ref={feedback} role="status" aria-live="polite" tabIndex={-1} className="support-feedback">{message}</p>
    <p className="field-hint">اگر پاسخ ارسال قبلی نرسیده، نتیجهٔ همین شناسه را بررسی کن. متنِ ارسال‌نشده فقط در همین فرم باز حفظ می‌شود.</p>
    <div className="support-actions"><Button onClick={recover} disabled={!ready || pending} variant="secondary">بررسی نتیجهٔ همین ارسال</Button><Link href={id ? `${home}/${id}` : `${home}/new`} className="text-link">تازه‌خوانی و شروع ارسال تازه</Link></div>
    {expired && <a className={buttonClass("secondary")} href={`/login?notice=expired&next=${encodeURIComponent(id ? `${home}/${id}` : `${home}/new`)}`}>ورود دوباره به حساب</a>}
    <Dialog.Root open={confirm} onOpenChange={value => { if (!pending) setConfirm(value); }}><Dialog.Portal><Dialog.Overlay className="dialog-overlay"/><Dialog.Content className="dialog-content" onOpenAutoFocus={event => { event.preventDefault(); cancel.current?.focus(); }} onCloseAutoFocus={event => { event.preventDefault(); document.getElementById(`${prefix}-form`)?.querySelector<HTMLButtonElement>('button[type="submit"]')?.focus(); }}><Dialog.Title>تغییر وضعیت تیکت را ثبت کنیم؟</Dialog.Title><Dialog.Description>وضعیت فعلی: {ticketStatuses[status]}. نتیجه فقط پس از ثبت در پایگاه داده تأیید می‌شود؛ اگر گفتگو تغییر کرده باشد باید اطلاعات تازه را بخوانی.</Dialog.Description><div className="support-actions"><Button disabled={pending} onClick={() => { if (proposed.current) void send(proposed.current); }}>تأیید و ثبت وضعیت</Button><Dialog.Close asChild><Button ref={cancel} variant="secondary" disabled={pending}>بازگشت</Button></Dialog.Close></div></Dialog.Content></Dialog.Portal></Dialog.Root>
  </form>;
}
export function SupportReadReceipt({ admin, id, through, unread }: { admin: boolean; id: string; through: number; unread: boolean }) {
  const [state,setState] = useState("در حال ثبت خوانده‌شدن پیام‌های نمایش‌داده‌شده…"); const [attempt,setAttempt] = useState(0);
  useEffect(() => { const abort = new AbortController(); if (!unread || through === 0) return;
    fetch(`/api/${admin ? "admin/" : ""}tickets/${id}/read`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ through }), signal: abort.signal }).then(async r => { if (!r.ok) throw Error(); setState("پیام‌های نمایش‌داده‌شده خوانده شدند."); }).catch(() => { if (!abort.signal.aborted) setState("ثبت خوانده‌شدن ممکن نشد؛ دوباره تلاش کن."); }); return () => abort.abort();
  }, [admin,id,through,unread,attempt]);
  if (!unread || !through) return null;
  return <div className="support-read"><p role="status">{state}</p>{state.startsWith("ثبت خوانده‌شدن ممکن") && <Button variant="secondary" onClick={() => setAttempt(v=>v+1)}>ثبت دوبارهٔ خوانده‌شدن</Button>}</div>;
}

"use client";
import { useRef, useState, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, FormField } from "@/components/ui/form";
import { useClientReady } from "@/components/auth/use-client-ready";
import { reviewSchema, conversionSchema, projectStatusSchema, projectUpdateSchema, noteSchema, projectStatuses, type ManagementFeedback } from "@/shared/management-contracts";
import { requestStatuses } from "@/shared/request-contracts";
import type { ManagementAction, AdminProjectDetail } from "@/server/management/service";
function navigate(result: NonNullable<ManagementFeedback["result"]>, key: string, kind: ManagementAction) {
    if (!/^[a-zA-Z0-9-]{20,36}$/.test(result.id) || !["request", "project"].includes(result.resource))
        throw Error("Invalid result.");
    window.location.assign(new URL(`/admin/${result.resource === "request" ? "requests" : "projects"}/${result.id}?operation=${key}&intent=${kind}`, window.location.origin).href);
}
export function ManagementForm({ action, id, version = 0, targets = [], project, initialKey }: {
    action: ManagementAction;
    id: string;
    version?: number;
    targets?: string[];
    project?: AdminProjectDetail;
    initialKey?: string;
}) {
    const ready = useClientReady();
    const busy = useRef(false);
    const key = useRef<string | undefined>(initialKey);
    const snapshot = useRef<Record<string, unknown> | null>(null);
    const feedback = useRef<HTMLParagraphElement>(null);
    const submitRef = useRef<HTMLButtonElement>(null);
    const cancelRef = useRef<HTMLButtonElement>(null);
    const [selection, setSelection] = useState(targets[0] ?? "");
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [message, setMessage] = useState("");
    const [pending, setPending] = useState(false);
    const [open, setOpen] = useState(false);
    const [expired, setExpired] = useState(false);
    const requestAction = ["review", "convert", "request-note"].includes(action);
    const note = action.endsWith("-note");
    const endpoint = `/api/admin/${requestAction ? "requests" : "projects"}/${id}/${({ review: "review", convert: "convert", "request-note": "notes", "project-note": "notes", "project-status": "status", "project-update": "update" } as const)[action]}`;
    const heading = note ? "یادداشت خصوصی" : action === "review" ? "تصمیم بررسی" : action === "convert" ? "ایجاد پروژه از درخواست" : action === "project-status" ? "تغییر وضعیت پروژه" : "اطلاعات و برنامهٔ پروژه";
    const buttonLabel = note ? "ثبت یادداشت خصوصی" : action === "review" ? "بررسی و تأیید تصمیم" : action === "convert" ? "ایجاد پروژهٔ واقعی" : action === "project-status" ? "بررسی تغییر وضعیت" : "ذخیرهٔ اطلاعات پروژه";
    const confirmation = ["review", "convert", "project-status"].includes(action);
    const statusLabels: Record<string, string> = action === "review" ? requestStatuses : projectStatuses;
    function failure(text: string, fieldErrors: Record<string, string[]> = {}) { setMessage(text); setErrors(fieldErrors); requestAnimationFrame(() => { (document.getElementById(`management-${action}`)?.querySelector<HTMLElement>("[aria-invalid=true]") ?? feedback.current)?.focus(); }); }
    async function send() {
        if (busy.current || !snapshot.current)
            return;
        busy.current = true;
        setPending(true);
        setMessage("");
        setErrors({});
        const url = new URL(window.location.href);
        url.searchParams.set("operation", key.current!);
        url.searchParams.set("intent", action);
        window.history.replaceState(null, "", url);
        try {
            const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(snapshot.current) });
            const data: ManagementFeedback = await response.json();
            if (response.ok && data.ok && data.result) {
                navigate(data.result, key.current!, action);
                return;
            }
            setExpired(response.status === 401);
            setOpen(false);
            failure(data.message ?? "عملیات ثبت نشد؛ دوباره بررسی کنید.", data.fieldErrors);
        }
        catch {
            setOpen(false);
            failure("پاسخ عملیات دریافت نشد. نتیجهٔ همین شناسه را بررسی کنید یا همان ارسال را دوباره انجام دهید.");
        }
        finally {
            busy.current = false;
            setPending(false);
        }
    }
    async function recover() {
        if (!key.current) {
            failure("هنوز عملیاتی ارسال نشده است.");
            return;
        }
        if (busy.current)
            return;
        busy.current = true;
        setPending(true);
        try {
            const response = await fetch(`/api/admin/operations/${key.current}`, { cache: "no-store" });
            const data: ManagementFeedback = await response.json();
            if (response.ok && data.result)
                navigate(data.result, key.current, action);
            else {
                setExpired(response.status === 401);
                failure(data.message ?? "نتیجه‌ای ثبت نشده؛ همان ارسال را تکرار کنید.");
            }
        }
        catch {
            failure("بررسی نتیجه ممکن نشد؛ شناسه و اطلاعات این فرم حفظ شده‌اند.");
        }
        finally {
            busy.current = false;
            setPending(false);
        }
    }
    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy.current || !ready)
            return;
        const raw = Object.fromEntries(new FormData(event.currentTarget));
        key.current ??= crypto.randomUUID();
        const common = { operationKey: key.current, expectedVersion: version };
        const input = note ? { operationKey: key.current, body: raw.body } : action === "convert" ? common : action === "review" ? { ...common, toStatus: selection, ...(selection === "DECLINED" ? { publicExplanation: raw.publicExplanation, privateNote: raw.privateNote } : {}) } : action === "project-status" ? { ...common, toStatus: selection } : { ...common, title: raw.title, description: raw.description, assigneeId: raw.assigneeId || null, plannedStart: raw.plannedStart || null, targetCompletion: raw.targetCompletion || null };
        const schema = note ? noteSchema : action === "convert" ? conversionSchema : action === "review" ? reviewSchema : action === "project-status" ? projectStatusSchema : projectUpdateSchema;
        const parsed = schema.safeParse(input);
        if (!parsed.success) {
            const fieldErrors: Record<string, string[]> = {};
            for (const issue of parsed.error.issues)
                if (typeof issue.path[0] === "string")
                    (fieldErrors[issue.path[0]] ??= []).push(issue.message);
            failure("بخش‌های مشخص‌شده را بررسی کنید.", fieldErrors);
            return;
        }
        snapshot.current = parsed.data;
        setErrors({});
        setMessage("");
        if (confirmation)
            setOpen(true);
        else
            void send();
    }
    const field = (name: string, label: string, control: (props: {
        id: string;
        "aria-describedby"?: string;
        "aria-invalid": boolean;
    }) => React.ReactNode, hint?: string) => <FormField id={`admin-${action}-${name}`} label={label} hint={hint} error={errors[name]?.[0]}>{control}</FormField>;
    return <section className="dashboard-card management-form-card"><h2>{heading}</h2>{note && <p className="management-private-note">این متن فقط برای مدیران است؛ در اطلاعات یا تاریخچهٔ مشتری نمایش داده نمی‌شود.</p>}
    <form id={`management-${action}`} method="post" action={endpoint} onSubmit={submit} noValidate aria-busy={pending || !ready} data-preserve-draft="true" className="management-form">
      {note && field("body", "متن یادداشت خصوصی", props => <Textarea {...props} name="body" required minLength={3} maxLength={4000} rows={4} disabled={pending || !ready}/>)}
      {(action === "review" || action === "project-status") && field("toStatus", "اقدام بعدی", props => <Select {...props} name="toStatus" value={selection} onChange={event => setSelection(event.target.value)} disabled={pending || !ready}>{targets.map(value => <option key={value} value={value}>{statusLabels[value]}</option>)}</Select>)}
      {action === "review" && selection === "DECLINED" && <>{field("publicExplanation", "دلیل قابل‌نمایش به مشتری (الزامی)", props => <Textarea {...props} name="publicExplanation" required minLength={10} maxLength={2000} rows={4} disabled={pending || !ready}/>, "این توضیح در حساب مشتری نمایش داده می‌شود؛ اطلاعات داخلی ننویسید.")}{field("privateNote", "یادداشت خصوصی مدیر (اختیاری)", props => <Textarea {...props} name="privateNote" maxLength={4000} rows={3} disabled={pending || !ready}/>)}</>}
      {action === "convert" && <p>این اقدام یک پروژهٔ برنامه‌ریزی‌شده و متصل به همین درخواست می‌سازد. پذیرش به‌تنهایی شروع اجرا نیست؛ مسئول و زمان‌بندی را در پروژه تنظیم کنید.</p>}
      {action === "project-update" && project && <>{field("title", "عنوان پروژه", props => <Input {...props} name="title" defaultValue={project.title} required maxLength={150} disabled={pending || !ready}/>)}{field("description", "شرح پروژه", props => <Textarea {...props} name="description" defaultValue={project.description} required minLength={20} maxLength={6000} rows={5} disabled={pending || !ready}/>)}{field("assigneeId", "مدیر مسئول (اختیاری)", props => <Select {...props} name="assigneeId" defaultValue={project.assignee?.id ?? ""} disabled={pending || !ready}><option value="">بدون مسئول</option>{project.assignee && !project.assignees.some(person => person.id === project.assignee!.id) && <option value={project.assignee.id}>{project.assignee.name}{project.assignee.eligible ? "" : " — واجد شرایط نیست؛ تغییر دهید"}</option>}{project.assignees.map(person => <option value={person.id} key={person.id}>{person.name}</option>)}</Select>, "فقط مدیر فعال موجود قابل انتخاب است.")}<div className="management-dates">{field("plannedStart", "شروع برنامه‌ریزی‌شده (اختیاری)", props => <Input {...props} name="plannedStart" type="date" dir="ltr" defaultValue={project.plannedStart ?? ""} min="2000-01-01" max="2100-12-31" disabled={pending || !ready}/>)}{field("targetCompletion", "پایان هدف (اختیاری)", props => <Input {...props} name="targetCompletion" type="date" dir="ltr" defaultValue={project.targetCompletion ?? ""} min="2000-01-01" max="2100-12-31" disabled={pending || !ready}/>)}</div><p className="field-hint">تاریخ‌ها در کنترل تقویم به میلادی وارد می‌شوند. این برنامهٔ داخلی، تضمین زمان تحویل نیست.</p></>}
      {message && <p ref={feedback} tabIndex={-1} role="alert" className="form-feedback field-error">{message}</p>}
      {expired && <p><a href={`/login?reauth=1&next=${encodeURIComponent(`/admin/${requestAction ? "requests" : "projects"}/${id}`)}`} target="_blank" rel="noopener noreferrer" className="inline-link">ورود دوباره در زبانهٔ جدید</a></p>}
      <div className="request-actions"><Button ref={submitRef} type="submit" disabled={pending || !ready}>{pending ? <LoaderCircle className="spin" size={18} aria-hidden="true"/> : <ShieldCheck size={18} aria-hidden="true"/>}{pending ? "در حال ارسال…" : buttonLabel}</Button><Button type="button" variant="secondary" disabled={pending || !ready} onClick={() => void recover()}>بررسی نتیجهٔ عملیات</Button>{message && <Button type="button" variant="ghost" onClick={() => window.location.reload()}>خواندن جزئیات تازه</Button>}</div>
    </form>
    <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Portal><Dialog.Overlay className="dialog-overlay"/><Dialog.Content className="dialog-content management-confirm" dir="rtl" onOpenAutoFocus={event => { event.preventDefault(); cancelRef.current?.focus(); }} onCloseAutoFocus={event => { event.preventDefault(); submitRef.current?.focus(); }}><Dialog.Title className="dialog-title">تأیید {action === "convert" ? "ایجاد پروژه" : action === "review" ? requestStatuses[selection as keyof typeof requestStatuses] : projectStatuses[selection as keyof typeof projectStatuses]}</Dialog.Title><Dialog.Description className="muted">{action === "convert" ? "از درخواست پذیرفته‌شده فقط یک پروژه ساخته می‌شود. اطلاعات اصلی مشتری تغییر نمی‌کند." : action === "review" && selection === "ACCEPTED" ? "پذیرش تصمیم نهایی بررسی است. ایجاد پروژهٔ اجرایی اقدام جداگانه‌ای خواهد بود." : action === "review" && selection === "DECLINED" ? "رد درخواست نهایی است و توضیح مشخص‌شده برای مشتری نمایش داده می‌شود. یادداشت خصوصی جدا می‌ماند." : "تغییر واقعی وضعیت و نام مدیر اقدام‌کننده در تاریخچه ثبت می‌شود."}</Dialog.Description><div className="request-actions"><Dialog.Close asChild><Button ref={cancelRef} variant="secondary" disabled={pending}>بازگشت بدون تغییر</Button></Dialog.Close><Button disabled={pending} onClick={() => void send()}>{pending ? "در حال ثبت…" : "تأیید و ثبت"}</Button></div></Dialog.Content></Dialog.Portal></Dialog.Root>
  </section>;
}

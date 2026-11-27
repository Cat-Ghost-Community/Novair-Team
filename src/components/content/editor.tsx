"use client";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LoaderCircle, Save, Eye, Archive } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { Input, Select, Textarea, FormField, Checkbox } from "@/components/ui/form";
import { useClientReady } from "@/components/auth/use-client-ready";
import { requestCategories } from "@/shared/request-contracts";
import { contentValidationMessage, serviceContentSchema, portfolioContentSchema, faqContentSchema, publicSettingsSchema, type ContentKind, type ContentFeedback } from "@/shared/content-contracts";
type Kind = ContentKind | "settings";
export function ContentEditor({ kind, id, version, initial, operationKey, assets = [], references = 0 }: {
    kind: Kind;
    id?: string;
    version: number;
    initial: Record<string, unknown>;
    operationKey: string;
    assets?: {
        key: string;
        label: string;
    }[];
    references?: number;
}) {
    const ready = useClientReady(), prefix = useId(), busy = useRef(false), cancel = useRef<HTMLButtonElement>(null), feedback = useRef<HTMLParagraphElement>(null), form = useRef<HTMLFormElement>(null);
    const attempted = useRef<Record<string, unknown> | null>(null), proposed = useRef<{
        action: "save" | "delete";
        body: Record<string, unknown>;
    } | null>(null);
    const [dirty, setDirty] = useState(false), [pending, setPending] = useState(false), [confirm, setConfirm] = useState(false), [message, setMessage] = useState(""), [errors, setErrors] = useState<Record<string, string[]>>({}), [expired, setExpired] = useState(false);
    const [confirmationTitle, setConfirmationTitle] = useState("تغییر محتوا ثبت شود؟");
    const base = `/api/admin/content/${kind}`, home = `/admin/content/${kind}`, savedHref = kind === "settings" ? home : `${home}/${id ?? "new"}`;
    useEffect(() => { const warn = (e: BeforeUnloadEvent) => { if (dirty && !busy.current) {
        e.preventDefault();
        e.returnValue = "";
    } }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [dirty]);
    function report(text: string, fields: Record<string, string[]> = {}) { setMessage(text); setErrors(fields); requestAnimationFrame(() => (form.current?.querySelector<HTMLElement>("[aria-invalid=true]") ?? feedback.current)?.focus()); }
    function destination(data: ContentFeedback) {
        const r = data.result;
        if (!r || !["services", "portfolio", "faq", "settings"].includes(r.kind) || (r.kind !== "settings" && !/^[a-zA-Z0-9-]{20,36}$/.test(r.id)))
            throw Error("Invalid content result");
        setDirty(false);
        busy.current = true;
        window.location.assign(r.kind === "settings" ? "/admin/content/settings?saved=1" : `/admin/content/${r.kind}${proposed.current?.action === "delete" || new URL(location.href).searchParams.get("contentIntent") === "delete" ? "" : `/${r.id}`}?saved=1`);
    }
    async function send(action: "save" | "delete", body: Record<string, unknown>) {
        if (busy.current)
            return;
        busy.current = true;
        attempted.current = { action, ...body };
        setPending(true);
        setErrors({});
        setMessage("");
        const url = new URL(location.href);
        url.searchParams.set("contentOp", operationKey);
        url.searchParams.set("contentIntent", action);
        history.replaceState(null, "", url);
        try {
            const response = await fetch(`${base}${kind !== "settings" && id ? `/${id}` : ""}${action === "delete" ? "/delete" : ""}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
            const data: ContentFeedback = await response.json();
            if (response.ok && data.ok && data.result) {
                destination(data);
                return;
            }
            if ([400, 413, 415, 429].includes(response.status))
                attempted.current = null;
            setExpired(response.status === 401);
            report(data.message ?? "ذخیره انجام نشد؛ متن فعلی حفظ شده است.", data.fieldErrors);
        }
        catch {
            report("پاسخ ذخیره دریافت نشد؛ ابتدا نتیجهٔ همین شناسه را بررسی کن یا همان ذخیره را تکرار کن. متن در فرم باز حفظ شده است.");
        }
        finally {
            busy.current = false;
            setPending(false);
            setConfirm(false);
        }
    }
    async function recover() {
        if (busy.current)
            return;
        busy.current = true;
        setPending(true);
        try {
            const response = await fetch(`/api/admin/content/operations/${operationKey}`, { cache: "no-store" });
            const data: ContentFeedback = await response.json();
            if (response.ok && data.result)
                destination(data);
            else {
                setExpired(response.status === 401);
                report(response.status === 404 ? "هنوز نتیجه‌ای برای این شناسه ثبت نشده؛ می‌توانی همان ذخیره را تکرار کنی." : data.message ?? "بررسی نتیجه ممکن نشد.");
            }
        }
        catch {
            report("بررسی نتیجه ممکن نشد؛ متن را نگه دار و دوباره تلاش کن.");
        }
        finally {
            busy.current = false;
            setPending(false);
        }
    }
    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!ready || busy.current)
            return;
        const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        const action = submitter?.dataset.action === "delete" ? "delete" : "save";
        const values = Object.fromEntries(new FormData(event.currentTarget));
        let content: unknown = values;
        if (kind === "settings")
            content = { ...values, servicesFallback: values.servicesFallback === "on", faqFallback: values.faqFallback === "on" };
        else
            content = { ...values, sortOrder: Number(values.sortOrder), published: submitter?.dataset.publish === "true", ...(kind === "services" ? { category: values.category || null, highlights: String(values.highlights ?? "").split("\n").map(v => v.trim()).filter(Boolean) } : {}), ...(kind === "portfolio" ? { technologies: String(values.technologies ?? "").split("\n").map(v => v.trim()).filter(Boolean), imageKey: values.imageKey || null, externalUrl: values.externalUrl || null } : {}) };
        const schema = kind === "settings" ? publicSettingsSchema : kind === "services" ? serviceContentSchema : kind === "portfolio" ? portfolioContentSchema : faqContentSchema;
        if (action === "save") {
            const p = schema.safeParse(content);
            if (!p.success) {
                const fields: Record<string, string[]> = {};
                for (const issue of p.error.issues)
                    if (typeof issue.path[0] === "string")
                        (fields[issue.path[0]] ??= []).push(contentValidationMessage(issue.message));
                report("بخش‌های مشخص‌شده را بررسی کن.", fields);
                return;
            }
            content = p.data;
        }
        else
            content = {};
        const body = { operationKey, expectedVersion: version, content };
        if (attempted.current && JSON.stringify(attempted.current) !== JSON.stringify({ action, ...body })) {
            report("این شناسه به ذخیرهٔ قبلی متصل است. ابتدا نتیجه را بررسی کن؛ برای تغییر متن، نسخهٔ ذخیره‌شده را در زبانهٔ تازه مقایسه کن و ذخیرهٔ تازه‌ای آغاز کن.");
            return;
        }
        proposed.current = { action, body };
        setConfirmationTitle(action === "delete" ? "پیش‌نویس حذف شود؟" : (content as Record<string, unknown>).published ? "محتوا عمومی شود؟" : "محتوا از انتشار خارج شود؟");
        if (action === "delete" || (kind !== "settings" && ((content as Record<string, unknown>).published || initial.published)))
            setConfirm(true);
        else
            void send(action, body);
    }
    const value = (name: string) => typeof initial[name] === "string" ? initial[name] as string : "";
    const lines = (name: string) => Array.isArray(initial[name]) ? (initial[name] as string[]).join("\n") : "";
    const field = (name: string, label: string, children: (props: {
        id: string;
        "aria-describedby"?: string;
        "aria-invalid": boolean;
    }) => ReactNode, hint?: string) => <FormField id={`${prefix}-${name}`} label={label} hint={hint} error={errors[name]?.[0]}>{children}</FormField>;
    return <form ref={form} className="cms-editor" onSubmit={submit} onChange={() => setDirty(true)} noValidate method="post" aria-busy={pending}>
    <fieldset disabled={!ready || pending}>
      {kind === "settings" ? <>
        {field("introduction", "معرفی کوتاه استودیو (الزامی)", p => <Textarea {...p} name="introduction" defaultValue={value("introduction")} maxLength={350} rows={3} required dir="auto"/>)}
        {field("footerText", "متن کوتاه پایین صفحه (الزامی)", p => <Input {...p} name="footerText" defaultValue={value("footerText")} maxLength={150} required/>)}
        <div className="cms-field-grid">{([["email", "ایمیل عمومی"], ["phone", "شمارهٔ عمومی"], ["telegram", "لینک پروفایل تلگرام"], ["github", "لینک پروفایل گیت‌هاب"], ["instagram", "لینک پروفایل اینستاگرام"], ["aparat", "لینک پروفایل آپارات"]] as const).map(([name, label]) => <div key={name}>{field(name, `${label} (اختیاری)`, p => <Input {...p} name={name} defaultValue={value(name)} maxLength={name === "email" ? 191 : name === "phone" ? 22 : 500} dir="ltr" autoComplete="off"/>, "فقط اطلاعاتی را وارد کن که قصد انتشار عمومی آن را داری؛ خالی یعنی بدون نمایش.")}</div>)}</div>
        <label className="cms-check"><Checkbox name="servicesFallback" defaultChecked={initial.servicesFallback === true}/>اگر خدمت منتشرشده نداریم، معرفی پیش‌فرض خدمات نمایش داده شود.</label>
        <label className="cms-check"><Checkbox name="faqFallback" defaultChecked={initial.faqFallback === true}/>اگر FAQ منتشرشده نداریم، پاسخ‌های تحریریه نمایش داده شوند.</label>
        <p className="account-notice">با اولین انتشار یا انتشار دوبارهٔ خدمات و FAQ، پیش‌فرض همان بخش خاموش می‌شود. پس از خروج همهٔ موارد از انتشار، بخش خالیِ روشن نمایش داده می‌شود؛ بازگرداندن پیش‌فرض فقط انتخاب صریح همین صفحه است.</p>
      </> : <>
        {kind === "faq" ? <>{field("question", "پرسش (الزامی)", p => <Input {...p} name="question" defaultValue={value("question")} maxLength={255} required dir="auto"/>)}{field("answer", "پاسخ (الزامی)", p => <Textarea {...p} name="answer" defaultValue={value("answer")} maxLength={6000} rows={7} required dir="auto"/>, "متن ساده؛ نشانه‌گذاری HTML اجرا نمی‌شود.")}</> : <>
          {field("title", "عنوان (الزامی)", p => <Input {...p} name="title" defaultValue={value("title")} maxLength={150} required dir="auto"/>)}
          {field("summary", "معرفی کوتاه عمومی (الزامی)", p => <Textarea {...p} name="summary" defaultValue={value("summary")} maxLength={500} rows={4} required dir="auto"/>, "این متن در کارت صفحهٔ اصلی منتشر می‌شود.")}
          {field("body", kind === "portfolio" ? "توضیح تفصیلی (الزامی)" : "توضیح تفصیلی (اختیاری)", p => <Textarea {...p} name="body" defaultValue={value("body")} maxLength={kind === "portfolio" ? 8000 : 6000} rows={6} required={kind === "portfolio"} dir="auto"/>, "متن مرجع ویرایشگر است؛ در نمای فشردهٔ صفحهٔ اصلی نمایش داده نمی‌شود.")}
          {kind === "services" ? <>{field("category", "دستهٔ ثابت خدمات", p => <Select {...p} name="category" defaultValue={value("category")}><option value="">{id ? "دستهٔ قدیمیِ تعیین‌نشده" : "دستهٔ خدمات را انتخاب کن"}</option>{Object.entries(requestCategories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select>, `شناسه‌های درخواست مشتری تغییر نمی‌کنند. دستهٔ ثبت‌شده یا خدمتِ مرتبط با درخواست قابل تغییر نیست. ${references ? `${references} درخواست مرتبط دارد.` : ""}`)}{field("highlights", "نکته‌های کوتاه (اختیاری)", p => <Textarea {...p} name="highlights" defaultValue={lines("highlights")} rows={4}/>, "هر خط یک نکته؛ حداکثر ۴ نکته، هر کدام ۶۰ نویسه.")}</> : <>
            {field("category", "دستهٔ نمایشی (اختیاری)", p => <Input {...p} name="category" defaultValue={value("category")} maxLength={100} dir="auto"/>)}
            {field("technologies", "فناوری‌ها (اختیاری)", p => <Textarea {...p} name="technologies" defaultValue={lines("technologies")} rows={3} dir="auto"/>, "هر خط یک فناوری؛ حداکثر ۸ مورد کوتاه.")}
            {field("externalUrl", "لینک عمومی پروژه (اختیاری)", p => <Input {...p} name="externalUrl" defaultValue={value("externalUrl")} maxLength={500} dir="ltr"/>, "فقط https عمومی؛ هیچ لینک یا فایل خارجی در سرور دریافت نمی‌شود.")}
            {field("imageKey", "تصویر از کاتالوگ محلی (اختیاری)", p => <Select {...p} name="imageKey" defaultValue={value("imageKey")}><option value="">بدون تصویر</option>{assets.map(asset => <option key={asset.key} value={asset.key}>{asset.label}</option>)}{value("imageKey") && !assets.some(a => a.key === value("imageKey")) && <option value={value("imageKey")}>تصویر قبلی در کاتالوگ معتبر نیست؛ انتخاب تازه لازم است</option>}</Select>, "آپلود فعال نیست. فایل‌ها پس از بررسی محتوا، اندازه و اثرانگشت وارد کاتالوگ می‌شوند. تصویر انتزاعی را به‌عنوان اسکرین‌شات مشتری معرفی نکن.")}
            <p className="account-notice">فقط کار واقعی و اطلاعاتی را منتشر کن که مجوز انتشار دارند. پروژه‌ها، درخواست‌ها و تیکت‌های خصوصی خودکار وارد نمونه‌کار نمی‌شوند.</p>
          </>}
        </>}
        {field("sortOrder", "ترتیب نمایش", p => <Input {...p} type="number" name="sortOrder" defaultValue={Number(initial.sortOrder ?? 0)} min={-10000} max={10000} step={1}/>, `عدد کوچک‌تر جلوتر است؛ شناسه ترتیب یکسان را ثابت نگه می‌دارد. صفحهٔ اصلی حداکثر ${kind === "portfolio" ? "۶ نمونه‌کار" : kind === "faq" ? "۱۲ پرسش" : "۱۲ خدمت"} را نشان می‌دهد.`)}
      </>}
      <div className="cms-actions">
        {kind === "settings" ? <Button type="submit"><Save size={18} aria-hidden="true"/>ذخیرهٔ تنظیمات عمومی</Button> : <>
          <Button type="submit" data-publish="true"><Eye size={18} aria-hidden="true"/>{initial.published ? "ذخیرهٔ تغییرات منتشرشده" : "انتشار عمومی"}</Button>
          <Button type="submit" data-publish="false" variant="secondary"><Archive size={18} aria-hidden="true"/>{initial.published ? "خروج از انتشار" : "ذخیرهٔ پیش‌نویس"}</Button>
          {id && !initial.published && kind !== "services" && <Button type="submit" data-action="delete" variant="ghost">حذف این پیش‌نویس</Button>}
        </>}
        {pending && <span role="status"><LoaderCircle className="loading-spinner" size={18} aria-hidden="true"/>در حال ثبت…</span>}
      </div>
    </fieldset>
    <p className="cms-feedback" ref={feedback} role="status" aria-live="polite" tabIndex={-1}>{message}</p>
    {dirty && <p className="field-hint">تغییرات فرم هنوز تأیید ذخیره نگرفته‌اند. متن فقط در همین فرم باز است؛ پیش از خروج آن را ذخیره یا کپی کن.</p>}
    <div className="cms-actions"><Button disabled={!ready || pending} variant="secondary" onClick={recover}>بررسی نتیجهٔ همین ذخیره</Button><a href={savedHref} target="_blank" rel="noopener noreferrer" className="text-link">مقایسهٔ نسخهٔ ذخیره‌شده در زبانهٔ تازه</a></div>
    {expired && <a href={`/login?notice=expired&next=${encodeURIComponent(savedHref)}`} className={buttonClass("secondary")}>ورود دوباره به حساب</a>}
    <Dialog.Root open={confirm} onOpenChange={v => { if (!pending)
        setConfirm(v); }}><Dialog.Portal><Dialog.Overlay className="dialog-overlay"/><Dialog.Content className="dialog-content" dir="rtl" onOpenAutoFocus={e => { e.preventDefault(); cancel.current?.focus(); }} onCloseAutoFocus={e => { e.preventDefault(); form.current?.querySelector<HTMLButtonElement>('button[type="submit"]')?.focus(); }}>
      <Dialog.Title>{confirmationTitle}</Dialog.Title>
      <Dialog.Description>نتیجه پس از ثبت واقعی تأیید می‌شود. انتشار یا خروج از انتشار در درخواست تازهٔ صفحهٔ عمومی دیده می‌شود. نسخهٔ قدیمی با ویرایش هم‌زمان جایگزین نمی‌شود؛ حذف پیش‌نویس برگشت‌پذیر نیست.</Dialog.Description>
      <div className="cms-actions"><Button disabled={pending} onClick={() => { if (proposed.current)
        void send(proposed.current.action, proposed.current.body); }}>تأیید و ثبت</Button><Dialog.Close asChild><Button ref={cancel} variant="secondary" disabled={pending}>بازگشت</Button></Dialog.Close></div>
    </Dialog.Content></Dialog.Portal></Dialog.Root>
  </form>;
}

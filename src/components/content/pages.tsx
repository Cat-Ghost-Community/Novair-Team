import Link from "next/link";
import { headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { notFound, redirect } from "next/navigation";
import { FilePenLine, Plus, Eye, LockKeyhole } from "lucide-react";
import { getContentManagement } from "@/server/content/runtime";
import { RequestFailure } from "@/server/requests/service";
import { AccountAccessError } from "@/server/auth/account-data";
import { contentLabels, contentKinds, defaultPublicSettings, type ContentKind } from "@/shared/content-contracts";
import { operationKeySchema } from "@/shared/request-contracts";
import { serviceScene } from "@/server/content/queries";
import { trustedContentAsset } from "@/server/content/assets";
import { safePublicProjectUrl } from "@/server/content/policy";
import { ServiceItems, PortfolioItems } from "@/components/home/sections";
import { FaqAccordion } from "@/components/ui/faq-accordion";
import { ContentEditor } from "./editor";
import { buttonClass, Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { RequestDate } from "@/components/requests/request-views";
const count = (v: number) => new Intl.NumberFormat("fa-IR").format(v);
async function readContent<T>(read: () => Promise<T>): Promise<T> {
    try {
        return await read();
    }
    catch (error) {
        if (error instanceof AccountAccessError)
            redirect(error.status === 401 ? "/login?notice=expired&next=%2Fadmin%2Fcontent" : "/dashboard");
        if (error instanceof RequestFailure && error.status === 404)
            notFound();
        if (error instanceof RequestFailure && error.status === 400)
            redirect("/admin/content?notice=invalid");
        throw new Error("Editorial data is temporarily unavailable.");
    }
}
function CmsNav({ active }: {
    active?: string;
}) { return <nav className="cms-nav" aria-label="بخش‌های مدیریت محتوا"><Link href="/admin/content" aria-current={!active ? "page" : undefined}>نمای کلی</Link>{Object.entries(contentLabels).map(([key, label]) => <Link key={key} href={`/admin/content/${key}`} aria-current={active === key ? "page" : undefined}>{label}</Link>)}</nav>; }
export async function ContentDashboard({ compact = false }: {
    compact?: boolean;
}) {
    const h = await headers();
    const data = await readContent(() => getContentManagement().overview(h));
    return <section className="dashboard-card"><div className="request-heading"><h2><FilePenLine size={21} aria-hidden="true"/>محتوای وب‌سایت</h2>{compact && <Link href="/admin/content" className="text-link">مدیریت محتوا</Link>}</div><div className="cms-metrics">{contentKinds.map(kind => <Link key={kind} href={`/admin/content/${kind}`}><strong>{contentLabels[kind]}</strong><span>{count(data[kind].published!)} منتشرشده · {count(data[kind].draft!)} پیش‌نویس</span></Link>)}</div>{!compact && <p>پیش‌نویس فقط برای مدیر است. انتشار به اطلاعات واقعی و مجاز نیاز دارد؛ هیچ رکورد خصوصی خودکار منتشر نمی‌شود.</p>}</section>;
}
const defaults = (kind: ContentKind): Record<string, unknown> => kind === "services" ? { title: "", summary: "", body: "", category: null, highlights: [], sortOrder: 0, published: false } : kind === "portfolio" ? { title: "", summary: "", body: "", category: "", technologies: [], imageKey: null, externalUrl: null, sortOrder: 0, published: false } : { question: "", answer: "", sortOrder: 0, published: false };
function SettingsAudit({ record }: {
    record: {
        audits: {
            id: string;
            action: string;
            actor: string;
            version: number;
            createdAt: string;
        }[];
        auditLimited: boolean;
    };
}) {
    return <section className="dashboard-card"><h2>تاریخچهٔ واقعی تنظیمات عمومی</h2>{record.audits.length ? <ol className="cms-audit">{record.audits.map(a => <li key={a.id}>{a.action === "fallback-retired" ? "خاموش‌شدن پیش‌فرض پس از انتشار" : "ویرایش تنظیمات عمومی"} · {a.actor} · نسخهٔ {count(a.version)} · <RequestDate value={a.createdAt}/></li>)}</ol> : <p>هنوز تغییر ثبت‌شده‌ای در این بخش نداریم.</p>}{record.auditLimited && <p>۲۰ رویداد اخیر نمایش داده می‌شود.</p>}</section>;
}
async function Preview({ kind, fields }: {
    kind: ContentKind;
    fields: Record<string, unknown>;
}) {
    const text = (key: string) => typeof fields[key] === "string" ? fields[key] as string : "";
    const list = (key: string) => Array.isArray(fields[key]) ? (fields[key] as unknown[]).filter((v): v is string => typeof v === "string") : [];
    return <section className="dashboard-card cms-preview"><h2>نمای ذخیره‌شده، پیش از انتشار</h2><p className="account-notice"><LockKeyhole size={18} aria-hidden="true"/>این پیش‌نمایش فقط برای مدیر است و به معنی انتشار نیست.</p>{kind === "services" ? <ServiceItems items={[{ id: "preview", kind: serviceScene(text("category")), title: text("title"), description: text("summary"), examples: list("highlights") }]}/> : kind === "faq" ? <FaqAccordion items={[{ id: "preview-faq", question: text("question"), answer: text("answer") }]}/> : <PortfolioItems content={{ available: true, items: [{ id: "preview", title: text("title"), description: text("summary"), category: text("category") || null, image: (await trustedContentAsset(text("imageKey")))?.src ?? null, url: safePublicProjectUrl(text("externalUrl")), technologies: list("technologies") }] }}/>}</section>;
}
export async function ContentPage({ parts, query }: {
    parts: string[];
    query: Record<string, string | string[] | undefined>;
}) {
    const [area, id, mode] = parts;
    if (parts.length > 3 || (mode && mode !== "preview") || (area && ![...contentKinds, "settings"].includes(area as ContentKind)))
        notFound();
    const service = getContentManagement(), h = await headers();
    if (!area)
        return <><p className="eyebrow">متن روشن، انتشار آگاهانه</p><h1>مدیریت محتوای نوایر</h1><CmsNav />{query.notice === "invalid" && <p role="alert" className="account-notice">فیلتر یا شناسهٔ ذخیره معتبر نیست؛ از مسیرهای همین بخش استفاده کن.</p>}<ContentDashboard /><section className="dashboard-card"><h2>اطلاعات عمومی استودیو</h2><p>فقط معرفی و راه‌های ارتباطی عمومی قابل ویرایش‌اند؛ تنظیمات امنیتی و اطلاعات مشتریان اینجا نیستند.</p><Link href="/admin/content/settings" className={buttonClass("secondary")}>ویرایش تنظیمات عمومی</Link></section></>;
    if (area === "settings" && (id || mode))
        notFound();
    const key = query.contentOp === undefined ? randomUUID() : operationKeySchema.safeParse(query.contentOp);
    if (typeof key !== "string" && !key.success)
        throw new RequestFailure(400, "شناسهٔ ذخیره معتبر نیست.");
    const operationKey = typeof key === "string" ? key : key.data;
    if (query.contentIntent !== undefined && !["save", "delete"].includes(String(query.contentIntent)))
        throw new RequestFailure(400, "نوع ذخیره معتبر نیست.");
    if (query.contentOp) {
        try {
            const recovered = await service.recover(h, operationKey);
            const r = recovered.result;
            redirect(r.kind === "settings" ? "/admin/content/settings?saved=1" : `/admin/content/${r.kind}${query.contentIntent === "delete" ? "" : `/${r.id}`}?saved=1`);
        }
        catch (error) {
            if (!(error instanceof RequestFailure && error.status === 404))
                throw error;
        }
    }
    if (area === "settings") {
        const record = await readContent(() => service.settings(h));
        return <><h1>تنظیمات عمومی استودیو</h1><CmsNav active={area}/>{query.saved === "1" && <p className="account-notice" role="status">نسخهٔ ذخیره‌شده از پایگاه داده خوانده شد.</p>}<section className="dashboard-card"><h2>فقط اطلاعات قابل انتشار</h2><p className="field-hint">ایمیل، شماره و شبکه‌های خالی نمایش داده نمی‌شوند. این صفحه هیچ دسترسی به رمزها، نقش‌ها یا متغیرهای محیطی ندارد.</p><ContentEditor kind="settings" version={record.version} initial={record.fields ?? defaultPublicSettings} operationKey={operationKey}/></section><SettingsAudit record={record}/></>;
    }
    const kind = area as ContentKind, home = `/admin/content/${kind}`;
    if (!id) {
        const input = Object.fromEntries(Object.entries(query).filter(([key, value]) => !["saved"].includes(key) && value !== undefined));
        const data = await readContent(() => service.list(h, kind, input));
        const href = (page: number) => `${home}?${new URLSearchParams({ page: String(page), visibility: data.visibility })}`;
        return <><div className="request-heading"><h1>{contentLabels[kind]}</h1><Link href={`${home}/new`} className={buttonClass()}><Plus size={18} aria-hidden="true"/>محتوای تازه</Link></div><CmsNav active={kind}/>{query.saved === "1" && <p role="status" className="account-notice">عملیات ثبت شد؛ این فهرست از پایگاه داده خوانده شده است.</p>}<form method="get" className="dashboard-card cms-filters"><label htmlFor="content-visibility">وضعیت انتشار</label><Select id="content-visibility" name="visibility" defaultValue={data.visibility}><option value="ALL">همه</option><option value="DRAFT">پیش‌نویس</option><option value="PUBLISHED">منتشرشده</option></Select><Button variant="secondary" type="submit">اعمال فیلتر</Button><span>{count(data.total)} مورد</span></form><div className="cms-list">{data.items.map(row => <article className="dashboard-card" key={row.id}><span className="cms-badge"><Eye size={16} aria-hidden="true"/>{row.published ? "منتشرشده" : "پیش‌نویس خصوصی"}</span><h2 dir="auto">{row.title}</h2><p>ترتیب: {count(row.sortOrder)} · آخرین ذخیره: <RequestDate value={row.updatedAt.toISOString()}/></p><div className="cms-actions"><Link href={`${home}/${row.id}`} className="text-link">ویرایش محتوا</Link><Link href={`${home}/${row.id}/preview`} className="text-link">پیش‌نمایش ذخیره‌شده</Link></div></article>)}</div>{!data.items.length && <section className="dashboard-card"><h2>در این فهرست محتوایی نیست.</h2><p>محتوای واقعی را ابتدا پیش‌نویس کن و پس از بررسی منتشر کن. هیچ نمونه‌ای خودکار ساخته نمی‌شود.</p><Link href={`${home}/new`} className="text-link">ساخت محتوای تازه</Link></section>}<nav className="cms-actions" aria-label="صفحه‌بندی محتوا">{data.page > 1 && <Link href={href(data.page - 1)} className={buttonClass("secondary")}>صفحهٔ قبل</Link>}{data.page * data.pageSize < data.total && <Link href={href(data.page + 1)} className={buttonClass("secondary")}>صفحهٔ بعد</Link>}</nav></>;
    }
    if (id === "new" && mode)
        notFound();
    const record = id === "new" ? null : await readContent(() => service.detail(h, kind, id));
    const fields: Record<string, unknown> = record?.fields ?? defaults(kind);
    const assetList = kind === "portfolio" ? (await readContent(() => service.assets(h))).items : [];
    return <><div className="request-heading"><h1>{mode ? "پیش‌نمایش خصوصی" : id === "new" ? "محتوای تازه" : "ویرایش محتوا"}</h1><Link href={home} className="text-link">بازگشت به {contentLabels[kind]}</Link></div><CmsNav active={kind}/>{query.saved === "1" && <p role="status" className="account-notice">نسخهٔ ذخیره‌شدهٔ واقعی نمایش داده می‌شود.</p>}{mode ? <><Preview kind={kind} fields={fields}/><Link className={buttonClass("secondary")} href={`${home}/${id}`}>بازگشت به ویرایشگر</Link></> : <><section className="dashboard-card"><div className="request-heading"><h2>{record ? `نسخهٔ ${count(record.version)}` : "پیش‌نویس تازه"}</h2>{record && <Link href={`${home}/${id}/preview`} className="text-link">پیش‌نمایش ذخیره‌شده</Link>}</div><ContentEditor kind={kind} id={record?.id} version={record?.version ?? 0} initial={fields} operationKey={operationKey} assets={assetList} references={record?.references}/></section>{record && <section className="dashboard-card"><h2>رویدادهای واقعی ویرایش</h2>{record.audits.length ? <ol className="cms-audit">{record.audits.map(a => <li key={a.id}><strong>{({ "created-draft": "ساخت پیش‌نویس", "created-published": "ساخت و انتشار", "published": "انتشار", "unpublished": "خروج از انتشار", "edited": "ویرایش", "deleted": "حذف" } as Record<string, string>)[a.action] ?? "تغییر محتوا"}</strong> · {a.actor} · نسخهٔ {count(a.version)} · <RequestDate value={a.createdAt}/></li>)}</ol> : <p>رویدادهای پیش از فعال‌شدن مدیریت محتوا ثبت نشده‌اند؛ تاریخچهٔ ساختگی اضافه نمی‌شود.</p>}{record.auditLimited && <p>۲۰ رویداد اخیر نمایش داده می‌شود.</p>}</section>}</>}</>;
}

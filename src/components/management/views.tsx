import Link from "next/link";
import { Clock3, Shield, FolderOpen } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { requestStatuses, requestCategories, budgetPreferences, timelinePreferences, optionLabel } from "@/shared/request-contracts";
import { projectStatuses, type ManagedStatus } from "@/shared/management-contracts";
import { RequestDate, RequestStatusBadge } from "@/components/requests/request-views";
import { RequestSketch } from "@/components/requests/request-art";
import type { ManagementService, AdminRequestDetail, AdminProjectDetail } from "@/server/management/service";
import { safePublicProjectUrl } from "@/server/content/policy";
const number = (value: number) => new Intl.NumberFormat("fa-IR").format(value);
function PlannedDate({ value }: {
    value: string;
}) { return <time dateTime={value}>{new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`))}</time>; }
export function ProjectStatusBadge({ status }: {
    status: ManagedStatus;
}) { return <span className={`request-status project-status--${status.toLowerCase()}`}><Clock3 size={16} aria-hidden="true"/>{projectStatuses[status]}</span>; }
function Filters({ kind, data }: {
    kind: "requests" | "projects";
    data: {
        q: string;
        status: string;
        total: number;
        unconverted?: string;
        active?: string;
    };
}) {
    return <form className="management-filter" method="get" action={`/admin/${kind}`}><div><label htmlFor="admin-search">جست‌وجو</label><input className="input" id="admin-search" name="q" maxLength={100} defaultValue={data.q} placeholder="عنوان، شناسه یا نام و ایمیل مشتری"/></div><div><label htmlFor="admin-status">وضعیت</label><select className="input" id="admin-status" name="status" defaultValue={data.status}><option value="ALL">همهٔ وضعیت‌ها</option>{Object.entries(kind === "requests" ? requestStatuses : projectStatuses).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>{kind === "requests" && <label className="management-check"><input type="checkbox" name="unconverted" value="true" defaultChecked={data.unconverted === "true"}/>فقط درخواست‌های بدون پروژه</label>}{kind === "projects" && <label className="management-check"><input type="checkbox" name="active" value="true" defaultChecked={data.active === "true"}/>فقط پروژه‌های باز</label>}<button type="submit" className={buttonClass("secondary")}>اعمال فیلتر و جست‌وجو</button><span>{number(data.total)} نتیجه</span></form>;
}
function Pagination({ kind, data }: {
    kind: "requests" | "projects";
    data: {
        page: number;
        pageSize: number;
        total: number;
        q: string;
        status: string;
        unconverted?: string;
        active?: string;
    };
}) {
    const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
    const href = (page: number) => `/admin/${kind}?${new URLSearchParams({ page: String(page), status: data.status, q: data.q, ...(data.unconverted ? { unconverted: data.unconverted } : {}), ...(data.active ? { active: data.active } : {}) })}`;
    return pages > 1 || data.page > 1 ? <nav className="request-pagination" aria-label="صفحه‌بندی مدیریت">{data.page > 1 && <Link href={href(data.page - 1)} className={buttonClass("secondary")}>صفحهٔ قبل</Link>}<span>صفحهٔ {number(data.page)} از {number(pages)}</span>{data.page < pages && <Link href={href(data.page + 1)} className={buttonClass("secondary")}>صفحهٔ بعد</Link>}</nav> : null;
}
function Empty({ kind }: {
    kind: "requests" | "projects";
}) { return <section className="dashboard-card request-empty"><RequestSketch /><h2>{kind === "requests" ? "درخواستی با این فیلتر پیدا نشد." : "پروژه‌ای با این فیلتر پیدا نشد."}</h2><p>{kind === "requests" ? "درخواست‌های واقعی مشتریان پس از ثبت اینجا دیده می‌شوند." : "پروژه فقط با تبدیل یک درخواست پذیرفته‌شده ایجاد می‌شود."}</p><Link href={kind === "requests" ? "/admin/requests" : "/admin/requests?status=ACCEPTED&unconverted=true"} className="text-link">{kind === "requests" ? "دیدن همهٔ درخواست‌ها" : "درخواست‌های آمادهٔ تبدیل"}</Link></section>; }
export function AdminRequestsList({ data }: {
    data: Awaited<ReturnType<ManagementService["requests"]>>;
}) {
    return <><h1>بررسی درخواست‌ها</h1><p className="muted">درخواست، تصمیم و پروژهٔ اجرایی سه مرحلهٔ متمایزند.</p><Filters kind="requests" data={data}/>{data.items.length ? <ul className="request-list management-requests">{data.items.map(item => <li className="request-list-item" key={item.id}><div><p className="eyebrow">{item.owner.name} · {optionLabel(requestCategories, item.category, "خدمات اختصاصی")}</p><h2><Link href={`/admin/requests/${item.id}`}>{item.title}</Link></h2><bdi className="request-identifier" dir="ltr">{item.id}</bdi><p className="request-item-date"><RequestDate value={item.createdAt}/></p><p className="field-hint">بودجهٔ ترجیحی: {optionLabel(budgetPreferences, item.budgetPreference)}</p></div><div className="request-item-side"><RequestStatusBadge status={item.status}/><Link className="text-link" href={`/admin/requests/${item.id}`}>جزئیات و بررسی</Link>{item.project && <Link className="text-link" href={`/admin/projects/${item.project.id}`}>پروژهٔ متصل</Link>}</div></li>)}</ul> : <Empty kind="requests"/>}<Pagination kind="requests" data={data}/></>;
}
export function AdminProjectsList({ data }: {
    data: Awaited<ReturnType<ManagementService["projects"]>>;
}) {
    return <><h1>پروژه‌های مدیریت‌شده</h1><p className="muted">وضعیت واقعی اجرا، مسئول و برنامهٔ هر پروژه.</p><Filters kind="projects" data={data}/>{data.items.length ? <ul className="request-list management-projects">{data.items.map(item => <li className="request-list-item" key={item.id}><div><p className="eyebrow">{item.owner.name}</p><h2><Link href={`/admin/projects/${item.id}`}>{item.title}</Link></h2><p className="field-hint">مسئول: {item.assignee?.name ?? "تعیین نشده"}{item.assignee && !item.assignee.eligible ? " (نیاز به انتخاب مدیر فعال)" : ""}</p><p className="request-item-date">ثبت: <RequestDate value={item.createdAt}/><br />به‌روزرسانی: <RequestDate value={item.updatedAt}/></p></div><div className="request-item-side"><ProjectStatusBadge status={item.status}/><Link className="text-link" href={`/admin/projects/${item.id}`}>مدیریت پروژه</Link></div></li>)}</ul> : <Empty kind="projects"/>}<Pagination kind="projects" data={data}/></>;
}
export function AdminRequestInformation({ data }: {
    data: AdminRequestDetail;
}) {
    const url = safePublicProjectUrl(data.relevantUrl);
    return <><Link href="/admin/requests" className="text-link">بازگشت به بررسی درخواست‌ها</Link><div className="request-heading"><h1>{data.title}</h1><RequestStatusBadge status={data.status}/></div><section className="dashboard-card"><h2>درخواست اصلی مشتری</h2><dl className="account-facts"><div><dt>شناسه</dt><dd><bdi dir="ltr" className="request-identifier">{data.id}</bdi></dd></div><div><dt>مشتری</dt><dd>{data.owner.name}<br /><bdi dir="ltr">{data.owner.email}</bdi></dd></div><div><dt>خدمات</dt><dd>{optionLabel(requestCategories, data.category, "خدمات اختصاصی")}</dd></div><div><dt>بودجهٔ ترجیحی مشتری</dt><dd>{data.legacyBudget && !data.budgetPreference ? `${number(Number(data.legacyBudget))} (مقدار قبلی)` : optionLabel(budgetPreferences, data.budgetPreference)}</dd></div><div><dt>زمان ترجیحی</dt><dd>{data.legacyDeadline && !data.timelinePreference ? <RequestDate value={data.legacyDeadline}/> : optionLabel(timelinePreferences, data.timelinePreference, "نیاز به مشاوره دارم")}</dd></div><div><dt>ثبت</dt><dd><RequestDate value={data.createdAt}/></dd></div><div><dt>آخرین به‌روزرسانی</dt><dd><RequestDate value={data.updatedAt}/></dd></div></dl><h3>شرح نیاز</h3><p className="request-description">{data.description}</p>{url && <a className="management-external inline-link" href={url} target="_blank" rel="noopener noreferrer nofollow">لینک مرتبط مشتری <bdi dir="ltr">{url}</bdi></a>}<p className="field-hint">بودجه و زمان بالا ترجیح مشتری‌اند، نه قیمت یا تعهد زمان تحویل.</p></section>{data.project ? <section className="dashboard-card"><h2>پروژهٔ متصل ایجاد شده است.</h2><Link className="text-link" href={`/admin/projects/${data.project.id}`}>رفتن به مدیریت پروژه</Link></section> : data.status === "ACCEPTED" ? <section className="dashboard-card"><h2>پذیرفته‌شده؛ در انتظار ایجاد پروژه</h2><p>هنوز پروژهٔ اجرایی ایجاد نشده است. تبدیل را جداگانه تأیید کنید.</p></section> : null}</>;
}
export function AdminProjectInformation({ data }: {
    data: AdminProjectDetail;
}) {
    return <><Link href="/admin/projects" className="text-link">بازگشت به پروژه‌ها</Link><div className="request-heading"><h1>{data.title}</h1><ProjectStatusBadge status={data.status}/></div><section className="dashboard-card"><h2>اطلاعات واقعی پروژه</h2><dl className="account-facts"><div><dt>شناسه</dt><dd><bdi className="request-identifier" dir="ltr">{data.id}</bdi></dd></div><div><dt>مشتری</dt><dd>{data.owner.name}<br /><bdi dir="ltr">{data.owner.email}</bdi></dd></div><div><dt>مسئول</dt><dd>{data.assignee?.name ?? "تعیین نشده"}{data.assignee && !data.assignee.eligible ? "؛ نیاز به انتخاب مدیر فعال" : ""}</dd></div><div><dt>شروع برنامه</dt><dd>{data.plannedStart ? <PlannedDate value={data.plannedStart}/> : "تعیین نشده"}</dd></div><div><dt>پایان هدف</dt><dd>{data.targetCompletion ? <PlannedDate value={data.targetCompletion}/> : "تعیین نشده"}</dd></div><div><dt>ثبت</dt><dd><RequestDate value={data.createdAt}/></dd></div><div><dt>به‌روزرسانی</dt><dd><RequestDate value={data.updatedAt}/></dd></div></dl><h3>شرح داخلی پروژه</h3><p className="field-hint">این شرح در نمای مشتری نمایش داده نمی‌شود؛ شرح نیاز اولیه در درخواست اصلی محفوظ است.</p><p className="request-description">{data.description}</p>{data.requestId && <Link href={`/admin/requests/${data.requestId}`} className="text-link">مشاهدهٔ درخواست اصلی مشتری</Link>}</section></>;
}
export function PrivateNotes({ notes, limited }: {
    notes: AdminRequestDetail["notes"];
    limited: boolean;
}) {
    return <section className="dashboard-card management-notes"><h2><Shield size={19} aria-hidden="true"/>یادداشت‌های خصوصی مدیران</h2><p className="field-hint">این بخش فقط برای مدیران است.</p>{limited && <p className="field-hint">۱۰۰ یادداشت اخیر نمایش داده می‌شود.</p>}{notes.length ? <ol>{notes.map(note => <li key={note.id}><p className="request-description">{note.body}</p><p className="field-hint">{note.author.name} · <RequestDate value={note.createdAt}/></p></li>)}</ol> : <p>هنوز یادداشت خصوصی ثبت نشده است.</p>}</section>;
}
export function ManagementHistory({ request, project }: {
    request?: AdminRequestDetail;
    project?: AdminProjectDetail;
}) {
    const events = request?.history ?? project!.history;
    const labels: Record<string, string> = request ? requestStatuses : projectStatuses;
    return <section className="dashboard-card management-history"><h2>تاریخچهٔ واقعی وضعیت</h2>{(request?.historyLimited || project?.historyLimited) && <p className="field-hint">۱۰۰ رخداد اخیر نمایش داده می‌شود.</p>}{events.length ? <ol className="request-timeline">{events.map(event => <li key={event.id}><span className="timeline-mark"><Clock3 size={17} aria-hidden="true"/></span><div><h3>{event.fromStatus ? `${labels[event.fromStatus]} ← ${labels[event.toStatus]}` : `ثبت در وضعیت ${labels[event.toStatus]}`}</h3><p>{event.actor.name}</p><RequestDate value={event.createdAt}/>{"publicExplanation" in event && event.publicExplanation && <p className="request-description management-public-explanation">توضیح قابل‌نمایش به مشتری: {event.publicExplanation}</p>}</div></li>)}</ol> : <p>برای این رکورد قدیمی هنوز رخدادی ثبت نشده است.</p>}</section>;
}
const auditLabels: Record<string, string> = { title: "عنوان", description: "شرح", assigneeId: "مسئول", plannedStart: "شروع برنامه", targetCompletion: "پایان هدف" };
export function ProjectAudit({ data }: {
    data: AdminProjectDetail;
}) {
    const people = new Map(data.assignees.map(p => [p.id, p.name]));
    if (data.assignee)
        people.set(data.assignee.id, data.assignee.name);
    const display = (field: string, value: unknown) => typeof value !== "string" ? "تعیین نشده" : field === "assigneeId" ? (people.get(value) ?? `شناسهٔ مدیر: ${value}`) : value;
    return <section className="dashboard-card management-audit"><h2>تغییر مسئول و برنامه</h2>{data.auditLimited && <p>۱۰۰ تغییر اخیر نمایش داده می‌شود.</p>}{data.audit.length ? <ol>{data.audit.map(event => <li key={event.id}><p>{event.actor.name} · <RequestDate value={event.createdAt}/></p><dl>{Object.entries(event.changes as Record<string, {
                    from: unknown;
                    to: unknown;
                }>).map(([field, change]) => <div key={field}><dt>{auditLabels[field] ?? "تغییر اطلاعات"}</dt><dd><span>قبلی: </span><bdi>{display(field, change.from)}</bdi><br /><span>جدید: </span><bdi>{display(field, change.to)}</bdi></dd></div>)}</dl></li>)}</ol> : <p>هنوز تغییری در اطلاعات، مسئول یا برنامه ثبت نشده است.</p>}</section>;
}
export function ManagementOverview({ data }: {
    data: Awaited<ReturnType<ManagementService["overview"]>>;
}) {
    const metrics = [{ label: "درخواست تازه", value: data.newRequests, href: "/admin/requests?status=NEW" }, { label: "در حال بررسی", value: data.reviewing, href: "/admin/requests?status=REVIEWING" }, { label: "پذیرفته‌شده بدون پروژه", value: data.awaitingConversion, href: "/admin/requests?status=ACCEPTED&unconverted=true" }, { label: "پروژه‌های فعال", value: data.activeProjects, href: "/admin/projects?active=true" }, { label: "پروژه‌های تکمیل‌شده", value: data.completedProjects, href: "/admin/projects?status=COMPLETED" }];
    return <><section className="management-metrics" aria-label="خلاصهٔ واقعی عملیات">{metrics.map(item => <Link href={item.href} key={item.label} className="dashboard-card"><span>{item.label}</span><strong>{number(item.value)}</strong></Link>)}</section><section className="dashboard-card"><h2><FolderOpen size={19} aria-hidden="true"/>تازه‌ترین تغییرها</h2>{!data.recentRequests.length && !data.recentProjects.length ? <p>هنوز درخواست یا پروژه‌ای ثبت نشده است.</p> : <ul className="management-recent">{data.recentRequests.map(item => <li key={item.id}><Link href={`/admin/requests/${item.id}`}>{item.title}</Link><RequestStatusBadge status={item.status}/><RequestDate value={item.updatedAt}/></li>)}{data.recentProjects.map(item => <li key={item.id}><Link href={`/admin/projects/${item.id}`}>{item.title}</Link><ProjectStatusBadge status={item.status}/><RequestDate value={item.updatedAt}/></li>)}</ul>}</section></>;
}

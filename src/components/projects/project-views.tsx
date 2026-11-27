import Link from "next/link";
import { CalendarDays, CircleCheck, CircleX, PauseCircle, PlayCircle, Plus, ArrowUpLeft, FolderOpen } from "lucide-react";
import { customerProjectStatuses, projectStageDescriptions } from "@/shared/customer-project-contracts";
import type { ManagedStatus } from "@/shared/management-contracts";
import type { CustomerProjectDetail, CustomerProjectItem, CustomerOverview, CustomerProjectsService } from "@/server/projects/service";
import { buttonClass } from "@/components/ui/button";
import { RequestDate, RequestItems, RequestStatusBadge } from "@/components/requests/request-views";
import { ProjectSketch } from "./project-art";
const count = (value: number) => new Intl.NumberFormat("fa-IR").format(value);
const statusIcons = { PLANNED: CalendarDays, IN_PROGRESS: PlayCircle, ON_HOLD: PauseCircle, COMPLETED: CircleCheck, CANCELLED: CircleX };
export function CustomerProjectStatus({ status }: {
    status: ManagedStatus;
}) {
    const Icon = statusIcons[status];
    return <span className={`request-status customer-project-status project-status--${status.toLowerCase()}`}><Icon size={17} aria-hidden="true"/>{customerProjectStatuses[status]}</span>;
}
export function CustomerPlannedDate({ value }: {
    value: string | null;
}) {
    return value ? <time dateTime={value}>{new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`))}</time> : <>هنوز تعیین نشده</>;
}
export function CustomerProjectEmpty({ filtered = false }: {
    filtered?: boolean;
}) {
    return <section className="dashboard-card customer-project-empty request-empty"><ProjectSketch /><h2>{filtered ? "پروژه‌ای با این فیلتر پیدا نشد." : "جای اولین پروژه‌ات، همین‌جاست."}</h2><p>{filtered ? "فیلتر را تغییر بده یا همهٔ پروژه‌های خودت را ببین." : "پس از پذیرش و ایجاد پروژه توسط تیم نوایر، وضعیت اجرای آن اینجا دیده می‌شود. ثبت یا پذیرش درخواست به‌تنهایی پروژه نمی‌سازد."}</p><div className="request-actions customer-empty-actions"><Link href={filtered ? "/dashboard/projects" : "/dashboard/requests"} className={buttonClass("secondary")}>{filtered ? "همهٔ پروژه‌ها" : "پیگیری درخواست‌ها"}</Link>{!filtered && <Link href="/dashboard/requests/new" className={buttonClass()}>ثبت درخواست جدید</Link>}</div></section>;
}
export function CustomerProjectItems({ items, overview = false }: {
    items: CustomerProjectItem[];
    overview?: boolean;
}) {
    const Heading = overview ? "h3" : "h2";
    return <ul className="customer-project-list request-list">{items.map(item => <li className="customer-project-item request-list-item" key={item.id}><div><p className="eyebrow"><FolderOpen size={16} aria-hidden="true"/>پروژهٔ اجرایی</p><Heading><Link href={`/dashboard/projects/${item.id}`}>{item.title}</Link></Heading><bdi className="request-identifier" dir="ltr">{item.id}</bdi><dl className="customer-project-dates"><div><dt>ایجاد</dt><dd><RequestDate value={item.createdAt}/></dd></div><div><dt>آخرین تغییر</dt><dd><RequestDate value={item.updatedAt}/></dd></div>{item.plannedStart && <div><dt>شروع برنامه</dt><dd><CustomerPlannedDate value={item.plannedStart}/></dd></div>}{item.targetCompletion && <div><dt>تاریخ هدف پایان</dt><dd><CustomerPlannedDate value={item.targetCompletion}/></dd></div>}</dl></div><div className="request-item-side"><CustomerProjectStatus status={item.status}/><Link href={`/dashboard/projects/${item.id}`} className="text-link" aria-label={`وضعیت و مسیر پروژهٔ ${item.title}`}>وضعیت و مسیر پروژه<ArrowUpLeft size={16} aria-hidden="true"/></Link></div></li>)}</ul>;
}
export function CustomerProjectList({ data }: {
    data: Awaited<ReturnType<CustomerProjectsService["list"]>>;
}) {
    const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
    const link = (page: number) => `/dashboard/projects?status=${data.status}&active=${data.active}&page=${page}`;
    return <><div className="request-heading"><div><p className="eyebrow">از برنامه تا اجرا</p><h1>پروژه‌های تو</h1><p className="muted">وضعیت واقعی پروژه‌های ایجادشده برای همین حساب.</p></div><Link href="/dashboard/requests/new" className={buttonClass()}><Plus size={18} aria-hidden="true"/>ثبت درخواست جدید</Link></div><form className="request-filter customer-project-filter" method="get" action="/dashboard/projects"><label htmlFor="customer-project-status">وضعیت پروژه</label><select id="customer-project-status" name="status" className="input" defaultValue={data.status}><option value="ALL">همهٔ وضعیت‌ها</option>{Object.entries(customerProjectStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><label className="customer-project-check"><input type="checkbox" name="active" value="true" defaultChecked={data.active === "true"}/>فقط پروژه‌های باز</label><button type="submit" className={buttonClass("secondary")}>اعمال فیلتر</button><p>{count(data.total)} پروژه</p></form>{data.items.length ? <CustomerProjectItems items={data.items}/> : <CustomerProjectEmpty filtered={data.status !== "ALL" || data.active === "true" || data.page > 1}/>}<p className="field-hint">تاریخ هدف، برنامهٔ فعلی است و تضمین زمان تحویل نیست.</p>{(pages > 1 || data.page > 1) && <nav className="request-pagination" aria-label="صفحه‌بندی پروژه‌ها">{data.page > 1 && <Link href={link(data.page - 1)} className={buttonClass("secondary")}>صفحهٔ قبل</Link>}<span>صفحهٔ {count(data.page)} از {count(pages)}</span>{data.page < pages && <Link href={link(data.page + 1)} className={buttonClass("secondary")}>صفحهٔ بعد</Link>}</nav>}</>;
}
export function CustomerProjectTimeline({ project }: {
    project: CustomerProjectDetail;
}) {
    return <section className="dashboard-card customer-project-history"><h2>مسیر واقعی پروژه</h2>{project.historyLimited && <p className="field-hint">۱۰۰ رخداد اخیر نمایش داده می‌شود؛ رخدادهای قدیمی‌تر در این نما نیستند.</p>}{!project.historyLimited && project.history[0]?.fromStatus != null && <p className="field-hint">آغاز تاریخچهٔ این پروژهٔ قدیمی ثبت نشده است؛ فقط رخدادهای موجود نمایش داده می‌شوند.</p>}{project.history.length ? <ol className="request-timeline">{project.history.map(event => <li key={event.id}><span className="timeline-mark"><CalendarDays size={18} aria-hidden="true"/></span><div><h3>{event.fromStatus === null && event.toStatus === "PLANNED" ? "پروژه ایجاد شد" : event.fromStatus ? `${customerProjectStatuses[event.fromStatus]} ← ${customerProjectStatuses[event.toStatus]}` : `ثبت وضعیت ${customerProjectStatuses[event.toStatus]}`}</h3><RequestDate value={event.createdAt}/></div></li>)}</ol> : <p>برای این پروژهٔ قدیمی هنوز تاریخچه‌ای ثبت نشده است؛ رخداد فرضی نمایش نمی‌دهیم.</p>}</section>;
}
export function CustomerProjectDetails({ project }: {
    project: CustomerProjectDetail;
}) {
    return <><Link href="/dashboard/projects" className="text-link">بازگشت به پروژه‌ها</Link><div className="request-heading"><div><p className="eyebrow">پروژهٔ اجرایی تو</p><h1>{project.title}</h1></div><CustomerProjectStatus status={project.status}/></div><section className="dashboard-card customer-project-stage"><h2>الان در چه مرحله‌ای هستیم؟</h2><p>{projectStageDescriptions[project.status]}</p></section><section className="dashboard-card customer-project-facts"><h2>اطلاعات و برنامهٔ پروژه</h2><dl className="account-facts"><div><dt>شناسهٔ پروژه</dt><dd><bdi dir="ltr" className="request-identifier">{project.id}</bdi></dd></div><div><dt>ایجاد پروژه</dt><dd><RequestDate value={project.createdAt}/></dd></div><div><dt>آخرین تغییر ثبت‌شده</dt><dd><RequestDate value={project.updatedAt}/></dd></div><div><dt>شروع برنامه‌ریزی‌شده</dt><dd><CustomerPlannedDate value={project.plannedStart}/></dd></div><div><dt>تاریخ هدف پایان</dt><dd><CustomerPlannedDate value={project.targetCompletion}/></dd></div></dl><p className="field-hint">این تاریخ‌ها برنامهٔ فعلی‌اند و تضمین زمان تحویل نیستند؛ درصد پیشرفت تخمینی نمایش داده نمی‌شود.</p>{project.originRequestId ? <Link href={`/dashboard/requests/${project.originRequestId}`} className="text-link">مشاهدهٔ درخواست اولیه و شرح نیاز تو</Link> : <p className="field-hint">درخواست اولیهٔ قابل‌نمایش برای این پروژه موجود نیست.</p>}</section><CustomerProjectTimeline project={project}/><section className="dashboard-card"><h2>یک نیاز تازه داری؟</h2><p>برای کار جدید، درخواست جداگانه ثبت کن. برای پرسش دربارهٔ همین پروژه، تیکت پشتیبانی باز کن.</p><div className="support-actions"><Link href="/dashboard/requests/new" className={buttonClass("secondary")}>ثبت درخواست جدید</Link><Link href="/dashboard/tickets/new" className="text-link">ثبت تیکت پشتیبانی</Link></div></section></>;
}
export function CustomerDashboard({ data }: {
    data: CustomerOverview;
}) {
    const metrics = [["درخواست ثبت‌شده", data.requests.total, "/dashboard/requests"], ["منتظر بررسی", data.requests.awaitingReview, "/dashboard/requests"], ["درخواست پذیرفته‌شده", data.requests.accepted, "/dashboard/requests?status=ACCEPTED"], ["پروژهٔ اجرایی", data.projects.total, "/dashboard/projects"], ["پروژهٔ باز", data.projects.active, "/dashboard/projects?active=true"], ["پروژهٔ تکمیل‌شده", data.projects.completed, "/dashboard/projects?status=COMPLETED"]] as const;
    return <><div className="request-heading customer-dashboard-heading"><div><h1>پیشخوان تو</h1><p className="muted">درخواست، نتیجهٔ بررسی و مسیر اجرا؛ هرکدام در جای خودش.</p></div><Link href="/dashboard/requests/new" className={buttonClass()}><Plus size={18} aria-hidden="true"/>ثبت درخواست جدید</Link></div><div className="customer-metrics" aria-label="خلاصهٔ واقعی حساب">{metrics.map(([label, value, href]) => <Link key={label} href={href} className="dashboard-card customer-metric"><span>{label}</span><strong>{count(value)}</strong></Link>)}</div><section className="customer-project-recent"><div className="request-heading"><h2>تازه‌ترین وضعیت پروژه‌ها</h2><Link className="text-link" href="/dashboard/projects">همهٔ پروژه‌ها</Link></div>{data.projects.recent.length ? <CustomerProjectItems items={data.projects.recent} overview/> : <CustomerProjectEmpty />}</section><section className="customer-request-recent"><div className="request-heading"><div><h2>تازه‌ترین درخواست‌ها</h2><p className="muted">{count(data.requests.total)} درخواست ثبت‌شده در حساب تو</p></div><Link href="/dashboard/requests" className="text-link">دیدن همهٔ درخواست‌ها</Link></div>{data.requests.statuses.length > 0 && <ul className="request-summary-statuses">{data.requests.statuses.map(item => <li key={item.status}><RequestStatusBadge status={item.status}/><span>{count(item.count)}</span></li>)}</ul>}{data.requests.recent.length ? <RequestItems items={data.requests.recent} headingLevel={3}/> : <section className="dashboard-card"><p>هنوز درخواستی ثبت نکرده‌ای. با چند خط دربارهٔ نیازت شروع کن؛ پذیرش و ایجاد پروژه دو مرحلهٔ جدا هستند.</p><Link href="/dashboard/requests/new" className="text-link">ثبت اولین درخواست</Link></section>}</section></>;
}

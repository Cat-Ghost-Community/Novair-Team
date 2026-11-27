import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getManagement } from "@/server/management/runtime";
import { RequestFailure } from "@/server/requests/service";
import { AccountAccessError } from "@/server/auth/account-data";
import { operationKeySchema } from "@/shared/request-contracts";
import { reviewTransitions, projectTransitions } from "@/shared/management-contracts";
import type { ManagementAction } from "@/server/management/service";
import { ManagementForm } from "./action-form";
import { AdminRequestsList, AdminProjectsList, AdminRequestInformation, AdminProjectInformation, PrivateNotes, ManagementHistory, ProjectAudit, ManagementOverview } from "./views";
async function load(area: "requests" | "projects", id: string | undefined, query: Record<string, string | string[] | undefined>) {
    try {
        const service = getManagement();
        const requestHeaders = await headers();
        if (!id) {
            const input = Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined));
            return area === "requests" ? { kind: "requests" as const, data: await service.requests(requestHeaders, input) } : { kind: "projects" as const, data: await service.projects(requestHeaders, input) };
        }
        let recovery: Awaited<ReturnType<typeof service.operation>> | undefined;
        let pendingKey: string | undefined;
        if (query.operation !== undefined) {
            const parsed = operationKeySchema.safeParse(query.operation);
            if (!parsed.success)
                throw new RequestFailure(400, "شناسهٔ عملیات معتبر نیست.");
            try {
                recovery = await service.operation(requestHeaders, parsed.data);
            }
            catch (error) {
                if (error instanceof RequestFailure && error.status === 404)
                    pendingKey = parsed.data;
                else
                    throw error;
            }
        }
        return area === "requests" ? { kind: "request" as const, data: await service.requestDetail(requestHeaders, id), recovery, pendingKey } : { kind: "project" as const, data: await service.projectDetail(requestHeaders, id), recovery, pendingKey };
    }
    catch (error) {
        if (error instanceof RequestFailure && error.status === 404)
            notFound();
        if (error instanceof AccountAccessError && error.status === 401)
            redirect("/login?notice=expired&next=%2Fadmin");
        if (error instanceof AccountAccessError && error.status === 403)
            redirect("/dashboard");
        if (error instanceof RequestFailure && error.status === 400)
            return { kind: "invalid" as const };
        throw new Error("Administrative data is temporarily unavailable.");
    }
}
export async function ManagementPage({ area, id, query }: {
    area: "requests" | "projects";
    id?: string;
    query: Record<string, string | string[] | undefined>;
}) {
    const result = await load(area, id, query);
    if (result.kind === "invalid")
        return <section className="dashboard-card"><h1>فیلتر یا شناسهٔ عملیات معتبر نیست.</h1><Link href={`/admin/${area}`} className="text-link">بازگشت به فهرست</Link></section>;
    if (result.kind === "requests")
        return <AdminRequestsList data={result.data}/>;
    if (result.kind === "projects")
        return <AdminProjectsList data={result.data}/>;
    const initialKey = (action: ManagementAction) => query.intent === action ? result.pendingKey : undefined;
    const recovery = result.recovery;
    const notice = recovery ? <section className="dashboard-card management-result" role="status"><p><strong>نتیجهٔ عملیات در دیتابیس ثبت شده است.</strong></p><p>{recovery.result.alreadyConverted ? "پروژهٔ متصل از قبل وجود داشت؛ پروژهٔ تکراری ساخته نشد." : recovery.result.noChange ? "اطلاعات یکسان بود؛ تاریخچهٔ تغییر ساختگی ساخته نشد." : "جزئیات و تاریخچهٔ فعلی از سرور خوانده شده‌اند."}</p><Link href={`/admin/${recovery.result.resource === "request" ? "requests" : "projects"}/${recovery.result.id}`} className="text-link">دیدن جزئیات بدون شناسهٔ عملیات قبلی</Link></section> : result.pendingKey ? <p className="account-notice" role="status">برای این شناسه هنوز نتیجه‌ای ثبت نشده است. همان عملیات را با همان اطلاعات تکرار یا نتیجه را بررسی کنید؛ تأخیر شبکه به معنی شکست قطعی نیست.</p> : null;
    if (result.kind === "request") {
        const data = result.data;
        return <>{notice}<AdminRequestInformation data={data}/>{reviewTransitions[data.status].length > 0 && <ManagementForm key={`review-${data.reviewVersion}`} action="review" id={data.id} version={data.reviewVersion} targets={[...reviewTransitions[data.status]]} initialKey={initialKey("review")}/>}{data.status === "ACCEPTED" && !data.project && <ManagementForm action="convert" id={data.id} version={data.reviewVersion} initialKey={initialKey("convert")}/>}<ManagementHistory request={data}/><PrivateNotes notes={data.notes} limited={data.notesLimited}/><ManagementForm action="request-note" id={data.id} initialKey={initialKey("request-note")}/></>;
    }
    const data = result.data;
    return <>{notice}<AdminProjectInformation data={data}/>{projectTransitions[data.status].length > 0 && <><ManagementForm key={`status-${data.version}`} action="project-status" id={data.id} version={data.version} targets={[...projectTransitions[data.status]]} initialKey={initialKey("project-status")}/><ManagementForm key={`update-${data.version}`} action="project-update" id={data.id} version={data.version} project={data} initialKey={initialKey("project-update")}/></>}<ManagementHistory project={data}/><ProjectAudit data={data}/><PrivateNotes notes={data.notes} limited={data.notesLimited}/><ManagementForm action="project-note" id={data.id} initialKey={initialKey("project-note")}/></>;
}
export async function AdminOperationalOverview() { return <ManagementOverview data={await getManagement().overview(await headers())}/>; }

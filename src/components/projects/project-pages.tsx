import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getCustomerProjects } from "@/server/projects/runtime";
import { RequestFailure } from "@/server/requests/service";
import { AccountAccessError } from "@/server/auth/account-data";
import { CustomerProjectList, CustomerProjectDetails, CustomerDashboard } from "./project-views";
export async function CustomerProjectsPage({ id, query }: {
    id?: string;
    query: Record<string, string | string[] | undefined>;
}) {
    let result;
    try {
        const service = getCustomerProjects();
        const requestHeaders = await headers();
        result = id ? { kind: "detail" as const, data: await service.detail(requestHeaders, id) } : { kind: "list" as const, data: await service.list(requestHeaders, Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined))) };
    }
    catch (error) {
        if (error instanceof RequestFailure && error.status === 404)
            notFound();
        if (error instanceof AccountAccessError && error.status === 401)
            redirect("/login?notice=expired&next=%2Fdashboard%2Fprojects");
        if (error instanceof AccountAccessError && error.status === 403)
            redirect("/admin");
        if (error instanceof RequestFailure && error.status === 400)
            return <section className="dashboard-card"><h1>فیلتر پروژه معتبر نیست.</h1><p>وضعیت یا شمارهٔ صفحه را دوباره انتخاب کن.</p><Link href="/dashboard/projects" className="text-link">بازگشت به همهٔ پروژه‌ها</Link></section>;
        throw new Error("Customer project data is temporarily unavailable.");
    }
    return result.kind === "detail" ? <CustomerProjectDetails project={result.data}/> : <CustomerProjectList data={result.data}/>;
}
export async function CustomerDashboardOverview() { return <CustomerDashboard data={await getCustomerProjects().overview(await headers())}/>; }

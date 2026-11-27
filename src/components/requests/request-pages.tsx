import Link from "next/link";
import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getRequests } from "@/server/requests/runtime";
import { RequestFailure } from "@/server/requests/service";
import { operationKeySchema } from "@/shared/request-contracts";
import { RequestForm } from "./request-form";
import { RequestListView, RequestDetailView, RequestSummary } from "./request-views";
import type { RequestDetail, RequestsService } from "@/server/requests/service";
import { AccountAccessError } from "@/server/auth/account-data";
import { redirect } from "next/navigation";

export async function CustomerRequestPage({ part, query }: { part?: string; query: Record<string, string | string[] | undefined> }) {
  if (part === "new") {
    const key = query.operation === undefined ? randomUUID() : operationKeySchema.safeParse(query.operation);
    if (typeof key !== "string" && !key.success) return <section className="dashboard-card"><h1>شناسهٔ ارسال معتبر نیست.</h1><Link href="/dashboard/requests/new" className="text-link">باز کردن یک فرم تازه</Link></section>;
    const value = typeof key === "string" ? key : key.data;
    return <RequestForm key={value} operationKey={value} />;
  }
  let detail: RequestDetail | undefined;
  let listing: Awaited<ReturnType<RequestsService["list"]>> | undefined;
  let invalid = false;
  let forbidden = false;
  try {
    const service = getRequests();
    if (part) detail = await service.detail(await headers(), part);
    else {
      const params = Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined));
      listing = await service.list(await headers(), params);
    }
  } catch (error) {
    if (error instanceof RequestFailure && error.status === 404) notFound();
    if (error instanceof RequestFailure && error.status === 400) invalid = true;
    else if (error instanceof AccountAccessError && error.status === 401) redirect("/login?notice=expired&next=%2Fdashboard%2Frequests");
    else if ((error instanceof RequestFailure || error instanceof AccountAccessError) && error.status === 403) forbidden = true;
    else throw new Error("Customer request data is temporarily unavailable.");
  }
  if (forbidden) return <section className="dashboard-card"><h1>دسترسی به این بخش مجاز نیست.</h1><Link href="/dashboard" className="text-link">بازگشت به ناحیهٔ مجاز حساب</Link></section>;
  if (invalid) return <section className="dashboard-card"><h1>فیلتر درخواست معتبر نیست.</h1><p>وضعیت یا شمارهٔ صفحه را دوباره انتخاب کن.</p><Link href="/dashboard/requests" className="text-link">بازگشت به همهٔ درخواست‌ها</Link></section>;
  if (detail) return <RequestDetailView request={detail} />;
  return <RequestListView data={listing!} />;
}
export async function CustomerRequestSummary() { return <RequestSummary data={await getRequests().summary(await headers())} />; }

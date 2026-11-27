import "server-only";
import type { ManagementService, ManagementAction } from "./service.ts";
import { RequestFailure } from "../requests/service.ts";
import { AccountAccessError } from "../auth/account-data.ts";
import { requestQuery, readBody } from "../requests/http.ts";
const json = (body: object, status = 200, retryAfter?: number) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store, max-age=0", ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}) } });
export function createManagementHandler(service: ManagementService, origin: string) {
    return async function handle(request: Request, parts: string[]) {
        try {
            const from = request.headers.get("origin");
            if ((request.method === "POST" && from !== origin) || (from && from !== origin) || request.headers.get("sec-fetch-site") === "cross-site")
                throw new RequestFailure(403, "مبدأ درخواست معتبر نیست.");
            const [area, id, action] = parts;
            const query = new URL(request.url).searchParams;
            if (request.method === "GET") {
                if (parts.length === 1 && area === "summary") {
                    if (query.size)
                        throw new RequestFailure(400, "پارامتر معتبر نیست.");
                    return json({ ok: true, ...await service.overview(request.headers) });
                }
                if (parts.length === 1 && area === "requests")
                    return json({ ok: true, ...await service.requests(request.headers, requestQuery(query)) });
                if (parts.length === 1 && area === "projects")
                    return json({ ok: true, ...await service.projects(request.headers, requestQuery(query)) });
                if (parts.length === 2) {
                    if (query.size)
                        throw new RequestFailure(400, "پارامتر معتبر نیست.");
                    if (area === "requests")
                        return json({ ok: true, request: await service.requestDetail(request.headers, id) });
                    if (area === "projects")
                        return json({ ok: true, project: await service.projectDetail(request.headers, id) });
                    if (area === "operations")
                        return json({ ok: true, ...await service.operation(request.headers, id) });
                }
            }
            if (request.method === "POST" && parts.length === 3) {
                if (query.size)
                    throw new RequestFailure(400, "پارامتر ارسال معتبر نیست.");
                const selected: ManagementAction | undefined = area === "requests" ? ({ review: "review", convert: "convert", notes: "request-note" } as const)[action as "review" | "convert" | "notes"] : area === "projects" ? ({ status: "project-status", update: "project-update", notes: "project-note" } as const)[action as "status" | "update" | "notes"] : undefined;
                if (typeof selected === "string")
                    return json({ ok: true, ...await service.mutate(request.headers, selected, id, await readBody(request)) });
            }
            return json({ ok: false, message: "این مسیر در دسترس نیست." }, 404);
        }
        catch (error) {
            if (error instanceof RequestFailure)
                return json({ ok: false, message: error.message, fieldErrors: error.fieldErrors }, error.status, error.retryAfter);
            if (error instanceof AccountAccessError)
                return json({ ok: false, message: error.status === 401 ? "برای ادامه دوباره وارد حساب شوید." : "دسترسی مدیریتی مجاز نیست." }, error.status);
            console.warn("[management] An administrative operation could not be completed.");
            return json({ ok: false, message: "سرویس مدیریت موقتاً در دسترس نیست. نتیجهٔ همان عملیات را بررسی یا با همان شناسه دوباره تلاش کنید." }, 503);
        }
    };
}

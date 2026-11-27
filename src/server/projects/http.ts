import "server-only";
import type { CustomerProjectsService } from "./service.ts";
import { RequestFailure } from "../requests/service.ts";
import { requestQuery } from "../requests/http.ts";
import { AccountAccessError } from "../auth/account-data.ts";
export function projectResponse(body: object, status = 200) { return Response.json(body, { status, headers: { "Cache-Control": "private, no-store, max-age=0", ...(status === 405 ? { Allow: "GET, HEAD" } : {}) } }); }
export function createCustomerProjectsHandler(service: CustomerProjectsService, origin: string) {
    return async (request: Request, route: "collection" | "detail" | "summary", id?: string) => {
        try {
            if (request.method !== "GET" && request.method !== "HEAD")
                return projectResponse({ ok: false, message: "تغییر پروژه از ناحیهٔ مشتری مجاز نیست." }, 405);
            const from = request.headers.get("origin");
            if ((from && from !== origin) || request.headers.get("sec-fetch-site") === "cross-site")
                throw new RequestFailure(403, "مبدأ درخواست معتبر نیست.");
            const params = new URL(request.url).searchParams;
            if (route === "collection")
                return projectResponse({ ok: true, ...await service.list(request.headers, requestQuery(params)) });
            if (params.size)
                throw new RequestFailure(400, "پارامتر درخواست معتبر نیست.");
            return projectResponse({ ok: true, ...(route === "summary" ? { overview: await service.overview(request.headers) } : { project: await service.detail(request.headers, id) }) });
        }
        catch (error) {
            if (error instanceof RequestFailure)
                return projectResponse({ ok: false, message: error.message }, error.status);
            if (error instanceof AccountAccessError)
                return projectResponse({ ok: false, message: error.status === 401 ? "برای ادامه دوباره وارد حساب شو." : "این بخش فقط برای حساب مشتری است." }, error.status);
            console.warn("[projects] A customer project read could not be completed.");
            return projectResponse({ ok: false, message: "دریافت پروژه‌ها موقتاً ممکن نیست؛ دوباره تلاش کن." }, 503);
        }
    };
}

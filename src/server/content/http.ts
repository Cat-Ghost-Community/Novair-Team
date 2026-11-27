import "server-only";
import { Prisma } from "@prisma/client";
import type { ContentService } from "./service.ts";
import { RequestFailure } from "../requests/service.ts";
import { AccountAccessError } from "../auth/account-data.ts";
import { readBody, requestQuery } from "../requests/http.ts";
const json = (body: object, status = 200, retryAfter?: number) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store, max-age=0", ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}) } });
export function createContentHandler(service: ContentService, origin: string) {
    return async (request: Request, parts: string[]) => {
        try {
            const from = request.headers.get("origin");
            if ((request.method === "POST" && from !== origin) || (from && from !== origin) || request.headers.get("sec-fetch-site") === "cross-site")
                throw new RequestFailure(403, "مبدأ درخواست معتبر نیست.");
            const query = new URL(request.url).searchParams;
            if (request.method === "GET") {
                if (!parts.length && !query.size)
                    return json({ ok: true, ...await service.overview(request.headers) });
                if (parts.length === 1 && parts[0] === "settings" && !query.size)
                    return json({ ok: true, record: await service.settings(request.headers) });
                if (parts.length === 1 && parts[0] === "assets" && !query.size)
                    return json({ ok: true, ...await service.assets(request.headers) });
                if (parts.length === 2 && parts[0] === "operations" && !query.size)
                    return json({ ok: true, ...await service.recover(request.headers, parts[1]) });
                if (parts.length === 1)
                    return json({ ok: true, ...await service.list(request.headers, parts[0]!, requestQuery(query)) });
                if (parts.length === 2 && !query.size)
                    return json({ ok: true, record: await service.detail(request.headers, parts[0]!, parts[1]) });
            }
            if (request.method === "POST") {
                if (query.size)
                    throw new RequestFailure(400, "پارامتر ارسال معتبر نیست.");
                if (parts.length === 1 || parts.length === 2 || (parts.length === 3 && parts[2] === "delete")) {
                    const result = await service.write(request.headers, parts[0]!, parts[1] ?? null, parts[2] === "delete" ? "delete" : "save", await readBody(request));
                    return json({ ok: true, ...result }, parts.length === 1 && parts[0] !== "settings" && !result.replayed ? 201 : 200);
                }
            }
            return json({ ok: false, message: "این عملیات در دسترس نیست." }, ["GET", "POST"].includes(request.method) ? 404 : 405);
        }
        catch (error) {
            if (error instanceof RequestFailure)
                return json({ ok: false, message: error.message, fieldErrors: error.fieldErrors }, error.status, error.retryAfter);
            if (error instanceof AccountAccessError)
                return json({ ok: false, message: error.status === 401 ? "نشست معتبر نیست؛ دوباره وارد حساب شو." : "دسترسی به مدیریت محتوا مجاز نیست." }, error.status);
            if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2034" || (error.code === "P2010" && ["1213", "1205"].includes(String(error.meta?.code)))))
                return json({ ok: false, message: "ویرایش هم‌زمان رخ داده؛ نتیجهٔ همان ذخیره را بررسی کن و نسخهٔ تازه را بخوان." }, 409);
            console.warn("[content-management] A content operation could not be completed.");
            return json({ ok: false, message: "مدیریت محتوا موقتاً در دسترس نیست؛ متن و شناسهٔ ذخیره را نگه دار و نتیجهٔ همان عملیات را بررسی کن." }, 503);
        }
    };
}

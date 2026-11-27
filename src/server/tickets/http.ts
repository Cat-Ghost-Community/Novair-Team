import "server-only";
import type { Role } from "@prisma/client";
import { Prisma } from "@prisma/client";
import type { SupportService } from "./service.ts";
import { RequestFailure } from "../requests/service.ts";
import { AccountAccessError } from "../auth/account-data.ts";
import { readBody, requestQuery } from "../requests/http.ts";
const json = (body: object, status = 200, retryAfter?: number) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store, max-age=0", ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}) } });
export function createSupportHandler(service: SupportService, origin: string, role: Role) {
  return async (request: Request, parts: string[] = []) => {
    try {
      const from = request.headers.get("origin"); if ((request.method === "POST" && from !== origin) || (from && from !== origin) || request.headers.get("sec-fetch-site") === "cross-site") throw new RequestFailure(403, "مبدأ درخواست معتبر نیست.");
      const query = new URL(request.url).searchParams;
      if (request.method === "GET") {
        if (!parts.length) return json({ ok: true, ...await service.list(request.headers, role, requestQuery(query)) });
        if (parts.length === 1 && parts[0] === "summary") { if (query.size) throw new RequestFailure(400, "پارامتر معتبر نیست."); return json({ ok: true, ...await service.overview(request.headers, role) }); }
        if (parts.length === 1 && parts[0] === "projects" && role === "USER") { if (query.size) throw new RequestFailure(400, "پارامتر معتبر نیست."); return json({ ok: true, ...await service.projects(request.headers) }); }
        if (parts.length === 2 && parts[0] === "operations") { if (query.size) throw new RequestFailure(400, "پارامتر معتبر نیست."); return json({ ok: true, ...await service.recover(request.headers, role, parts[1]) }); }
        if (parts.length === 1) return json({ ok: true, ticket: await service.detail(request.headers, role, parts[0], requestQuery(query)) });
      }
      if (request.method === "POST") {
        if (query.size) throw new RequestFailure(400, "پارامتر ارسال معتبر نیست.");
        if (!parts.length) { const r = await service.write(request.headers, role, "create", null, await readBody(request)); return json({ ok: true, ...r }, r.replayed ? 200 : 201); }
        if (parts.length === 2 && parts[1] === "read") return json({ ok: true, ...await service.markRead(request.headers, role, parts[0], await readBody(request)) });
        const action = parts[1] === "messages" ? "reply" : parts[1] === "status" ? "state" : parts[1] === "notes" ? "note" : null;
        if (parts.length === 2 && action) return json({ ok: true, ...await service.write(request.headers, role, action, parts[0], await readBody(request)) });
      }
      return json({ ok: false, message: "این عملیات در دسترس نیست." }, request.method === "GET" || request.method === "POST" ? 404 : 405);
    } catch (error) {
      if (error instanceof RequestFailure) return json({ ok: false, message: error.message, fieldErrors: error.fieldErrors }, error.status, error.retryAfter);
      if (error instanceof AccountAccessError) return json({ ok: false, message: error.status === 401 ? "نشست معتبر نیست؛ دوباره وارد حساب شو." : "دسترسی به این بخش مجاز نیست." }, error.status);
      if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2034" || (error.code === "P2010" && ["1213", "1205"].includes(String(error.meta?.code))))) return json({ ok: false, message: "گفتگو هم‌زمان تغییر کرد؛ اطلاعات تازه را بخوان و همان ارسال را دوباره بررسی کن." }, 409);
      console.warn("[support] A support operation could not be completed.");
      return json({ ok: false, message: "پشتیبانی موقتاً در دسترس نیست. متن و شناسهٔ ارسال را نگه دار و نتیجهٔ همان ارسال را بررسی کن." }, 503);
    }
  };
}

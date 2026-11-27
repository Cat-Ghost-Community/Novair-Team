import "server-only";
import type { RequestsService } from "./service.ts";
import { RequestFailure } from "./service.ts";
import { AccountAccessError } from "../auth/account-data.ts";

const json = (body: object, status = 200, retryAfter?: number) => Response.json(body, { status, headers: {
  "Cache-Control": "private, no-store, max-age=0", ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}),
} });
export async function readBody(request: Request) {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") ?? "")) throw new RequestFailure(415, "فرمت درخواست معتبر نیست.");
  if (Number(request.headers.get("content-length") || 0) > 32768) throw new RequestFailure(413, "حجم درخواست بیش از حد مجاز است.");
  const reader = request.body?.getReader();
  if (!reader) return {};
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const item = await reader.read(); if (item.done) break;
    size += item.value.length;
    if (size > 32768) { await reader.cancel(); throw new RequestFailure(413, "حجم درخواست بیش از حد مجاز است."); }
    chunks.push(item.value);
  }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))); }
  catch { throw new RequestFailure(400, "درخواست معتبر نیست."); }
}
export function requestQuery(search: URLSearchParams) {
  if (new Set(search.keys()).size !== [...search.keys()].length) throw new RequestFailure(400, "پارامتر تکراری معتبر نیست.");
  return Object.fromEntries(search);
}
export function createRequestsHandler(service: RequestsService, origin: string) {
  return async function handle(request: Request, route: "collection" | "detail" | "operation", id?: string) {
    try {
      const from = request.headers.get("origin");
      if ((request.method === "POST" && from !== origin) || (from && from !== origin) || request.headers.get("sec-fetch-site") === "cross-site") throw new RequestFailure(403, "مبدأ درخواست معتبر نیست؛ صفحه را دوباره باز کن.");
      if (route === "collection" && request.method === "POST") {
        if (new URL(request.url).search) throw new RequestFailure(400, "پارامتر ارسال معتبر نیست.");
        const result = await service.submit(request.headers, await readBody(request));
        return json({ ok: true, ...result }, result.replayed ? 200 : 201);
      }
      if (request.method !== "GET") return json({ ok: false, message: "این عملیات در دسترس نیست." }, 405);
      if (route === "collection") return json({ ok: true, ...await service.list(request.headers, requestQuery(new URL(request.url).searchParams)) });
      if (new URL(request.url).search) throw new RequestFailure(400, "پارامتر درخواست معتبر نیست.");
      return json({ ok: true, ...(route === "detail" ? { request: await service.detail(request.headers, id) } : await service.recover(request.headers, id)) });
    } catch (error) {
      if (error instanceof RequestFailure) return json({ ok: false, message: error.message, fieldErrors: error.fieldErrors }, error.status, error.retryAfter);
      if (error instanceof AccountAccessError) return json({ ok: false, message: "برای ادامه دوباره وارد حساب شو." }, error.status);
      console.warn("[requests] A customer request operation could not be completed.");
      return json({ ok: false, message: "سرویس درخواست موقتاً در دسترس نیست. با همین شناسه دوباره تلاش کن تا نتیجهٔ ثبت بررسی شود." }, 503);
    }
  };
}

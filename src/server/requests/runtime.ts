import "server-only";
import { getDatabase } from "../db/client";
import { getAuthentication, authenticationEnabled } from "../auth/runtime";
import { createRequestsService } from "./service";
import { createRequestsHandler } from "./http";
import { site } from "@/config/site";

export function getRequests() { return createRequestsService(getDatabase(), getAuthentication(), process.env.BETTER_AUTH_SECRET!); }
export function handleRequests(request: Request, route: "collection" | "detail" | "operation", id?: string) {
  if (!authenticationEnabled()) return Response.json({ ok: false, message: "برای ادامه وارد حساب شو." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  try { return createRequestsHandler(getRequests(), site.url.origin)(request, route, id); }
  catch { return Response.json({ ok: false, message: "سرویس درخواست موقتاً در دسترس نیست." }, { status: 503, headers: { "Cache-Control": "private, no-store" } }); }
}

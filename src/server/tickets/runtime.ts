import "server-only";
import type { Role } from "@prisma/client";
import { getDatabase } from "../db/client";
import { authenticationEnabled, getAuthentication } from "../auth/runtime";
import { site } from "@/config/site";
import { createSupportService } from "./service";
import { createSupportHandler } from "./http";
export function getSupport() { return createSupportService(getDatabase(), getAuthentication(), process.env.BETTER_AUTH_SECRET!, site.url.origin); }
export function handleSupport(request: Request, parts: string[], role: Role) {
  if (!authenticationEnabled()) return Response.json({ ok: false, message: "وارد حساب شو." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  try { return createSupportHandler(getSupport(), site.url.origin, role)(request, parts); }
  catch { return Response.json({ ok: false, message: "پشتیبانی موقتاً در دسترس نیست." }, { status: 503, headers: { "Cache-Control": "private, no-store" } }); }
}

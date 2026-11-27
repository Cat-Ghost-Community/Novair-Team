import "server-only";
import { getDatabase } from "../db/client";
import { getAuthentication, authenticationEnabled } from "../auth/runtime";
import { site } from "@/config/site";
import { createContentService } from "./service";
import { createContentHandler } from "./http";
export function getContentManagement() { return createContentService(getDatabase(), getAuthentication(), process.env.BETTER_AUTH_SECRET!, site.url.origin); }
export function handleContent(request: Request, parts: string[]) {
    if (!authenticationEnabled())
        return Response.json({ ok: false, message: "وارد حساب شو." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
    try {
        return createContentHandler(getContentManagement(), site.url.origin)(request, parts);
    }
    catch {
        return Response.json({ ok: false, message: "مدیریت محتوا موقتاً در دسترس نیست." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
    }
}

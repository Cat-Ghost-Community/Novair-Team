import "server-only";
import { getDatabase } from "../db/client";
import { getAuthentication, authenticationEnabled } from "../auth/runtime";
import { createManagementService } from "./service";
import { createManagementHandler } from "./http";
import { site } from "@/config/site";
export function getManagement() { return createManagementService(getDatabase(), getAuthentication(), process.env.BETTER_AUTH_SECRET!); }
export function handleManagement(request: Request, parts: string[]) {
    if (!authenticationEnabled())
        return Response.json({ ok: false, message: "وارد حساب شوید." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
    try {
        return createManagementHandler(getManagement(), site.url.origin)(request, parts);
    }
    catch {
        return Response.json({ ok: false, message: "سرویس مدیریت موقتاً در دسترس نیست." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
    }
}

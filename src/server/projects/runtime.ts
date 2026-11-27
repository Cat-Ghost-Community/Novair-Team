import "server-only";
import { getDatabase } from "../db/client";
import { getAuthentication, authenticationEnabled } from "../auth/runtime";
import { site } from "@/config/site";
import { createCustomerProjectsService } from "./service";
import { createCustomerProjectsHandler, projectResponse } from "./http";
export function getCustomerProjects() { return createCustomerProjectsService(getDatabase(), getAuthentication()); }
export function handleCustomerProjects(request: Request, route: "collection" | "detail" | "summary", id?: string) {
    if (!authenticationEnabled())
        return projectResponse({ ok: false, message: "برای ادامه وارد حساب شو." }, 401);
    try {
        return createCustomerProjectsHandler(getCustomerProjects(), site.url.origin)(request, route, id);
    }
    catch {
        return projectResponse({ ok: false, message: "دریافت پروژه‌ها موقتاً ممکن نیست." }, 503);
    }
}

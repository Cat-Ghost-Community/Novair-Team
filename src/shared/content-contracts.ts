import { z } from "zod";
import { operationKeySchema, requestCategories } from "./request-contracts.ts";
import { safePublicProjectUrl } from "../server/content/policy.ts";
export const contentKinds = ["services", "portfolio", "faq"] as const;
// Zod's built-in type/range messages are English; never surface them in Persian account forms/APIs.
export const contentValidationMessage = (message: string) => /[\u0600-\u06ff]/.test(message) ? message : "مقدار این بخش معتبر نیست؛ راهنمای همان بخش را بررسی کن.";
export type ContentKind = typeof contentKinds[number];
export const contentLabels = { services: "خدمات", portfolio: "نمونه‌کارها", faq: "پرسش‌های رایج", settings: "تنظیمات عمومی" } as const;
export const PUBLIC_SETTINGS_KEY = "public.studio.v1";
export const defaultPublicSettings = {
    introduction: "یک استودیوی کوچک برای ایده‌هایی که قرار است خوب ساخته شوند.",
    footerText: "طراحی با فکر، ساختن با حوصله.", email: "", phone: "", telegram: "", github: "", instagram: "", aparat: "",
    servicesFallback: true, faqFallback: true,
};
const text = z.string({ error: "این بخش را کامل کن." }).max(10000, "متن بیش از حد طولانی است.")
    .transform(v => v.normalize("NFC").replace(/\r\n?/g, "\n").trim())
    .refine(v => !/[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/.test(v), "متن دارای نویسهٔ غیرمجاز است.");
const bounded = (min: number, max: number) => text.pipe(z.string().min(min, `دست‌کم ${min} نویسه بنویس.`).max(max, `حداکثر ${max} نویسه مجاز است.`));
const tags = (max: number) => z.array(bounded(1, 60)).max(max, `حداکثر ${max} مورد مجاز است.`).refine(v => new Set(v.map(t => t.toLowerCase())).size === v.length, "موارد تکراری را حذف کن.");
const category = z.enum(Object.keys(requestCategories) as [
    keyof typeof requestCategories,
    ...(keyof typeof requestCategories)[]
]);
const common = { published: z.boolean(), sortOrder: z.number().int().min(-10000).max(10000) };
export const serviceContentSchema = z.strictObject({ ...common, title: bounded(3, 150), summary: bounded(10, 500), body: bounded(0, 6000), category: category.nullable(), highlights: tags(4) });
export const portfolioContentSchema = z.strictObject({ ...common, title: bounded(3, 150), summary: bounded(10, 500), body: bounded(20, 8000), category: bounded(0, 100), technologies: tags(8),
    imageKey: z.string().max(255).nullable(), externalUrl: z.string().max(500).refine(v => !v || safePublicProjectUrl(v) !== null, "فقط لینک عمومی امن با https مجاز است.").transform(v => v ? safePublicProjectUrl(v)! : null).nullable().refine(v => v === null || v.length <= 500, "لینک پس از آماده‌سازی بیش از حد طولانی است؛ یک لینک کوتاه‌تر وارد کن."),
});
export const faqContentSchema = z.strictObject({ ...common, question: bounded(5, 255), answer: bounded(10, 6000) });
const social = (host: string) => z.string().max(500).refine(v => {
    if (!v)
        return true;
    const safe = safePublicProjectUrl(v);
    if (!safe)
        return false;
    const u = new URL(safe);
    return [host, `www.${host}`].includes(u.hostname) && !u.search && !u.hash && /^\/[a-zA-Z0-9_.-]{1,100}\/?$/.test(u.pathname);
}, "لینک مستقیم پروفایل در سرویس مشخص‌شده وارد کن؛ لینک واسطه یا تغییرمسیر مجاز نیست.");
export const publicSettingsSchema = z.strictObject({
    introduction: bounded(10, 350), footerText: bounded(3, 150),
    email: z.string().trim().max(191).refine(v => !v || /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/.test(v), "ایمیل عمومی معتبر وارد کن."),
    phone: z.string().trim().max(22).refine(v => !v || /^\+?[0-9][0-9 ()-]{5,20}$/.test(v), "شماره را با رقم‌های لاتین و بدون متن اضافه وارد کن."),
    telegram: social("t.me"), github: social("github.com"), instagram: social("instagram.com"), aparat: social("aparat.com"),
    servicesFallback: z.boolean(), faqFallback: z.boolean(),
});
export type PublicSettings = z.infer<typeof publicSettingsSchema>;
export const contentWriteSchema = z.strictObject({ operationKey: operationKeySchema, expectedVersion: z.number().int().min(0).max(2147483646), content: z.unknown() });
export const contentListSchema = z.strictObject({ page: z.string().regex(/^[1-9][0-9]{0,3}$/).transform(Number).refine(v => v <= 1000).default(1), visibility: z.enum(["ALL", "DRAFT", "PUBLISHED"]).default("ALL") });
export type ContentResult = {
    id: string;
    kind: ContentKind | "settings";
    version: number;
    published?: boolean;
    changed: boolean;
};
export type ContentFeedback = {
    ok: boolean;
    result?: ContentResult;
    replayed?: boolean;
    message?: string;
    fieldErrors?: Record<string, string[]>;
};

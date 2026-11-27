import { z } from "zod";
import { safePublicProjectUrl } from "../server/content/policy.ts";

// Canonical customer categories, independent of unpublished/managed service records.
export const requestCategories = {
  WEBSITE: "طراحی وب‌سایت", WEB_APP: "توسعهٔ وب‌اپلیکیشن", DISCORD_BOT: "ربات دیسکورد",
  TELEGRAM_BOT: "ربات تلگرام", TEAMSPEAK_BOT: "ربات تیم‌اسپیک", DASHBOARD: "پنل مدیریتی",
  SEO: "سئو و بهینه‌سازی", AUTOMATION: "اتوماسیون", OTHER: "سایر خدمات",
} as const;
export const budgetPreferences = {
  UNDECIDED: "هنوز مشخص نیست", UNDER_20M: "کمتر از ۲۰ میلیون تومان", FROM_20_TO_50M: "۲۰ تا ۵۰ میلیون تومان",
  FROM_50_TO_100M: "۵۰ تا ۱۰۰ میلیون تومان", OVER_100M: "بیشتر از ۱۰۰ میلیون تومان",
} as const;
export const timelinePreferences = {
  UNDECIDED: "نیاز به مشاوره دارم", WITHIN_MONTH: "ترجیحاً در یک ماه آینده",
  ONE_TO_THREE_MONTHS: "یک تا سه ماه آینده", FLEXIBLE: "زمان‌بندی منعطف دارم",
} as const;
export const requestStatuses = {
  NEW: "ثبت‌شده", REVIEWING: "در حال بررسی", ACCEPTED: "پذیرفته‌شده", DECLINED: "ردشده", CANCELLED: "لغوشده",
} as const;
export type RequestStatusValue = keyof typeof requestStatuses;
const keys = <T extends Record<string, string>>(object: T) => Object.keys(object) as [keyof T & string, ...(keyof T & string)[]];
const cleanText = (input: string) => input.normalize("NFC").replace(/\r\n?/g, "\n").trim();
const text = z.string({ error: "این بخش را کامل کنید." }).transform(cleanText)
  .refine((value) => !/[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/.test(value), "متن دارای نویسهٔ غیرمجاز است.");
export const operationKeySchema = z.uuid({ error: "شناسهٔ ارسال معتبر نیست؛ صفحه را دوباره باز کنید." }).transform((value) => value.toLowerCase());
export const requestIdSchema = z.string().regex(/^[a-zA-Z0-9-]{20,36}$/);
export const requestSchema = z.strictObject({
  operationKey: operationKeySchema,
  title: text.transform((value) => value.replace(/\s+/g, " ")).pipe(z.string().min(3, "عنوان باید دست‌کم ۳ نویسه باشد.").max(150, "عنوان باید حداکثر ۱۵۰ نویسه باشد.")),
  category: z.enum(keys(requestCategories), { error: "نوع خدمات را از فهرست انتخاب کنید." }),
  description: text.pipe(z.string().min(20, "دربارهٔ نیازت دست‌کم ۲۰ نویسه بنویس.").max(6000, "توضیحات باید حداکثر ۶۰۰۰ نویسه باشد.")),
  budgetPreference: z.enum(keys(budgetPreferences), { error: "بازهٔ بودجه معتبر نیست." }).default("UNDECIDED"),
  timelinePreference: z.enum(keys(timelinePreferences), { error: "زمان موردنظر معتبر نیست." }).default("UNDECIDED"),
  relevantUrl: z.string({ error: "لینک معتبر وارد کنید." }).trim().max(1000, "لینک بیش از حد طولانی است.")
    .refine((value) => value === "" || safePublicProjectUrl(value) !== null, "یک لینک عمومی و امن با https وارد کنید؛ اطلاعات ورود را در لینک ننویسید.")
    .transform((value) => value ? safePublicProjectUrl(value)! : null)
    .refine(value => value === null || value.length <= 1000, "لینک پس از تبدیل به نشانی استاندارد بیش از حد طولانی است.")
    .nullish().transform((value) => value ?? null),
});
export const requestListSchema = z.strictObject({
  status: z.enum(["ALL", ...keys(requestStatuses)], { error: "فیلتر وضعیت معتبر نیست." }).default("ALL"),
  page: z.string({ error: "شمارهٔ صفحه معتبر نیست." }).regex(/^[1-9][0-9]{0,3}$/, "شمارهٔ صفحه معتبر نیست.").transform(Number).refine((value) => value <= 1000, "شمارهٔ صفحه بیش از حد مجاز است.").default(1),
});
export type RequestInput = z.infer<typeof requestSchema>;
export const REQUEST_PAGE_SIZE = 10;
export type RequestFeedback = { ok: boolean; message?: string; fieldErrors?: Record<string, string[]>; id?: string; replayed?: boolean; status?: RequestStatusValue };
export function optionLabel(options: Record<string, string>, key: string | null, fallback = "هنوز مشخص نیست") { return key ? options[key] ?? fallback : fallback; }

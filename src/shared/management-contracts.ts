import { z } from "zod";
import { operationKeySchema, requestStatuses, type RequestStatusValue } from "./request-contracts.ts";
export const projectStatuses = { PLANNED: "برنامه‌ریزی‌شده", IN_PROGRESS: "در حال اجرا", ON_HOLD: "متوقف موقت", COMPLETED: "تکمیل‌شده", CANCELLED: "لغوشده" } as const;
export type ManagedStatus = keyof typeof projectStatuses;
export const reviewTransitions: Record<RequestStatusValue, readonly RequestStatusValue[]> = { NEW: ["REVIEWING", "DECLINED"], REVIEWING: ["ACCEPTED", "DECLINED"], ACCEPTED: [], DECLINED: [], CANCELLED: [] };
export const projectTransitions: Record<ManagedStatus, readonly ManagedStatus[]> = { PLANNED: ["IN_PROGRESS", "CANCELLED"], IN_PROGRESS: ["ON_HOLD", "COMPLETED", "CANCELLED"], ON_HOLD: ["IN_PROGRESS", "CANCELLED"], COMPLETED: [], CANCELLED: [] };
export const managementPageSize = 10;
const clean = (value: string) => value.normalize("NFC").replace(/\r\n?/g, "\n").trim();
const text = z.string({ error: "متن معتبر وارد کنید." }).transform(clean).refine(v => !/[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/.test(v), "متن دارای نویسهٔ غیرمجاز است.");
const version = z.number({ error: "نسخهٔ اطلاعات معتبر نیست؛ صفحه را تازه کنید." }).int().min(0).max(2147483646);
const base = { operationKey: operationKeySchema, expectedVersion: version };
export const reviewSchema = z.discriminatedUnion("toStatus", [
    z.strictObject({ ...base, toStatus: z.literal("REVIEWING") }),
    z.strictObject({ ...base, toStatus: z.literal("ACCEPTED") }),
    z.strictObject({ ...base, toStatus: z.literal("DECLINED"), publicExplanation: text.pipe(z.string().min(10, "دلیل قابل‌نمایش به مشتری را دست‌کم در ۱۰ نویسه بنویسید.").max(2000, "توضیح باید حداکثر ۲۰۰۰ نویسه باشد.")), privateNote: text.pipe(z.string().max(4000, "یادداشت باید حداکثر ۴۰۰۰ نویسه باشد.")).optional().default("") }),
]);
export const conversionSchema = z.strictObject(base);
export const projectStatusSchema = z.strictObject({ ...base, toStatus: z.enum(["PLANNED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"], { error: "وضعیت پروژه معتبر نیست." }) });
const date = z.string({ error: "تاریخ معتبر وارد کنید." }).refine(value => /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= "2000-01-01" && value <= "2100-12-31" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value, "تاریخ میلادی معتبر، بین سال‌های ۲۰۰۰ تا ۲۱۰۰ وارد کنید.").nullable();
export const projectUpdateSchema = z.strictObject({ ...base,
    title: text.pipe(z.string().min(3, "عنوان باید دست‌کم ۳ نویسه باشد.").max(150, "عنوان باید حداکثر ۱۵۰ نویسه باشد.")),
    description: text.pipe(z.string().min(20, "شرح باید دست‌کم ۲۰ نویسه باشد.").max(6000, "شرح باید حداکثر ۶۰۰۰ نویسه باشد.")),
    assigneeId: z.string().regex(/^[a-zA-Z0-9-]{20,36}$/, "مسئول معتبر انتخاب کنید.").nullable(),
    plannedStart: date, targetCompletion: date,
}).refine(v => !v.plannedStart || !v.targetCompletion || v.targetCompletion >= v.plannedStart, { path: ["targetCompletion"], message: "تاریخ پایان نباید پیش از شروع باشد." });
export const noteSchema = z.strictObject({ operationKey: operationKeySchema, body: text.pipe(z.string().min(3, "یادداشت باید دست‌کم ۳ نویسه باشد.").max(4000, "یادداشت باید حداکثر ۴۰۰۰ نویسه باشد.")) });
const queryBase = {
    q: text.pipe(z.string().max(100, "جست‌وجو باید حداکثر ۱۰۰ نویسه باشد.")).optional().default(""),
    page: z.string().regex(/^[1-9][0-9]{0,3}$/, "شمارهٔ صفحه معتبر نیست.").transform(Number).refine(v => v <= 1000, "شمارهٔ صفحه بیش از حد مجاز است.").default(1),
};
export const adminRequestQuerySchema = z.strictObject({ ...queryBase, status: z.enum(["ALL", ...Object.keys(requestStatuses) as [
            RequestStatusValue,
            ...RequestStatusValue[]
        ]], { error: "وضعیت درخواست معتبر نیست." }).default("ALL"), unconverted: z.enum(["true", "false"]).default("false") });
export const adminProjectQuerySchema = z.strictObject({ ...queryBase, status: z.enum(["ALL", "PLANNED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"], { error: "وضعیت پروژه معتبر نیست." }).default("ALL"), active: z.enum(["true", "false"]).default("false") });
export type ManagementResult = {
    id: string;
    resource: "request" | "project";
    version?: number;
    noteId?: string;
    alreadyConverted?: boolean;
    noChange?: boolean;
};
export type ManagementFeedback = {
    ok: boolean;
    result?: ManagementResult;
    replayed?: boolean;
    message?: string;
    fieldErrors?: Record<string, string[]>;
};

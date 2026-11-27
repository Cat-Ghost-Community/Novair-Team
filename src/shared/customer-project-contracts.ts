import { z } from "zod";
import type { ManagedStatus } from "./management-contracts.ts";
export const customerProjectStatuses: Record<ManagedStatus, string> = {
    PLANNED: "برنامه‌ریزی‌شده", IN_PROGRESS: "در حال انجام", ON_HOLD: "متوقف‌شده موقت", COMPLETED: "تکمیل‌شده", CANCELLED: "لغوشده",
};
export const projectStageDescriptions: Record<ManagedStatus, string> = {
    PLANNED: "پروژه ایجاد شده و در مرحلهٔ برنامه‌ریزی است؛ شروع اجرا هنوز ثبت نشده است.",
    IN_PROGRESS: "اجرای پروژه آغاز شده است. تغییرات ثبت‌شدهٔ وضعیت را در مسیر پروژه می‌بینی.",
    ON_HOLD: "اجرای پروژه فعلاً متوقف است. زمان ازسرگیری هنوز در این وضعیت تعیین نمی‌شود.",
    COMPLETED: "تیم نوایر تکمیل پروژه را ثبت کرده است. تاریخچهٔ واقعی همچنان در دسترس توست.",
    CANCELLED: "این پروژه در وضعیت لغوشده قرار دارد و اجرای آن ادامه ندارد.",
};
export const CUSTOMER_PROJECT_PAGE_SIZE = 10;
export const activeProjectStatuses: ManagedStatus[] = ["PLANNED", "IN_PROGRESS", "ON_HOLD"];
export const customerProjectListSchema = z.strictObject({
    status: z.enum(["ALL", "PLANNED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"], { error: "وضعیت پروژه معتبر نیست." }).default("ALL"),
    active: z.enum(["true", "false"], { error: "فیلتر پروژه‌های باز معتبر نیست." }).default("false"),
    page: z.string({ error: "شمارهٔ صفحه معتبر نیست." }).regex(/^[1-9][0-9]{0,3}$/).transform(Number).refine(value => value <= 1000, "شمارهٔ صفحه بیش از حد مجاز است.").default(1),
});

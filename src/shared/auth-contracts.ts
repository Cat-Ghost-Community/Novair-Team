import { z } from "zod";
import { nameSchema } from "./validation.ts";

const email = z.string({ error: "نشانی ایمیل معتبر وارد کنید." }).trim().toLowerCase().email("نشانی ایمیل معتبر وارد کنید.").max(191, "ایمیل بیش از حد طولانی است.");
const password = z.string({ error: "رمز عبور را وارد کنید." }).min(12, "رمز عبور باید دست‌کم ۱۲ نویسه داشته باشد.").max(128, "رمز عبور باید حداکثر ۱۲۸ نویسه باشد.");
export const loginSchema = z.strictObject({ email, password, next: z.string({ error: "مسیر درخواست معتبر نیست." }).max(300, "مسیر درخواست معتبر نیست.").optional() });
export const registrationSchema = z.strictObject({
  next: z.string({ error: "مسیر درخواست معتبر نیست." }).max(300, "مسیر درخواست معتبر نیست.").optional(),
  name: nameSchema,
  email, password, passwordConfirmation: password,
}).refine((value) => value.password === value.passwordConfirmation, { path: ["passwordConfirmation"], message: "تکرار رمز عبور یکسان نیست." });
export const changePasswordSchema = z.strictObject({
  currentPassword: password, newPassword: password, passwordConfirmation: password,
}).refine((value) => value.newPassword === value.passwordConfirmation, { path: ["passwordConfirmation"], message: "تکرار رمز عبور یکسان نیست." })
  .refine((value) => value.currentPassword !== value.newPassword, { path: ["newPassword"], message: "رمز جدید باید با رمز فعلی متفاوت باشد." });

export type PublicAccount = { id: string; name: string; email: string; role: "USER" | "ADMIN"; emailVerified: boolean; createdAt: string };
export type AuthFeedback = { ok: boolean; message?: string; fieldErrors?: Record<string, string[]>; redirectTo?: string; user?: PublicAccount | null };

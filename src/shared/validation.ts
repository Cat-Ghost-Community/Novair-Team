import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email().max(191);
export const nameSchema = z.string({ error: "نام نمایشی را وارد کنید." })
  .transform(value => value.normalize("NFC").trim())
  .refine(value => !/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/.test(value), "نام دارای نویسهٔ غیرمجاز است.")
  .pipe(z.string().min(2, "نام باید دست‌کم ۲ نویسه داشته باشد.").max(100, "نام باید حداکثر ۱۰۰ نویسه باشد."));
export const plainTextSchema = z.string().trim().min(1).max(5000);

export type ActionResult<T> = { ok: true; data: T } | {
  ok: false;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

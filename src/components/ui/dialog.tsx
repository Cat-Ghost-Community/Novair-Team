"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "./button";

export function StudioDialog() {
  return <DialogPrimitive.Root>
    <DialogPrimitive.Trigger asChild><Button variant="ghost">دربارهٔ استودیو</Button></DialogPrimitive.Trigger>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay" />
      <DialogPrimitive.Content className="dialog-content" dir="rtl">
        <DialogPrimitive.Title className="dialog-title">یک تیم کوچک، با نگاه دقیق</DialogPrimitive.Title>
        <DialogPrimitive.Description className="muted">
          نوایر یک استودیوی مستقل دونفره است. ما وب‌سایت، وب‌اپلیکیشن، داشبورد اختصاصی و ابزارهای اتوماسیون می‌سازیم؛ با توجه به جزئیاتی که استفاده از یک محصول را ساده‌تر می‌کنند.
        </DialogPrimitive.Description>
        <DialogPrimitive.Close asChild><Button className="dialog-close" variant="ghost" aria-label="بستن پنجره"><X size={20} aria-hidden="true" /></Button></DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>;
}

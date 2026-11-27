"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpLeft, Menu, X } from "lucide-react";
import { publicNavigation, projectAccess } from "@/config/navigation";
import { Button, buttonClass } from "@/components/ui/button";

export function MobileNavigation({ accountHref }: { accountHref?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" className="menu-trigger" aria-label="باز کردن فهرست">
          <Menu size={21} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="mobile-menu-overlay" />
        <Dialog.Content className="mobile-menu" dir="rtl">
          <div className="mobile-menu-heading">
            <Dialog.Title>کمی بیشتر با نوایر</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" className="icon-button" aria-label="بستن فهرست">
                <X size={20} strokeWidth={1.75} aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            {accountHref ? "مسیرهای وب‌سایت و دسترسی به حساب کاربری" : "مسیرهای وب‌سایت"}
          </Dialog.Description>
          <nav aria-label="ناوبری موبایل">
            {publicNavigation.map((item) => (
              <Dialog.Close asChild key={item.href}>
                <Link className="mobile-nav-link" href={item.href}>
                  {item.label}<ArrowUpLeft size={16} aria-hidden="true" />
                </Link>
              </Dialog.Close>
            ))}
            {accountHref && <Dialog.Close asChild>
              <Link className="mobile-nav-link" href={accountHref} prefetch={false}>ناحیهٔ کاربری</Link>
            </Dialog.Close>}
          </nav>
          {accountHref && <div className="mobile-menu-action">
            <Dialog.Close asChild>
              <Link href={projectAccess.href} prefetch={false} className={buttonClass()}>
                {projectAccess.label}<ArrowUpLeft size={17} aria-hidden="true" />
              </Link>
            </Dialog.Close>
            <p>{projectAccess.notice}</p>
          </div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

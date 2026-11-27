"use client";
import Link from "next/link";
import { useRef } from "react";
import { ChevronDown } from "lucide-react";
import { LogoutButton } from "./logout-button";

export function AccountMenu({ name, role }: { name: string; role: "USER" | "ADMIN" }) {
  const details = useRef<HTMLDetailsElement>(null);
  return <details className="account-menu" ref={details} onKeyDown={(event) => {
    if (event.key === "Escape" && details.current) { details.current.open = false; details.current.querySelector("summary")?.focus(); }
  }}><summary>حساب {name}<ChevronDown size={17} aria-hidden="true" /></summary><div className="account-menu-content"><Link href={role === "ADMIN" ? "/admin#account" : "/dashboard/profile"}>اطلاعات و امنیت حساب</Link><LogoutButton /></div></details>;
}

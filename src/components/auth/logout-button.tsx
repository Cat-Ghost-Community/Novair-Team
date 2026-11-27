"use client";

import { useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { announceAccountChange } from "./auth-sync";
import { useClientReady } from "./use-client-ready";

export function LogoutButton() {
  const ready = useClientReady();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    if (busy.current) return;
    busy.current = true; setPending(true); setError("");
    try {
      const response = await fetch("/api/auth/sign-out", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!response.ok) throw new Error("Logout failed.");
      announceAccountChange("signed-out"); window.location.replace("/login?notice=signed-out");
    } catch { setError("خروج انجام نشد. دوباره تلاش کنید."); }
    finally { busy.current = false; setPending(false); }
  }
  return <div className="logout-control"><Button variant="ghost" onClick={logout} disabled={pending || !ready} aria-busy={pending || !ready}><LogOut size={17} aria-hidden="true" />{pending ? "در حال خروج…" : "خروج از حساب"}</Button>{error && <p role="alert" className="field-error">{error}</p>}</div>;
}

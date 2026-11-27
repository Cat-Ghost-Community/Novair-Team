"use client";

import { useEffect } from "react";

export function announceAccountChange(action: "changed" | "signed-out" = "changed") {
  try { localStorage.setItem("novair-auth-event", `${Date.now()}:${action}`); } catch { /* UI hint only; storage is never an authority. */ }
}

export function AuthSync({ accountId, role }: { accountId?: string; role?: string }) {
  useEffect(() => {
    let pending: AbortController | undefined;
    async function validate() {
      if (!accountId) return;
      pending?.abort();
      const controller = new AbortController();
      pending = controller;
      try {
        const response = await fetch("/api/auth/get-session", { cache: "no-store", credentials: "same-origin", signal: controller.signal });
        if (!response.ok) return;
        const result = await response.json();
        if (controller.signal.aborted) return;
        if (!result.user && !document.querySelector("[data-preserve-draft]")) window.location.replace("/login?notice=expired");
        else if (result.user && (result.user.id !== accountId || result.user.role !== role)) window.location.reload();
      } catch { /* A network failure does not establish that a valid session has ended. */ }
      finally { if (pending === controller) pending = undefined; }
    }
    const storage = (event: StorageEvent) => { if (event.key === "novair-auth-event") { if (document.querySelector("[data-preserve-draft]") && !event.newValue?.endsWith(":signed-out")) void validate(); else window.location.reload(); } };
    const pageshow = (event: PageTransitionEvent) => { if (event.persisted) { if (document.querySelector("[data-preserve-draft]")) void validate(); else window.location.reload(); } };
    const visibility = () => { if (document.visibilityState === "visible") void validate(); };
    window.addEventListener("storage", storage);
    window.addEventListener("pageshow", pageshow);
    document.addEventListener("visibilitychange", visibility);
    void validate();
    return () => {
      pending?.abort(); window.removeEventListener("storage", storage); window.removeEventListener("pageshow", pageshow);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [accountId, role]);
  return null;
}

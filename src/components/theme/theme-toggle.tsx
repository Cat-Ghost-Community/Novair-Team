"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

function subscribe(onChange: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === "novair-theme" || event.key === null) {
      const theme = event.newValue === "dark" ? "dark" : "light";
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
      onChange();
    }
  };
  window.addEventListener("storage", storage);
  window.addEventListener("novair-theme-change", onChange);
  // A different tab can change the preference after the head script runs but before hydration.
  // Reconcile once when subscribing so that an early storage event cannot leave a stale theme.
  try {
    const theme = localStorage.getItem("novair-theme") === "dark" ? "dark" : "light";
    if (document.documentElement.dataset.theme !== theme) {
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
      onChange();
    }
  } catch { /* Preserve the in-page theme when persistent storage is unavailable. */ }
  return () => {
    window.removeEventListener("storage", storage);
    window.removeEventListener("novair-theme-change", onChange);
  };
}
const snapshot = () => document.documentElement.dataset.theme === "dark";

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, snapshot, () => false);
  function toggle() {
    const next = snapshot() ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    try { localStorage.setItem("novair-theme", next); } catch { /* Theme still works without storage. */ }
    window.dispatchEvent(new Event("novair-theme-change"));
  }
  return <Button variant="ghost" className="theme-toggle" aria-label="پوستهٔ تیره" aria-pressed={dark} onClick={toggle}>
    <Moon className="theme-moon" size={20} aria-hidden="true" />
    <Sun className="theme-sun" size={20} aria-hidden="true" />
  </Button>;
}

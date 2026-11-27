"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="fa" dir="rtl"><body style={{ fontFamily: "Tahoma, sans-serif", padding: "2rem", lineHeight: 2 }}><main><h1>بارگذاری وب‌سایت ممکن نشد</h1><p>لطفاً دوباره تلاش کنید.</p><button onClick={reset} style={{ minHeight: 44, padding: "0.5rem 1rem" }}>تلاش دوباره</button></main></body></html>;
}

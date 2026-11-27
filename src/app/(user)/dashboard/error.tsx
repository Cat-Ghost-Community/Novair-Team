"use client";
import { Button } from "@/components/ui/button";
export default function DashboardError() {
  // A document reload retries the failed Server Component read instead of replaying its cached error.
  return <section className="dashboard-card"><h1>دریافت اطلاعات ممکن نشد.</h1><p role="alert">ارتباط موقتاً برقرار نیست. اطلاعات ثبت‌شده محفوظ است؛ دوباره تلاش کن.</p><Button onClick={() => window.location.reload()}>تلاش دوباره</Button></section>;
}

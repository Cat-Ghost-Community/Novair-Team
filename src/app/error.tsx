"use client";
import Link from "next/link";
import { Button, buttonClass } from "@/components/ui/button";
import { ErrorFeedback } from "@/components/ui/primitives";

export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main id="main-content" tabIndex={-1} className="state-main"><div className="card empty-state"><h1>مشکلی در نمایش صفحه پیش آمد</h1><ErrorFeedback>لطفاً دوباره تلاش کنید.</ErrorFeedback><div className="intro-actions"><Button onClick={reset}>تلاش دوباره</Button><Link href="/" className={buttonClass("secondary")}>صفحهٔ اصلی</Link></div></div></main>;
}

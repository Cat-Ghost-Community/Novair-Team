import Link from "next/link";
import { EmptyState } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return <main id="main-content" tabIndex={-1} className="state-main"><EmptyState title="این صفحه پیدا نشد" action={<Link href="/" className={buttonClass()}>بازگشت به خانه</Link>}>ممکن است نشانی تغییر کرده باشد. از صفحهٔ اصلی دوباره شروع کنیم.</EmptyState></main>;
}

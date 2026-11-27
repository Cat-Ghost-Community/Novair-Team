import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/layout/site-shell";
import { Container } from "@/components/ui/primitives";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="site-shell"><SiteHeader /><main id="main-content" tabIndex={-1} className="account-main"><Container>{children}</Container></main><SiteFooter /></div>;
}

import { SiteFooter, SiteHeader } from "@/components/layout/site-shell";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="site-shell"><SiteHeader /><main id="main-content" tabIndex={-1}>{children}</main><SiteFooter /></div>;
}

import Link from "next/link";
import { ArrowUpLeft, UserRound } from "lucide-react";
import { BrandMark, Sparkle } from "@/components/art/brand";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Container } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { publicNavigation, projectAccess } from "@/config/navigation";
import { currentAccount } from "@/server/auth/guards";
import { AuthSync } from "@/components/auth/auth-sync";
import { authenticationEnabled } from "@/server/auth/runtime";
import { getPublicHomeContent } from "@/server/content/home";

function Brand() {
  return (
    <Link href="/" className="brand" aria-label="نوایر، صفحهٔ اصلی">
      <BrandMark />
      <span>نوایر<span className="brand-descriptor">استودیوی توسعهٔ دیجیتال</span></span>
    </Link>
  );
}

export async function SiteHeader() {
  const accountsAvailable = authenticationEnabled();
  const context = await currentAccount();
  const accountHref = context ? (context.user.role === "ADMIN" ? "/admin" : "/dashboard") : "/login";
  return (
    <header className="site-header">
      <Container className="header-inner">
        <Brand />
        <nav aria-label="ناوبری اصلی" className="desktop-nav">
          {publicNavigation.map((item) => (
            <Link key={item.href} href={item.href} className="nav-link">{item.label}</Link>
          ))}
        </nav>
        <div className="header-actions">
          <ThemeToggle />
          {accountsAvailable && <><Link href={accountHref} prefetch={false} className="account-link">
            <UserRound size={18} strokeWidth={1.75} aria-hidden="true" />ناحیهٔ کاربری
          </Link>
          <Link href={projectAccess.href} prefetch={false} className={buttonClass("primary", "header-project")} aria-describedby="project-access-note">
            {projectAccess.label}<ArrowUpLeft size={17} aria-hidden="true" />
          </Link>
          <span className="sr-only" id="project-access-note">{projectAccess.notice}</span></>}
          <MobileNavigation accountHref={accountsAvailable ? accountHref : undefined} />
        </div>
      </Container>
      {accountsAvailable && <AuthSync accountId={context?.user.id} role={context?.user.role} />}
    </header>
  );
}

export async function SiteFooter() {
  const { settings } = await getPublicHomeContent();
  const year = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric", timeZone: "Asia/Tehran",
  }).format(new Date());

  return (
    <footer className="site-footer">
      <Container>
        <div className="footer-main">
          <div className="footer-brand">
            <Brand />
            <p dir="auto">{settings.introduction}</p>
          </div>
          <nav aria-label="ناوبری پایین صفحه" className="footer-nav">
            <span className="footer-label">در نوایر</span>
            {publicNavigation.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
            <Link href="/#studio">نگاه نوایر</Link>
          </nav>
          <div className="footer-access-column">{authenticationEnabled() && <nav aria-label="دسترسی به حساب" className="footer-nav">
            <span className="footer-label">یک قدم نزدیک‌تر</span>
            <Link href="/login" prefetch={false}>ناحیهٔ کاربری</Link>
            <Link href={projectAccess.href} prefetch={false} className="footer-project">
              {projectAccess.label}<ArrowUpLeft size={16} aria-hidden="true" />
            </Link>
          </nav>}
          {Boolean(settings.email || settings.phone || settings.telegram || settings.github || settings.instagram || settings.aparat) && <nav className="footer-nav footer-contact" aria-label="راه‌های ارتباط عمومی"><span className="footer-label">در ارتباط باشیم</span>
            {settings.email && <a href={`mailto:${encodeURIComponent(settings.email).replace("%40", "@")}`}><bdi dir="ltr">{settings.email}</bdi></a>}
            {settings.phone && <a href={`tel:${settings.phone.replace(/[^+0-9]/g, "")}`}><bdi dir="ltr">{settings.phone}</bdi></a>}
            {([["telegram", "تلگرام"], ["github", "گیت‌هاب"], ["instagram", "اینستاگرام"], ["aparat", "آپارات"]] as const).map(([key, label]) => settings[key] ? <a key={key} href={settings[key]} target="_blank" rel="noopener noreferrer">{label}<span className="sr-only">، در زبانهٔ جدید</span></a> : null)}
          </nav>}</div>
          <div className="footer-signature" aria-hidden="true">
            <Sparkle />
            <span>کمی خلاقیت،<br />کلی دقت.</span>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {year} نوایر. همهٔ حقوق محفوظ است.</p>
          <p className="footer-colophon"><span className="status-dot" aria-hidden="true" />{settings.footerText}</p>
        </div>
      </Container>
    </footer>
  );
}

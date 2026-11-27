import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUpLeft } from "lucide-react";
import { BrandMark, HandDrawnLine, Sparkle } from "@/components/art/brand";
import { HeroWorkshop } from "@/components/art/hero-workshop";
import { Container, Section, Badge, Lead, LoadingIndicator } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";
import { projectAccess } from "@/config/navigation";
import { ServicesSection, PortfolioSection, PortfolioItems, WhySection, ProcessSection, FaqSection, FinalCta } from "@/components/home/sections";
import { FaqAccordion } from "@/components/ui/faq-accordion";
import { getPublicHomeContent } from "@/server/content/home";
import { site } from "@/config/site";
import { authenticationEnabled } from "@/server/auth/runtime";

const socialImage = { url: "/novair-social.png", width: 1200, height: 630, alt: "نوایر، استودیوی توسعهٔ دیجیتال" };

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  robots: { index: site.index, follow: site.index },
  openGraph: { title: site.title, description: site.description, siteName: site.name, locale: "fa_IR", type: "website", url: "/", images: [socialImage] },
  twitter: { card: "summary_large_image", title: site.title, description: site.description, images: [socialImage] },
};

// Read current publication state on every server request; no stale public draft snapshots.
export const dynamic = "force-dynamic";

async function PublishedPortfolio() {
  const content = await getPublicHomeContent();
  return <PortfolioItems content={content.portfolio} />;
}

async function PublishedFaqs() {
  const content = await getPublicHomeContent();
  if (!content.portfolio.available) return <p className="content-empty">نمایش پرسش‌های رایج فعلاً در دسترس نیست. کمی بعد دوباره سر بزن.</p>;
  return content.faqs.items.length ? <FaqAccordion items={content.faqs.items} /> : <p className="content-empty">در حال حاضر پرسش منتشرشده‌ای نداریم.{authenticationEnabled() && " پس از ورود به حساب، می‌توانی سؤالت را در بخش پشتیبانی مطرح کنی."}</p>;
}
async function PublishedServices() { const content = await getPublicHomeContent(); return <ServicesSection items={content.services} />; }

export default function HomePage() {
  const accountsAvailable = authenticationEnabled();
  const organization = {
    "@context": "https://schema.org", "@type": "Organization",
    name: site.name, alternateName: "NovAir", description: site.description, url: site.url.href,
  };
  return (
    <>
      {site.index && <script type="application/ld+json" dangerouslySetInnerHTML={{
        // Keep CMS/user input out of this script and escape HTML delimiters before serialization.
        __html: JSON.stringify(organization).replace(/</g, "\\u003c"),
      }} />}
      <Section id="home" className="hero-section" aria-labelledby="hero-title">
        <Container className="hero-grid">
          <div className="hero-copy">
            <Badge><span className="status-dot" aria-hidden="true" />یک استودیوی کوچک، با فکرهای بزرگ</Badge>
            <h1 id="hero-title">
              <span className="hero-title-line">ایده‌های قشنگ،</span>
              <span className="hero-title-line hero-title-accent">اجرای حرفه‌ای.<HandDrawnLine /></span>
            </h1>
            <Lead>از وب‌سایت و وب‌اپ تا داشبورد و ربات‌های اختصاصی؛ ایده‌ات را با طراحی دقیق و کدنویسی حساب‌شده می‌سازیم.</Lead>
            <div className="hero-actions">
              {accountsAvailable && <Link href={projectAccess.href} prefetch={false} className={buttonClass("primary", "hero-project")} aria-describedby="hero-project-note">
                {projectAccess.label}<ArrowUpLeft size={19} strokeWidth={1.75} aria-hidden="true" />
              </Link>}
              <a href="#capabilities" className={buttonClass("ghost", "hero-discover")}>
                چه چیزهایی می‌سازیم؟<ArrowDown size={17} strokeWidth={1.75} aria-hidden="true" />
              </a>
            </div>
            {accountsAvailable && <p className="hero-project-note" id="hero-project-note">{projectAccess.notice}</p>}
            <div className="hero-byline"><span className="byline-mark" aria-hidden="true"><BrandMark /></span><p>ما نوایریم؛<br /><strong>دو نفر، هم‌فکر در طراحی و توسعه.</strong></p></div>
          </div>
          <figure className="hero-art">
            <div className="art-topline" aria-hidden="true"><span className="art-topline-rule" /><span>جایی برای جان‌گرفتن ایده‌ها</span></div>
            <HeroWorkshop />
            <figcaption><span className="art-caption-dot" aria-hidden="true" />از یک فکر ساده، تا یک ساختهٔ دوست‌داشتنی.</figcaption>
          </figure>
        </Container>
        <Container className="hero-footnote"><span>طراحیِ فکرشده</span><Sparkle /><span>کدنویسیِ تمیز</span><Sparkle /><span>جزئیاتِ مهم</span><a href="#capabilities" aria-label="رفتن به توانایی‌های نوایر"><ArrowDown size={18} aria-hidden="true" /></a></Container>
      </Section>

      <Suspense fallback={<ServicesSection items={[]} />}><PublishedServices /></Suspense>
      <PortfolioSection>
        <Suspense fallback={<LoadingIndicator label="در حال دریافت نمونه‌کارها" />}><PublishedPortfolio /></Suspense>
      </PortfolioSection>
      <WhySection />
      <ProcessSection accountsAvailable={accountsAvailable} />
      <FaqSection>
        <Suspense fallback={<LoadingIndicator label="در حال دریافت پرسش‌ها" />}><PublishedFaqs /></Suspense>
      </FaqSection>
      <FinalCta accountsAvailable={accountsAvailable} />
    </>
  );
}

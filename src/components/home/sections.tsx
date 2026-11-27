import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { ArrowUpLeft, Check, MessageCircle, ScanLine, Shapes } from "lucide-react";
import { collaborationSteps } from "@/content/home";
import { projectAccess } from "@/config/navigation";
import type { PortfolioContent, PublicService } from "@/server/content/queries";
import { editorialServices } from "@/server/content/queries";
import { Container, Section } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";
import { StudioDialog } from "@/components/ui/dialog";
import { ServiceScene, PortfolioSketch, IdeaCompanion } from "@/components/art/landing-details";
import { Sparkle } from "@/components/art/brand";

export function ServiceItems({ items }: { items: readonly PublicService[] }) {
  return items.length ? <ul className="capability-list service-list">{items.map((service, index) => <li className={`service-card service-card--${service.kind}`} key={service.id}>
    <div className="service-copy"><span className="service-number">{new Intl.NumberFormat("fa-IR", { minimumIntegerDigits: 2 }).format(index + 1)}</span><h3 dir="auto">{service.title}</h3><p dir="auto">{service.description}</p><ul className="service-examples">{service.examples.map(example => <li key={example}><Check size={14} aria-hidden="true" /><bdi dir="auto">{example}</bdi></li>)}</ul></div><ServiceScene kind={service.kind} />
  </li>)}</ul> : <p className="content-empty">اطلاعات خدمات در حال به‌روزرسانی است. می‌توانی نیازت را از بخش شروع پروژه با ما در میان بگذاری.</p>;
}
export function ServicesSection({ items = editorialServices }: { items?: readonly PublicService[] }) {
  return (
    <Section id="capabilities" className="services-section" aria-labelledby="capabilities-title" tabIndex={-1}>
      <Container>
        <div className="section-heading">
          <div><p className="eyebrow"><span className="section-index">۰۱</span>خدمات نوایر</p><h2 id="capabilities-title">ابزار درست، برای مسئلهٔ تو.</h2></div>
          <p className="section-description">از یک حضور خوب در وب،<br className="desktop-break" /> تا ساده‌تر شدن کارهای هر روز.</p>
        </div>
        <ServiceItems items={items} />
      </Container>
    </Section>
  );
}

export function PortfolioSection({ children }: { children: ReactNode }) {
  return (
    <Section id="work" className="portfolio-section" aria-labelledby="work-title" tabIndex={-1}>
      <Container>
        <div className="section-heading"><div><p className="eyebrow"><span className="section-index">۰۲</span>منتخب ساخته‌ها</p><h2 id="work-title">از فکر، تا چیزی که کار می‌کند.</h2></div><p className="section-description">جایی برای دیدن کارهای منتشرشدهٔ نوایر.</p></div>
        {children}
      </Container>
    </Section>
  );
}

export function PortfolioItems({ content }: { content: PortfolioContent }) {
  return <>{content.items.length ? <div className="portfolio-list">{content.items.map((item) => (
          <article className="portfolio-item" key={item.id}>
            {item.image && <Image src={item.image} alt={`تصویر جلد ${item.title}`} width={960} height={600} className="portfolio-image" />}
            {item.category && <span className="portfolio-category"><bdi dir="auto">{item.category}</bdi></span>}
            <h3><bdi dir="auto">{item.title}</bdi></h3><p dir="auto">{item.description}</p>
            {Boolean(item.technologies?.length) && <ul className="cms-tags" aria-label="فناوری‌ها">{item.technologies!.map(tag => <li key={tag}><bdi dir="auto">{tag}</bdi></li>)}</ul>}
            {item.url && <a className="portfolio-link" href={item.url} target="_blank" rel="noopener noreferrer">مشاهدهٔ پروژهٔ {item.title}<ArrowUpLeft size={17} aria-hidden="true" /><span className="sr-only">در زبانهٔ جدید</span></a>}
          </article>
        ))}</div> : <div className="portfolio-empty">
          <PortfolioSketch />
          <div><h3>{content.available ? "ساخته‌های واقعی، در جای درست." : "کمی بعد، دوباره سر بزن."}</h3><p>{content.available ? "در حال حاضر نمونه‌کاری برای نمایش عمومی در این بخش نداریم. کارهای آمادهٔ انتشار، همراه با توضیح روشن همین‌جا قرار می‌گیرند." : "نمایش نمونه‌کارها فعلاً در دسترس نیست. خدمات و شیوهٔ همکاری را می‌توانی در همین صفحه ببینی."}</p><a className="text-link" href="#process">با شیوهٔ همکاری آشنا شو<ArrowUpLeft size={17} aria-hidden="true" /></a></div>
        </div>}
  </>;
}

export function WhySection() {
  return (
    <Section id="studio" className="why-section" aria-labelledby="studio-title" tabIndex={-1}>
      <Container className="why-grid">
        <div className="why-intro"><p className="eyebrow"><span className="section-index">۰۳</span>نگاه نوایر</p><h2 id="studio-title">تیم کوچک.<br />توجهِ نزدیک.</h2><p>ما دو نفریم؛ طراحی و توسعه را کنار هم پیش می‌بریم. گفتگو با همان آدم‌هایی است که روی جزئیات پروژه فکر می‌کنند و آن را می‌سازند.</p><StudioDialog /></div>
        <div className="why-notes">
          <article><MessageCircle size={23} strokeWidth={1.5} aria-hidden="true" /><div><h3>گفتگوی روشن، از همان ابتدا</h3><p>نیازها و محدودیت‌ها را با هم مرور می‌کنیم تا برداشت مشترکی از مسیر کار داشته باشیم.</p></div></article>
          <article><Shapes size={23} strokeWidth={1.5} aria-hidden="true" /><div><h3>متناسب با کار تو</h3><p>از مسئله شروع می‌کنیم؛ ابزاری را انتخاب می‌کنیم که به کار بیاید و پیچیدگی اضافه نسازد.</p></div></article>
          <article><ScanLine size={23} strokeWidth={1.5} aria-hidden="true" /><div><h3>جزئیاتی که در استفاده دیده می‌شوند</h3><p>متن خوانا، مسیر روشن و رابط قابل استفاده؛ هم روی گوشی، هم پشت میز کار.</p></div></article>
        </div>
      </Container>
    </Section>
  );
}

export function ProcessSection({ accountsAvailable }: { accountsAvailable: boolean }) {
  return (
    <Section id="process" className="process-section" aria-labelledby="process-title" tabIndex={-1}>
      <Container>
        <div className="section-heading"><div><p className="eyebrow"><span className="section-index">۰۴</span>مسیر همکاری</p><h2 id="process-title">قدم‌به‌قدم، با یک تصویر روشن.</h2></div><p className="section-description">{accountsAvailable ? "با ثبت نیازت در حساب کاربری شروع کن؛" : "همکاری از شناخت نیاز پروژه شروع می‌شود؛"}<br className="desktop-break" /> ادامهٔ همکاری پس از بررسی و توافق مشخص می‌شود.</p></div>
        <ol className="process-steps">{collaborationSteps.map((step) => <li key={step.number}><span className="process-number">{step.number}</span><div><h3>{step.title}</h3><p>{step.description}</p></div></li>)}</ol>
      </Container>
    </Section>
  );
}

export function FaqSection({ children }: { children: ReactNode }) {
  return (
    <Section id="faq" className="faq-section" aria-labelledby="faq-title" tabIndex={-1}>
      <Container className="faq-grid"><div className="faq-intro"><p className="eyebrow"><span className="section-index">۰۵</span>پرسش‌های رایج</p><h2 id="faq-title">چند سؤال،<br />پیش از شروع.</h2><p>پاسخ‌های کوتاه برای شناخت بهتر همکاری با نوایر. جزئیات هر پروژه را متناسب با همان نیاز بررسی می‌کنیم.</p><Sparkle className="faq-sparkle" /></div>{children}</Container>
    </Section>
  );
}

export function FinalCta({ accountsAvailable }: { accountsAvailable: boolean }) {
  return (
    <Section id="start" className="final-section" aria-labelledby="start-title" tabIndex={-1}>
      <Container><div className="final-cta"><div><p className="eyebrow">جای خوبِ شروع، یک گفتگوی روشن است.</p><h2 id="start-title">ایده‌ات را با هم<br />واقعی کنیم.</h2><p>یک فکر کوچک، یک نیاز مشخص یا ابزاری که جایش خالی است؛<br className="desktop-break" /> از شناختن مسئله شروع می‌کنیم.</p><div className="final-actions">{accountsAvailable && <Link href={projectAccess.href} prefetch={false} className={buttonClass()} aria-describedby="final-project-note">{projectAccess.label}<ArrowUpLeft size={18} aria-hidden="true" /></Link>}<a href="#faq" className={buttonClass("ghost")}>هنوز سؤالی داری؟</a></div>{accountsAvailable && <p className="final-notice" id="final-project-note">{projectAccess.notice}</p>}</div><IdeaCompanion /></div></Container>
    </Section>
  );
}

import "server-only";
import type { PrismaClient } from "@prisma/client";
import { editorialFaqs, services, type PublicFaq } from "../../content/home.ts";
import { safePublicProjectUrl } from "./policy.ts";
import { trustedContentAsset } from "./assets.ts";
import { defaultPublicSettings, publicSettingsSchema, PUBLIC_SETTINGS_KEY } from "../../shared/content-contracts.ts";

type ContentDatabase = Pick<PrismaClient, "portfolioItem" | "faq">;
export type PublicPortfolioItem = {
  id: string; title: string; description: string; category: string | null;
  image: string | null; url: string | null;
  technologies?: string[];
};
export type PortfolioContent = { available: boolean; items: PublicPortfolioItem[] };

export const serviceScene = (category: string | null): "web" | "bots" | "systems" | "automation" => category?.endsWith("_BOT") ? "bots" : category === "DASHBOARD" ? "systems" : category === "SEO" || category === "AUTOMATION" ? "automation" : "web";
export type PublicService = { id: string; kind: ReturnType<typeof serviceScene>; title: string; description: string; examples: readonly string[] };
export const editorialServices: PublicService[] = services.map(s => ({ id: s.id, kind: s.id, title: s.title, description: s.description, examples: s.examples }));

export async function queryPublishedPortfolio(db: ContentDatabase): Promise<PortfolioContent> {
  const records = await db.portfolioItem.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }, { id: "asc" }],
    take: 6,
    select: { id: true, title: true, summary: true, category: true, imageKey: true, externalUrl: true, technologies: true },
  });
  const items = await Promise.all(records.filter((record) => record.title.trim() && record.summary.trim()).map(async (record) => ({
    id: record.id, title: record.title.trim(), description: record.summary.trim(),
    category: record.category?.trim() || null, image: (await trustedContentAsset(record.imageKey))?.src ?? null,
    url: safePublicProjectUrl(record.externalUrl),
    technologies: Array.isArray(record.technologies) ? record.technologies.filter((t): t is string => typeof t === "string").slice(0, 8) : [],
  })));
  return { available: true, items };
}

export async function queryPublishedFaqs(db: ContentDatabase, fallback = true): Promise<{
  source: "managed" | "editorial" | "empty"; items: readonly PublicFaq[];
}> {
  const records = await db.faq.findMany({
    where: { published: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], take: 12,
    select: { id: true, question: true, answer: true },
  });
  const items = records.filter((item) => item.question.trim() && item.answer.trim());
  return items.length ? { source: "managed", items } : fallback ? { source: "editorial", items: editorialFaqs } : { source: "empty", items: [] };
}

export async function readPublicContent(db: PrismaClient) {
  try {
    // One repeatable-read snapshot: settings/fallback and all published lists belong to the same committed state.
    return await db.$transaction(async tx => {
      const row = await tx.siteSetting.findUnique({ where: { key: PUBLIC_SETTINGS_KEY }, select: { value: true } });
      const parsed = publicSettingsSchema.safeParse(row?.value); const settings = parsed.success ? parsed.data : { ...defaultPublicSettings };
      const [portfolio, faqs, records] = await Promise.all([queryPublishedPortfolio(tx), queryPublishedFaqs(tx, settings.faqFallback), tx.service.findMany({ where: { published: true }, select: { id: true, title: true, summary: true, category: true, highlights: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], take: 12 })]);
      const managed = records.filter(r => r.title.trim() && r.summary.trim()).map(r => ({ id: r.id, kind: serviceScene(r.category), title: r.title.trim(), description: r.summary.trim(), examples: Array.isArray(r.highlights) ? r.highlights.filter((v): v is string => typeof v === "string").slice(0, 4) : [] }));
      return { portfolio, faqs, settings, services: managed.length ? managed : settings.servicesFallback ? editorialServices : [] };
    }, { isolationLevel: "RepeatableRead", timeout: 15000 });
  } catch {
    // Never log error objects, SQL, connection strings, or draft content to public responses.
    console.warn("[public-content] A public content source is temporarily unavailable.");
    // Do not resurrect unpublished records/editorial FAQs when their persisted fallback policy cannot be read.
    return { portfolio: { available: false, items: [] } satisfies PortfolioContent, faqs: { source: "editorial" as const, items: [] as readonly PublicFaq[] }, services: [] as PublicService[], settings: { ...defaultPublicSettings } };
  }
}

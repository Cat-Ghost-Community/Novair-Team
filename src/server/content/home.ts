import "server-only";
import { cache } from "react";
import { getDatabase } from "../db/client";
import { defaultPublicSettings } from "../../shared/content-contracts";
import { readPublicContent, type PortfolioContent } from "./queries";

// Request-scoped deduplication only. No cross-request cache can retain unpublished work.
export const getPublicHomeContent = cache(async () => {
  try { return await readPublicContent(getDatabase()); }
  catch {
    console.warn("[public-content] Public content configuration is unavailable.");
    return {
      portfolio: { available: false, items: [] } satisfies PortfolioContent,
      faqs: { source: "editorial" as const, items: [] }, services: [], settings: { ...defaultPublicSettings },
    };
  }
});

import axe from "axe-core";
import type { Page } from "@playwright/test";
import type { AxeResults } from "axe-core";

// Same official axe engine/tags as prior checks. Run in the actual page instead of opening
// an auxiliary transfer page, which the constrained CDP host intermittently closed.
export async function auditPage(page: Page): Promise<AxeResults> {
  if (await page.locator("iframe, frame").count()) throw new Error("Frame accessibility requires an explicit frame audit; coverage must not be silently reduced.");
  await page.addScriptTag({ content: axe.source });
  return page.evaluate(async () => {
    const engine = (window as unknown as { axe: { run: (document: Document, options: object) => Promise<AxeResults> } }).axe;
    return engine.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } });
  });
}

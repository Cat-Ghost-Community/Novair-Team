import { expect, type PlaywrightTestArgs } from "@playwright/test";
import { auditPage } from "./accessibility.ts";

type Fixtures = Pick<PlaywrightTestArgs, "page" | "context" | "request">;
export const landingContentCases: { name: string; run: (fixtures: Fixtures) => Promise<void> }[] = [];
function test(name: string, run: (fixtures: Fixtures) => Promise<void>) { landingContentCases.push({ name, run }); }

test("complete landing presents services, real-data portfolio, approach, process and final CTA", async ({ page }) => {
  await page.goto("/");
  for (const id of ["home", "capabilities", "work", "studio", "process", "faq", "start"]) await expect(page.locator(`#${id}`)).toBeVisible();
  await expect(page.locator(".service-list > li")).toHaveCount(4);
  await expect(page.locator("#capabilities")).toContainText("خودکارسازی انتشار مقاله");
  await expect(page.locator("#capabilities")).toContainText("سامانهٔ داخلی");
  await expect(page.locator(".process-steps > li")).toHaveCount(4);
  await expect(page.locator("#process")).toContainText("ادامهٔ همکاری پس از بررسی و توافق مشخص می‌شود");
  const work = page.locator("#work");
  if (await work.locator(".portfolio-item").count() === 0) {
    await expect(work.locator(".portfolio-empty")).toBeVisible();
    await expect(work).toContainText("در حال حاضر نمونه‌کاری برای نمایش عمومی");
    await expect(work.locator("img")).toHaveCount(0);
  }
  await page.locator("#start").getByRole("link", { name: "شروع پروژه" }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Frequests%2Fnew$/);
  await expect(page.locator("main")).toContainText("پس از ورود، درخواست پروژه‌ات را ثبت کن");
});

for (const theme of ["light", "dark"]) {
  for (const width of [375, 1440]) {
    test(`FAQ keyboard, expanded state and full-page accessibility at ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((value) => localStorage.setItem("novair-theme", value), theme);
      await page.goto("/");
      const triggers = page.locator(".faq-trigger");
      await expect(triggers.first()).toBeVisible();
      expect(await triggers.count()).toBeGreaterThan(0);
      const first = triggers.first();
      await expect(first).toBeEnabled();
      await expect(first).toHaveAttribute("aria-expanded", "false");
      const controlled = await first.getAttribute("aria-controls");
      expect(controlled).toBeTruthy();
      const panel = page.locator(`[id="${controlled}"]`);
      await expect(panel).toBeHidden();
      await first.focus();
      await page.keyboard.press("Enter");
      await expect(first).toHaveAttribute("aria-expanded", "true");
      await expect(panel).toBeVisible();
      await expect(panel).toHaveAttribute("aria-labelledby", await first.getAttribute("id") as string);
      await expect(page.locator(".faq-panel:not([hidden])")).toHaveCount(1);
      await page.keyboard.press("End");
      await expect(triggers.last()).toBeFocused();
      await page.keyboard.press("Home");
      await expect(first).toBeFocused();
      if (await triggers.count() > 1) {
        await page.keyboard.press("ArrowDown");
        await expect(triggers.nth(1)).toBeFocused();
        await page.keyboard.press("Space");
        await expect(first).toHaveAttribute("aria-expanded", "false");
        await expect(triggers.nth(1)).toHaveAttribute("aria-expanded", "true");
      }
      expect((await auditPage(page)).violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
}

test("new anchors work from login and retain browser history", async ({ page }) => {
  await page.goto("/login");
  await page.locator(".desktop-nav").getByRole("link", { name: "پرسش‌ها", exact: true }).click();
  await expect(page).toHaveURL(/\/#faq$/);
  await expect(page.locator("#faq")).toBeInViewport();
  await page.locator("footer").getByRole("link", { name: "نمونه‌کارها", exact: true }).click();
  await expect(page).toHaveURL(/\/#work$/);
  await expect(page.locator("#work")).toBeInViewport();
  await page.goBack();
  await expect(page).toHaveURL(/\/#faq$/);
  await expect(page.locator("#faq")).toBeInViewport();
});

test("FAQ controls become available only after their real handlers are ready", async ({ page }) => {
  let releaseScripts = () => {};
  const gate = new Promise<void>((resolve) => { releaseScripts = resolve; });
  await page.route("**/_next/static/chunks/**", async (route) => { await gate; await route.continue(); });
  try {
    await page.goto("/", { waitUntil: "commit" });
    const first = page.locator(".faq-trigger").first();
    await expect(first).toBeVisible();
    await expect(first).toBeDisabled();
    releaseScripts();
    await expect(first).toBeEnabled();
    await first.focus();
    await page.keyboard.press("Enter");
    await expect(first).toHaveAttribute("aria-expanded", "true");
  } finally { releaseScripts(); }
});

test("new mobile links close the menu and reach the collaboration timeline", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await page.goto("/");
  await page.getByRole("button", { name: "باز کردن فهرست" }).click();
  const menu = page.getByRole("dialog", { name: "کمی بیشتر با نوایر" });
  await menu.getByRole("link", { name: "همکاری", exact: true }).click();
  await expect(menu).toBeHidden();
  await expect(page).toHaveURL(/#process$/);
  await expect(page.locator("#process")).toBeInViewport();
});

for (const theme of ["light", "dark"]) {
  test(`expanded FAQ and timeline remain usable at 200% text in ${theme}`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("novair-theme", value), theme);
    for (const width of [320, 375, 430, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      await page.locator(".faq-trigger").first().click();
      await expect(page.locator(".faq-panel:not([hidden])")).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const layout = await page.locator(".process-steps > li").evaluateAll((items) => items.map((item) => {
        const bounds = item.getBoundingClientRect();
        return { x: bounds.x, right: bounds.right, width: bounds.width };
      }));
      expect(layout.every((item) => item.width > 0 && item.x >= 0 && item.right <= width)).toBe(true);
    }
  });
}

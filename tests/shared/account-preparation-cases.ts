import { expect, type PlaywrightTestArgs } from "@playwright/test";
import { auditPage } from "./accessibility.ts";

type Fixtures = Pick<PlaywrightTestArgs, "page" | "context" | "request">;
export const accountPreparationCases: { name: string; run: (fixtures: Fixtures) => Promise<void> }[] = [];
function test(name: string, run: (fixtures: Fixtures) => Promise<void>) { accountPreparationCases.push({ name, run }); }

for (const theme of ["light", "dark"]) {
  test(`real account forms retain responsive RTL and accessibility in ${theme}`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("novair-theme", value), theme);
    for (const path of ["/login", "/register"]) {
      for (const width of [320, 375, 430, 768, 1024, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expect(page.locator("h1")).toBeVisible();
        await expect(page.locator("main form")).toHaveCount(1);
        await expect(page.locator("input[name=password]")).toBeEnabled();
        await expect(page.locator("main")).toContainText("بازیابی رمز از طریق ایمیل هنوز فعال نیست");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        expect(await page.locator(".account-access a, .password-control button").evaluateAll((links) => links.every((link) => link.getBoundingClientRect().height >= 44))).toBe(true);
        if ([375, 1440].includes(width)) expect((await auditPage(page)).violations).toEqual([]);
        await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        expect(await page.locator(".account-panel").evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          return bounds.left >= 0 && bounds.right <= innerWidth;
        })).toBe(true);
      }
    }
  });
}

test("account form navigation works with keyboard, history and saved theme", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("novair-theme", "dark"));
  await page.goto("/login");
  const registration = page.locator(".account-panel").getByRole("link", { name: "ساخت حساب" });
  await registration.focus();
  await expect(registration).toBeFocused();
  expect(await registration.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.locator("h1")).toContainText("یک حساب");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.goBack();
  await expect(page).toHaveURL(/\/login$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/register$/);
  await page.locator(".desktop-nav").getByRole("link", { name: "پرسش‌ها", exact: true }).click();
  await expect(page).toHaveURL(/\/#faq$/);
  await expect(page.locator("#faq")).toBeInViewport();
});

test("account-access mobile menu preserves focus restoration", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/login");
  const trigger = page.getByRole("button", { name: "باز کردن فهرست" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "کمی بیشتر با نوایر" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

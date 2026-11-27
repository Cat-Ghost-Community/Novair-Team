import { expect, type PlaywrightTestArgs } from "@playwright/test";
import { auditPage } from "./accessibility.ts";
import { landingContentCases } from "./landing-content-cases.ts";
import { accountPreparationCases } from "./account-preparation-cases.ts";
const testOrigin = process.env.NOVAIR_TEST_ORIGIN || "http://127.0.0.1:3000";

export const browserCases: { name: string; run: (fixtures: Pick<PlaywrightTestArgs, "page" | "context" | "request">) => Promise<void> }[] = [];
browserCases.push(...landingContentCases);
function test(name: string, run: (fixtures: Pick<PlaywrightTestArgs, "page" | "context" | "request">) => Promise<void>) {
  browserCases.push({ name, run });
}

test("Persian document, local fonts, no external requests or hydration errors", async ({ page }) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("request", (request) => { if (!request.url().startsWith(`${testOrigin}/`)) external.push(request.url()); });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "fa");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("ایده‌های قشنگ");
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('16px "' + getComputedStyle(document.body).fontFamily.split(",")[0]?.replaceAll('"', "").trim() + '"'))).toBe(true);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test("light is default even with dark OS; explicit choice persists between pages and reloads", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const toggle = page.getByRole("button", { name: "پوستهٔ تیره" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator("header").getByRole("link", { name: "ناحیهٔ کاربری" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "پوستهٔ تیره" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("theme works when persistent storage is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, "getItem", { value: () => { throw new Error("blocked"); } });
    Object.defineProperty(Storage.prototype, "setItem", { value: () => { throw new Error("blocked"); } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "پوستهٔ تیره" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("keyboard navigation, dialog focus trap, Escape and focus restoration", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "رفتن به محتوای اصلی" })).toBeFocused();
  const trigger = page.getByRole("button", { name: "دربارهٔ استودیو" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const close = page.getByRole("button", { name: "بستن پنجره" });
  await expect(close).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

for (const width of [320, 375, 430, 768, 1024, 1440, 1920]) {
  for (const theme of ["light", "dark"]) {
    test(`RTL layout at ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((value) => localStorage.setItem("novair-theme", value), theme);
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const smallControls = await page.locator("header button, header a, .hero-actions a").evaluateAll((items) => items.filter((item) => item.getBoundingClientRect().width > 0 && item.getBoundingClientRect().height < 44).map((item) => ({ label: item.textContent, height: item.getBoundingClientRect().height })));
      expect(smallControls).toEqual([]);
      if ([375, 1440].includes(width)) {
        const result = await auditPage(page);
        expect(result.violations).toEqual([]);
      }
    });
  }
}

test("all reserved private routes fail closed, including forged role cookies", async ({ page, context }) => {
  await context.addCookies([{ name: "role", value: "ADMIN", url: testOrigin }, { name: "session", value: "forged", url: testOrigin }, { name: "novair.session_token", value: "forged", url: testOrigin }]);
  for (const path of ["/dashboard", "/dashboard/requests", "/dashboard/tickets", "/dashboard/profile", "/admin", "/admin/requests", "/admin/projects", "/admin/tickets", "/admin/users", "/admin/content"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login\?next=/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("ورود به نوایر");
    await expect(page.locator("form input[name=password]")).toBeVisible();
  }
});

test("landing content and all public navigation destinations are real", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".capability-list > li")).toHaveCount(4);
  await expect(page.locator("#capabilities")).toContainText("دیسکورد، تلگرام و تیم‌اسپیک");
  await expect(page.locator("footer")).toContainText("همهٔ حقوق محفوظ است");
  const destinations = await page.locator("a[href]").evaluateAll((links) => links.map((link) => {
    const url = new URL((link as HTMLAnchorElement).href);
    return { local: url.origin === location.origin, path: url.pathname, hashExists: !url.hash || Boolean(document.getElementById(decodeURIComponent(url.hash.slice(1)))) };
  }));
  expect(destinations.every((link) => link.local && link.hashExists && ["/", "/login", "/dashboard/requests/new"].includes(link.path))).toBe(true);
  await page.locator(".hero-actions").getByRole("link", { name: "شروع پروژه" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("ورود به نوایر");
  await expect(page.locator("main")).toContainText("پس از ورود، درخواست پروژه‌ات را ثبت کن");
});

for (const theme of ["light", "dark"]) {
  test(`mobile menu keyboard, navigation, Escape and backdrop in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.addInitScript((value) => localStorage.setItem("novair-theme", value), theme);
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "باز کردن فهرست" });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.focus();
    await page.keyboard.press("Enter");
    const menu = page.getByRole("dialog", { name: "کمی بیشتر با نوایر" });
    await expect(menu).toBeVisible();
    await expect(page.getByRole("button", { name: "بستن فهرست" })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(menu.getByRole("link", { name: "شروع پروژه" })).toBeFocused();
    const result = await auditPage(page);
    expect(result.violations).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(menu).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await menu.getByRole("link", { name: "توانایی‌ها", exact: true }).click();
    await expect(menu).not.toBeVisible();
    await expect(page).toHaveURL(/#capabilities$/);
    await page.goto("/");
    await trigger.click();
    await expect(menu).toBeVisible();
    await page.locator(".mobile-menu-overlay").click({ position: { x: 5, y: 700 } });
    await expect(menu).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(menu).not.toBeVisible();
    await expect(page.locator(".desktop-nav")).toBeVisible();
  });
}

test("theme choice synchronizes between isolated application tabs", async ({ page, context }) => {
  await page.goto("/");
  const second = await context.newPage();
  try {
    await second.goto("/");
    await page.getByRole("button", { name: "پوستهٔ تیره" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(second.locator("html")).toHaveAttribute("data-theme", "dark");
    await second.getByRole("button", { name: "پوستهٔ تیره" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  } finally { await second.close(); }
});

test("a theme change during delayed hydration is reconciled from storage", async ({ page, context }) => {
  await page.goto("/");
  const second = await context.newPage();
  let releaseScripts = () => {};
  const scriptsReady = new Promise<void>((resolve) => { releaseScripts = resolve; });
  await second.route("**/_next/static/chunks/**", async (route) => {
    await scriptsReady;
    await route.continue();
  });
  try {
    await second.goto("/", { waitUntil: "commit" });
    await second.locator(".theme-toggle").waitFor({ state: "visible" });
    await expect(second.locator("html")).toHaveAttribute("data-theme", "light");
    await page.getByRole("button", { name: "پوستهٔ تیره" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    releaseScripts();
    await second.waitForLoadState("load");
    await expect(second.locator("html")).toHaveAttribute("data-theme", "dark");
  } finally { releaseScripts(); await second.close(); }
});

for (const width of [320, 375, 768, 1024, 1440]) {
  test(`increased text size at ${width}px keeps content reachable`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator(".hero-actions").getByRole("link", { name: "شروع پروژه" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (width < 1024) {
      await page.getByRole("button", { name: "باز کردن فهرست" }).click();
      await expect(page.getByRole("button", { name: "بستن فهرست" })).toBeVisible();
      await page.keyboard.press("Escape");
    }
  });
}

test("mobile navigation remains scrollable in landscape", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 375 });
  await page.goto("/");
  await page.getByRole("button", { name: "باز کردن فهرست" }).click();
  const menu = page.getByRole("dialog", { name: "کمی بیشتر با نوایر" });
  await menu.getByRole("link", { name: "شروع پروژه" }).scrollIntoViewIfNeeded();
  await expect(menu.getByRole("link", { name: "شروع پروژه" })).toBeInViewport();
  await page.keyboard.press("Escape");
  await expect(menu).not.toBeVisible();
});

for (const theme of ["light", "dark"]) {
  test(`hover, visible keyboard focus and studio dialog stay accessible in ${theme}`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("novair-theme", value), theme);
    await page.goto("/");
    const action = page.locator(".hero-actions").getByRole("link", { name: "شروع پروژه" });
    const background = await action.evaluate((element) => getComputedStyle(element).backgroundColor);
    await action.hover();
    await expect.poll(() => action.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(background);
    await page.keyboard.press("Tab");
    await action.focus();
    const focus = await action.evaluate((element) => ({
      width: parseFloat(getComputedStyle(element).outlineWidth),
      style: getComputedStyle(element).outlineStyle,
    }));
    expect(focus.width).toBeGreaterThanOrEqual(2);
    expect(focus.style).not.toBe("none");
    await page.getByRole("button", { name: "دربارهٔ استودیو" }).click();
    const dialog = page.getByRole("dialog", { name: "یک تیم کوچک، با نگاه دقیق" });
    await expect(dialog).toBeVisible();
    expect((await auditPage(page)).violations).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole("button", { name: "دربارهٔ استودیو" })).toBeFocused();
  });
}

test("auth routes render real forms with honest recovery availability; unknown routes are 404", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("یک حساب");
  await expect(page.locator("input[name=password]")).toBeVisible();
  await expect(page.locator("input[name=passwordConfirmation]")).toBeVisible();
  await expect(page.locator("main")).toContainText("بازیابی رمز از طریق ایمیل هنوز فعال نیست");
  expect((await page.goto("/does-not-exist"))?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("پیدا نشد");
});

test("security headers and indexing remain local-only", async ({ request }) => {
  const response = await request.get("/");
  expect(response.headers()["x-robots-tag"]).toContain("noindex");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(await response.text()).toContain('name="robots" content="noindex, nofollow');
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /");
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain("<loc>");
});

test("reduced motion removes transitions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const transition = await page.getByRole("button", { name: "پوستهٔ تیره" }).evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(transition).toBe("0s");
  expect(await page.locator(".workshop-star").evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
});

browserCases.push(...accountPreparationCases);

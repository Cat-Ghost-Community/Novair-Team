import { test } from "node:test";
import assert from "node:assert/strict";

const origin = "http://127.0.0.1:3000";

test("local production server responds with Persian RTL semantic HTML", async () => {
  const response = await fetch(origin);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<html[^>]+lang="fa"[^>]+dir="rtl"/);
  assert.match(html, /<main id="main-content"/);
  assert.match(html, /<h1\b[^>]*>/);
  assert.match(html, /ایده‌های قشنگ/);
  assert.match(html, /data-theme="light"/);
  assert.match(html, /localStorage.getItem\('novair-theme'\)/);
  assert.match(html, /http:\/\/127.0.0.1:3000/);
});

test("protected routes redirect to login even with forged credentials", async () => {
  for (const route of ["/dashboard", "/dashboard/requests", "/dashboard/tickets", "/dashboard/profile", "/admin", "/admin/requests", "/admin/projects", "/admin/tickets", "/admin/users", "/admin/content"]) {
    const response = await fetch(origin + route, { redirect: "manual", headers: { cookie: "role=ADMIN; session=forged", "x-user-role": "ADMIN" } });
    assert.equal(response.status, 307, route);
    const location = new URL(response.headers.get("location"), origin);
    assert.equal(location.pathname, "/login");
    assert.equal(location.searchParams.get("next"), route);
    assert.match(response.headers.get("cache-control"), /no-store/);
    const html = await response.text();
    assert(!html.includes("database_url"));
  }
});

test("auth screens collect no credentials and no auth endpoint is active", async () => {
  for (const route of ["/login", "/register"]) {
    const response = await fetch(origin + route);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /هنوز فعال/);
    assert(!html.includes('type="password"'));
    assert(!html.includes("<form"));
  }
  assert.equal((await fetch(origin + "/api/auth/sign-up/email", { method: "POST" })).status, 404);
});

test("unknown public routes return a Persian 404", async () => {
  const response = await fetch(origin + "/does-not-exist");
  assert.equal(response.status, 404);
  assert.match(await response.text(), /این صفحه پیدا نشد/);
});

test("headers and crawling policies keep local builds private from search indexing", async () => {
  const response = await fetch(origin);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.match(response.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.match(response.headers.get("x-robots-tag"), /noindex/);
  assert.equal(response.headers.get("x-powered-by"), null);
  assert.match(await (await fetch(origin + "/robots.txt")).text(), /Disallow: \//);
  assert(!((await (await fetch(origin + "/sitemap.xml")).text()).includes("<loc>")));
});

test("all referenced script, stylesheet and font assets are local and served", async () => {
  const html = await (await fetch(origin)).text();
  const sources = [...html.matchAll(/(?:src|href)="([^\"]+)"/g)].map((match) => match[1]);
  const assets = [...new Set(sources.filter((source) => source.startsWith("/_next/")))];
  assert(assets.some((asset) => asset.endsWith(".js")));
  assert(assets.some((asset) => asset.endsWith(".css")));
  for (const asset of assets) {
    const response = await fetch(origin + asset);
    assert.equal(response.status, 200, asset);
    if (asset.endsWith(".css")) {
      const css = await response.text();
      const fonts = [...css.matchAll(/url\((\/_next\/static\/media\/[^)]+\.woff2)\)/g)].map((match) => match[1]);
      assert(fonts.length >= 2);
      for (const font of fonts) assert.equal((await fetch(origin + font)).status, 200, font);
    }
  }
  assert(!sources.some((source) => source.startsWith("https://")));
});

test("public content is rendered on the server without a reusable page cache", async () => {
  const response = await fetch(origin);
  assert.match(response.headers.get("cache-control"), /no-store/);
  const html = await response.text();
  for (const id of ["capabilities", "work", "studio", "process", "faq", "start"]) assert(html.includes(`id="${id}"`));
  assert.match(html, /خودکارسازی انتشار مقاله/);
  assert.match(html, /aria-expanded="false" aria-controls=/);
  assert.match(html, /class="faq-panel"/);
  assert(!html.includes("DATABASE_URL="));
});

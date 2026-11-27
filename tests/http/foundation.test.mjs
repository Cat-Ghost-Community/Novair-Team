import { test } from "node:test";
import assert from "node:assert/strict";

const origin = process.env.NOVAIR_TEST_ORIGIN || "http://127.0.0.1:3000";

test("reviewed portfolio cover is served directly with the image optimizer disabled", async () => {
  const cover = "/portfolio/novair-workshop.png";
  const image = await fetch(origin + cover);
  assert.equal(image.status, 200);
  assert.match(image.headers.get("content-type"), /^image\/png/);
  await image.arrayBuffer();
  const optimized = await fetch(origin + "/_next/image?" + new URLSearchParams({ url: cover, w: "640", q: "75" }));
  assert.equal(optimized.status, 404);
});

test("malformed UTF-8 cannot reach credential or business JSON processing", async () => {
  const invalid = Buffer.from([0xff]);
  const cases = [
    ["/api/auth/change-password", Buffer.concat([
      Buffer.from('{"currentPassword":"current-password'),
      invalid,
      Buffer.from('","newPassword":"new-password-123","passwordConfirmation":"new-password-123"}'),
    ])],
    ["/api/requests", Buffer.concat([Buffer.from('{"title":"invalid'), invalid, Buffer.from('"}')])],
  ];
  for (const [path, bytes] of cases) {
    const response = await fetch(origin + path, {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: bytes,
    });
    assert.equal(response.status, 400, path);
    assert.equal(response.headers.get("set-cookie"), null);
    assert.match(response.headers.get("cache-control"), /no-store/);
  }
});

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
  assert(html.includes(origin));
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

test("auth screens render actual account forms and reject invalid requests without cookies", async () => {
  for (const route of ["/login", "/register"]) {
    const response = await fetch(origin + route);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /بازیابی رمز از طریق ایمیل هنوز فعال نیست/);
    assert(html.includes('type="password"'));
    assert(html.includes("<form"));
  }
  const invalid = await fetch(origin + "/api/auth/sign-up/email", { method: "POST", headers: { origin, "content-type": "application/json" }, body: "{}" });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.headers.get("set-cookie"), null);
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

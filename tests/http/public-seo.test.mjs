import assert from "node:assert/strict";
import { test } from "node:test";

const origin = process.env.NOVAIR_TEST_ORIGIN;
const canonical = process.env.NOVAIR_TEST_CANONICAL;
if (!origin || new URL(origin).hostname !== "127.0.0.1" ||
  !canonical || new URL(canonical).protocol !== "https:") {
  throw new Error("Use a loopback server built with the public SEO profile and a test canonical HTTPS origin.");
}

test("the public production profile emits one canonical homepage and matching search and share metadata", async () => {
  const response = await fetch(origin + "/?utm_source=seo-check");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-robots-tag"), null);
  const html = await response.text();
  const canonicalTags = [...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)];
  assert.deepEqual(canonicalTags.map(([, href]) => href), [canonical + "/"]);
  assert.match(html, /<meta name="robots" content="index, follow"/);
  assert.ok(html.includes(`property="og:url" content="${canonical}/"`));
  assert.ok(html.includes(`property="og:image" content="${canonical}/novair-social.png"`));
  const structuredData = JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);
  assert.equal(structuredData["@type"], "Organization");
  assert.equal(structuredData.url, canonical + "/");
  assert.doesNotMatch(html, /href="\/(?:login|register|dashboard)(?:[?/"#])/);

  const robots = await (await fetch(origin + "/robots.txt")).text();
  assert.ok(robots.includes(`Sitemap: ${canonical}/sitemap.xml`));
  assert.doesNotMatch(robots, /Disallow: \//);
  const sitemap = await (await fetch(origin + "/sitemap.xml")).text();
  assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, location]) => location), [canonical + "/"]);

  const image = await fetch(origin + "/novair-social.png");
  assert.equal(image.status, 200);
  assert.match(image.headers.get("content-type"), /^image\/png/);
  const imageBytes = Buffer.from(await image.arrayBuffer());
  assert.equal(imageBytes.readUInt32BE(16), 1200);
  assert.equal(imageBytes.readUInt32BE(20), 630);
});

test("account, API, and private route responses still carry noindex", async () => {
  for (const path of ["/login", "/register", "/api/auth/get-session", "/dashboard/requests", "/admin/content"]) {
    const response = await fetch(origin + path, { redirect: "manual" });
    assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/, path);
  }
  const response = await fetch(origin + "/missing-public-page");
  assert.equal(response.status, 404);
  assert.match(await response.text(), /<meta name="robots" content="noindex/);
});

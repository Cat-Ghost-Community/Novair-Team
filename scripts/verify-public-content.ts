import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { getDatabaseUrl } from "../src/server/db/environment.ts";
import { queryPublishedPortfolio, queryPublishedFaqs, readPublicContent } from "../src/server/content/queries.ts";

// Test fixtures belong only to a newly created, randomly named local test database.
// No INSERT/UPDATE/DELETE is issued against the configured application's content tables.
const applicationUrl = new URL(getDatabaseUrl());
assert(process.env.MYSQL_ROOT_PASSWORD, "Local test database creation needs MYSQL_ROOT_PASSWORD.");
const rootUrl = new URL(applicationUrl);
rootUrl.username = "root";
rootUrl.password = process.env.MYSQL_ROOT_PASSWORD;
rootUrl.pathname = "/mysql";
rootUrl.searchParams.set("connection_limit", "2");
rootUrl.searchParams.set("connect_timeout", "5");
const name = `novair_content_test_${randomBytes(6).toString("hex")}`;
assert(/^novair_content_test_[a-f0-9]{12}$/.test(name));
const root = new PrismaClient({ datasources: { db: { url: rootUrl.href } } });
const application = new PrismaClient({ datasources: { db: { url: applicationUrl.href } } });
let db: PrismaClient | undefined;
let unavailable: PrismaClient | undefined;
let created = false;
try {
  const before = [await application.portfolioItem.count(), await application.faq.count()];
  // Identifiers cannot be query parameters. The generated name is strictly validated above.
  await root.$executeRawUnsafe(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  created = true;
  const testUrl = new URL(rootUrl);
  testUrl.pathname = `/${name}`;
  db = new PrismaClient({ datasources: { db: { url: testUrl.href } } });
  // Apply the genuine checked-in simple DDL migrations; no fabricated migration ledger is created.
  for (const directory of (await readdir("prisma/migrations", { withFileTypes: true })).filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const sql = await readFile(`prisma/migrations/${directory.name}/migration.sql`, "utf8");
    for (const statement of sql.split(/;\s*(?:\r?\n|$)/).filter((part) => part.trim())) {
      await db.$executeRawUnsafe(statement);
    }
  }
  assert.deepEqual((await queryPublishedPortfolio(db)).items, []);
  assert.equal((await queryPublishedFaqs(db)).source, "editorial");
  console.log("PASS: isolated migrated MySQL schema and honest empty/editorial states.");

  await db.portfolioItem.createMany({ data: [
    { id: "draft", slug: "test-draft", title: "DRAFT-DO-NOT-EXPOSE", summary: "Hidden draft", body: "PRIVATE-BODY", category: "Draft", published: false, sortOrder: -100 },
    { id: "second", slug: "test-second", title: "آزمون دوم", summary: "توضیح عمومی دوم", body: "PRIVATE-BODY", published: true, sortOrder: 2, externalUrl: "javascript:alert(1)" },
    { id: "first", slug: "test-first", title: "آزمون اول", summary: "توضیح عمومی اول", body: "PRIVATE-BODY", published: true, sortOrder: 1, category: "وب‌سایت", imageKey: "portfolio/missing-test.webp", externalUrl: "https://example.com/project" },
  ] });
  const portfolio = await queryPublishedPortfolio(db);
  assert.deepEqual(portfolio.items.map((item) => item.id), ["first", "second"]);
  assert.equal(portfolio.items[0]?.category, "وب‌سایت");
  assert.equal(portfolio.items[0]?.url, "https://example.com/project");
  assert.equal(portfolio.items[0]?.image, null);
  assert.equal(portfolio.items[1]?.url, null);
  assert(!JSON.stringify(portfolio).includes("PRIVATE-BODY"));
  assert(!JSON.stringify(portfolio).includes("DRAFT-DO-NOT-EXPOSE"));
  console.log("PASS: publication filter, display order, optional category/image, URL policy and public DTO boundary.");
  await db.portfolioItem.update({ where: { id: "first" }, data: { published: false } });
  assert.deepEqual((await queryPublishedPortfolio(db)).items.map((item) => item.id), ["second"]);
  console.log("PASS: unpublishing is visible on the next content read without rebuild/cache invalidation.");

  await db.faq.createMany({ data: [
    { id: "faq-draft", question: "DRAFT-FAQ", answer: "PRIVATE-ANSWER", published: false, sortOrder: -1 },
    { id: "faq-second", question: "پرسش دوم", answer: "پاسخ دوم", published: true, sortOrder: 2 },
    { id: "faq-first", question: "پرسش اول", answer: "پاسخ اول", published: true, sortOrder: 1 },
  ] });
  const managed = await queryPublishedFaqs(db);
  assert.equal(managed.source, "managed");
  assert.deepEqual(managed.items.map((item) => item.id), ["faq-first", "faq-second"]);
  assert(!JSON.stringify(managed).includes("PRIVATE-ANSWER"));
  await db.faq.updateMany({ data: { published: false } });
  assert.equal((await queryPublishedFaqs(db)).source, "editorial");
  console.log("PASS: managed FAQs supersede the editorial set, hide drafts and restore fallback after unpublishing.");

  const offlineUrl = new URL(testUrl);
  offlineUrl.port = "1";
  offlineUrl.searchParams.set("connect_timeout", "1");
  unavailable = new PrismaClient({ datasources: { db: { url: offlineUrl.href } } });
  const offline = await readPublicContent(unavailable);
  assert.equal(offline.portfolio.available, false);
  assert.equal(offline.faqs.source, "editorial");
  assert(!JSON.stringify(offline).includes(rootUrl.password));
  assert.deepEqual([await application.portfolioItem.count(), await application.faq.count()], before);
  console.log("PASS: real connection-failure fallback; application portfolio/FAQ counts unchanged.");
} catch {
  console.error("FAIL: isolated public-content verification failed; no fixtures were added to the application's database.");
  process.exitCode = 1;
} finally {
  await unavailable?.$disconnect();
  await db?.$disconnect();
  if (created) {
    await root.$executeRawUnsafe(`DROP DATABASE \`${name}\``);
    console.log("Removed only the randomly named test database created by this verification.");
  }
  await application.$disconnect();
  await root.$disconnect();
}

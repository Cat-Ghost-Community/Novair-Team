import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile, readdir, writeFile, unlink, mkdir } from "node:fs/promises";
import { PrismaClient, Prisma } from "@prisma/client";
import { getDatabaseUrl } from "../src/server/db/environment.ts";

const contextFile = ".local-tools/auth-test-context.json";
const envFile = ".local-tools/auth-test.env";
const applicationUrl = new URL(getDatabaseUrl());
assert(process.env.MYSQL_ROOT_PASSWORD, "Local test database setup requires MYSQL_ROOT_PASSWORD.");
const rootUrl = new URL(applicationUrl);
rootUrl.username = "root"; rootUrl.password = process.env.MYSQL_ROOT_PASSWORD; rootUrl.pathname = "/mysql";
rootUrl.searchParams.set("connection_limit", "3");
const root = new PrismaClient({ datasources: { db: { url: rootUrl.href } } });
const application = new PrismaClient({ datasources: { db: { url: applicationUrl.href } } });
let testDatabase;
let stage = "validate fixture operation";
// Preserve every model/count guard while avoiding a burst of simultaneous pool initialization queries.
const counts = async () => {
  const result = [];
  for (const model of Prisma.dmmf.datamodel.models) result.push(await application[model.name[0].toLowerCase()+model.name.slice(1)].count());
  return result;
};
try {
  if (process.argv[2] === "prepare") {
    let existing = false; try { await readFile(contextFile); existing = true; } catch { /* Not yet created. */ }
    assert(!existing, "A test context already exists; do not overwrite or delete a potentially running verification.");
    const name = `novair_auth_test_${randomBytes(6).toString("hex")}`;
    const nonce = randomBytes(24).toString("hex");
    assert(/^novair_auth_test_[a-f0-9]{12}$/.test(name));
    stage = "read application counts";
    const before = await counts();
    stage = "create isolated database";
    await root.$executeRawUnsafe(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    const testUrl = new URL(rootUrl); testUrl.pathname = `/${name}`; testUrl.searchParams.set("connection_limit", "5");
    testDatabase = new PrismaClient({ datasources: { db: { url: testUrl.href } } });
    stage = "apply isolated migrations";
    for (const entry of (await readdir("prisma/migrations", { withFileTypes: true })).filter((item) => item.isDirectory()).sort((a,b) => a.name.localeCompare(b.name))) {
      const sql = await readFile(`prisma/migrations/${entry.name}/migration.sql`, "utf8");
      for (const statement of sql.split(/;\s*(?:\r?\n|$)/).filter((item) => item.trim())) await testDatabase.$executeRawUnsafe(statement);
    }
    stage = "persist ownership marker";
    await testDatabase.siteSetting.create({ data: { key: "__novair_auth_test", value: { nonce } } });
    await mkdir(".local-tools", { recursive: true });
    await writeFile(contextFile, JSON.stringify({ name, nonce, before, origin: "http://127.0.0.1:3100", createdUtc: new Date().toISOString() }, null, 2), { flag: "wx", mode: 0o600 });
    await writeFile(envFile, [
      `DATABASE_URL=${testUrl.href}`, "SITE_URL=http://127.0.0.1:3100", "NOVAIR_TEST_ORIGIN=http://127.0.0.1:3100", "AUTH_ENABLED=true",
      `BETTER_AUTH_SECRET=${randomBytes(48).toString("base64url")}`,
      `ADMIN_EMAIL=auth-admin-${randomBytes(5).toString("hex")}@example.invalid`,
      "ADMIN_NAME=مدیر آزمون نوایر", `ADMIN_PASSWORD=${randomBytes(24).toString("hex")}`, "",
    ].join("\n"), { flag: "wx", mode: 0o600 });
    console.log("PASS: created isolated local auth database using checked-in migrations and private test configuration. Application data unchanged.");
  } else if (["cleanup", "verify"].includes(process.argv[2])) {
    const context = JSON.parse(await readFile(contextFile, "utf8"));
    assert(/^novair_auth_test_[a-f0-9]{12}$/.test(context.name));
    assert(`/${context.name}` !== applicationUrl.pathname);
    const testUrl = new URL(rootUrl); testUrl.pathname = `/${context.name}`;
    testDatabase = new PrismaClient({ datasources: { db: { url: testUrl.href } } });
    const marker = await testDatabase.siteSetting.findUnique({ where: { key: "__novair_auth_test" } });
    assert(marker?.value?.nonce === context.nonce, "Test database ownership marker does not match; cleanup refused.");
    assert.deepEqual(await counts(), context.before, "Application content/account counts changed during isolated verification.");
    if (process.argv[2] === "cleanup") {
      await testDatabase.$disconnect(); testDatabase = undefined;
      await root.$executeRawUnsafe(`DROP DATABASE \`${context.name}\``);
      await unlink(contextFile); await unlink(envFile);
      console.log("PASS: removed only the owned isolated auth database/private fixture configuration; application counts unchanged.");
    } else console.log("PASS: existing isolated fixture nonce, database separation and every application model count verified; no records changed.");
  } else throw new Error("Use prepare or cleanup.");
} catch (error) {
  console.error("FAIL: isolated auth database operation failed; investigate the retained local test context. No application reset was attempted.");
  const code = error?.code ?? error?.errorCode ?? error?.name;
  console.error(`Safe fixture diagnostic: ${stage}; ${/^[A-Za-z0-9_]{1,60}$/.test(String(code)) ? code : "UNKNOWN"}.`);
  process.exitCode = 1;
} finally { await testDatabase?.$disconnect(); await application.$disconnect(); await root.$disconnect(); }

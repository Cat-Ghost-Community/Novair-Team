import assert from "node:assert/strict";
import { createServer } from "node:net";
import { mkdtemp, readFile, readdir, rmdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { parsePort, proxyReservations, selectPort } from "../../scripts/server-install-network.mjs";
import { activateRelease, isReadyHomepage, replacePrivateFile, requireAppliedMigrations, requireSameSchema, schemaManifest } from "../../scripts/server-release.mjs";
import { checkBuildBudget } from "../../scripts/server-build-budget.mjs";
import { failOnlyOnLivePort, forcedFailure, markHomepage } from "../../scripts/server-rehearsal-fixture.mjs";

function listen(host) {
  const server = createServer();
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host, port: 0, exclusive: true }, () => resolve(server));
  });
}

function close(server) { return new Promise(resolve => server.close(resolve)); }

test("a live site on a preferred port is preserved and the next available port is selected", async () => {
  const existing = await listen("127.0.0.1");
  try {
    const port = existing.address().port;
    assert.notEqual(await selectPort({ preferred: port }), port);
    assert.equal(existing.listening, true);
    assert.equal(existing.address().port, port);
  } finally { await close(existing); }
});

test("a listener on IPv6 also reserves its preferred port", async t => {
  let existing;
  try { existing = await listen("::1"); }
  catch (error) {
    if (["EAFNOSUPPORT", "EADDRNOTAVAIL", "EPROTONOSUPPORT"].includes(error.code)) return t.skip("IPv6 loopback unavailable");
    throw error;
  }
  try {
    const port = existing.address().port;
    assert.notEqual(await selectPort({ preferred: port }), port);
  } finally { await close(existing); }
});

test("proxy upstreams and explicitly configured listeners reserve offline ports", async () => {
  const root = await mkdtemp(join(tmpdir(), "novair-ports-"));
  const config = join(root, "active-site.conf");
  try {
    await writeFile(config, [
      "# proxy_pass http://127.0.0.1:3403;",
      "proxy_pass http://localhost:3400;",
      "ProxyPass / http://[::1]:3401/",
      "Listen 127.0.0.1:3402",
    ].join("\n"));
    const result = await proxyReservations([], [root]);
    assert.deepEqual([...result], [3400, 3401, 3402]);
    assert(!result.has(await selectPort({ preferred: 3400, reserved: result })));
    await assert.rejects(proxyReservations([join(root, "missing.conf")], []), { code: "ENOENT" });
  } finally {
    await unlink(config).catch(error => { if (error.code !== "ENOENT") throw error; });
    await rmdir(root);
  }
});

test("occupied or reserved ranges fail closed and unsupported ports are rejected", async () => {
  for (const value of ["80", "65536", "3400/tcp", "3400\n"]) assert.throws(() => parsePort(value), /TCP port/);
  const range = { preferred: 3400, first: 3400, last: 3401, reserved: new Set([3400, 3401]) };
  await assert.rejects(selectPort(range), /No free, unreserved backend port/);
});

test("schema-changing releases and incomplete or modified applied migrations are blocked", async () => {
  const schema = await schemaManifest(process.cwd());
  const rows = schema.migrations.map(([migration_name, checksum]) => ({
    migration_name, checksum, finished_at: new Date(), rolled_back_at: null,
  }));
  assert.doesNotThrow(() => requireSameSchema(schema, schema));
  assert.doesNotThrow(() => requireAppliedMigrations(schema, rows));
  assert.throws(() => requireSameSchema(schema, { ...schema, migrations: schema.migrations.slice(1) }), /schema-compatible/);
  assert.throws(() => requireSameSchema(schema, { ...schema, schema: "modified" }), /schema-compatible/);
  assert.throws(() => requireAppliedMigrations(schema, [{ ...rows[0], finished_at: null }, ...rows.slice(1)]), /history differs/);
  assert.throws(() => requireAppliedMigrations(schema, [{ ...rows[0], checksum: "modified" }, ...rows.slice(1)]), /history differs/);
});

test("an unhealthy replacement restores and verifies the previous NovAir unit before returning failure", async () => {
  const verified = [];
  let live = "old";
  await assert.rejects(activateRelease({
    oldUnit: "old", newUnit: "new",
    replaceUnit: async unit => { live = unit; },
    restartAndVerify: async () => {
      verified.push(live);
      if (live === "new") throw new Error("Readiness failed");
    },
    commit: async () => assert.fail("A failed release must never become the installed release"),
  }), /previous release was restored and verified/);
  assert.equal(live, "old");
  assert.deepEqual(verified, ["new", "old"]);
});

test("a failed rollback is explicit and an unhealthy release is never recorded as installed", async () => {
  const writes = [];
  await assert.rejects(activateRelease({
    oldUnit: "old", newUnit: "new", replaceUnit: async unit => { writes.push(unit); },
    restartAndVerify: async () => { throw new Error("Readiness failed"); },
    commit: async () => assert.fail("The installed release must not be changed"),
  }), /rollback could not be verified/);
  assert.deepEqual(writes, ["new", "old"]);
});

test("successful activation replaces the unit atomically and verifies it before recording the release", async () => {
  const root = await mkdtemp(join(tmpdir(), "novair-unit-"));
  const unit = join(root, "novair.service");
  try {
    await writeFile(unit, "old");
    const order = [];
    await activateRelease({
      oldUnit: "old", newUnit: "new", replaceUnit: value => replacePrivateFile(unit, value),
      restartAndVerify: async () => {
        assert.equal(await readFile(unit, "utf8"), "new");
        order.push("verified");
      },
      commit: async () => { order.push("recorded"); },
    });
    assert.deepEqual(order, ["verified", "recorded"]);
    assert.deepEqual(await readdir(root), ["novair.service"]);
  } finally {
    await unlink(unit).catch(error => { if (error.code !== "ENOENT") throw error; });
    await rmdir(root);
  }
});

test("builds reject missing or ineffective CPU and memory limits", () => {
  assert.doesNotThrow(() => checkBuildBudget("2147483648\n", "100000 100000\n"));
  assert.throws(() => checkBuildBudget("max", "100000 100000"), /enforced/);
  assert.throws(() => checkBuildBudget("2147483648", "max 100000"), /enforced/);
  assert.throws(() => checkBuildBudget("2147483648", "200000 100000"), /enforced/);
  assert.throws(() => checkBuildBudget("3221225472", "100000 100000"), /enforced/);
});

test("readiness requires NovAir's actual noindex homepage, not an otherwise successful error document", () => {
  const headers = new Headers({ "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex, nofollow" });
  const homepage = '<h1 id="hero-title">نوایر</h1>';
  assert.equal(isReadyHomepage(200, headers, homepage), true);
  assert.equal(isReadyHomepage(200, headers, "<title>نوایر</title><h1>خطا</h1>"), false);
  assert.equal(isReadyHomepage(200, headers, '<script>const hero = "id=\\"hero-title\\"";</script>'), false);
  assert.equal(isReadyHomepage(503, headers, homepage), false);
  assert.equal(isReadyHomepage(200, new Headers({ "Content-Type": "text/html" }), homepage), false);
});

test("the disposable fault fixture targets only the installed port and marks distinct releases", async () => {
  const home = await readFile("src/app/(public)/page.tsx", "utf8");
  const proxy = await readFile("src/proxy.ts", "utf8");
  assert.match(markHomepage(home, "updated"), /<h1 id="hero-title" data-novair-rehearsal="updated">/);
  assert.throws(() => markHomepage(home + home, "updated"), /uniquely/);
  const fault = failOnlyOnLivePort(proxy, 3401);
  assert.match(fault, /request\.nextUrl\.pathname === "\/"/);
  assert.match(fault, /process\.env\.PORT === "3401"/);
  assert(fault.includes(forcedFailure));
  assert.match(fault, /matcher: \["\/", "\/dashboard\/:path\*", "\/admin\/:path\*"\]/);
  assert.throws(() => failOnlyOnLivePort(proxy, "3401\n"), /TCP port/);
});

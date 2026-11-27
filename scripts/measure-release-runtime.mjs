import { PrismaClient } from '@prisma/client';
import { readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';
const fixture = JSON.parse(await readFile('.local-tools/auth-test-context.json', 'utf8'));
assert.equal(new URL(process.env.DATABASE_URL).pathname, '/' + fixture.name);
const db = new PrismaClient();
const origin = fixture.origin;
try {
  assert.equal((await db.siteSetting.findUnique({ where: { key: '__novair_auth_test' } })).value.nonce, fixture.nonce);
  const accounts = JSON.parse(await readFile('.local-tools/release-browser.json', 'utf8'));
  async function login(account) {
    const r = await fetch(origin + '/api/auth/sign-in/email', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(account) });
    assert.equal(r.status, 200);
    return r.headers.getSetCookie().map(c => c.split(';')[0]).filter(c => !c.endsWith('=')).join('; ');
  }
  const user = await login(accounts.customer);
  const admin = await login({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
  const measurements = [];
  for (const [path, cookie] of [['/', ''], ['/dashboard', user], ['/api/requests', user], ['/api/projects', user], ['/api/tickets', user], ['/admin', admin], ['/api/admin/content', admin]]) {
    const samples = [];
    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      const r = await fetch(origin + path, { headers: { origin, cookie }, cache: 'no-store', redirect: 'manual' });
      await r.arrayBuffer(); assert.equal(r.status, 200, path);
      if (cookie) assert.match(r.headers.get('cache-control'), /no-store/);
      samples.push(performance.now() - start);
    }
    samples.sort((a, b) => a - b);
    measurements.push({ path, samples: 10, p50Ms: +samples[4].toFixed(2), p95Ms: +samples[9].toFixed(2), minMs: +samples[0].toFixed(2) });
  }
  const database = await db.$queryRaw`SELECT VERSION() AS version, @@lower_case_table_names AS lowerCaseTables, @@transaction_isolation AS defaultIsolation, @@character_set_database AS charset, @@collation_database AS collation`;
  await writeFile('test-results/prompt10/runtime-measurements.json', JSON.stringify({ measuredAt: new Date().toISOString(), methodology: 'Warm sequential loopback full-response fetch, 10 samples/route, real isolated MySQL and maintained sessions; other processes may share CPU. Not a load or field benchmark.', database, measurements }, (_key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
  for (const row of measurements) console.log(`${row.path}: p50 ${row.p50Ms} ms; p95 ${row.p95Ms} ms (10 local samples)`);
} finally { await db.$disconnect(); }

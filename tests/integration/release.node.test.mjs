import { before, beforeEach, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { createAuthentication } from '../../src/server/auth/service.ts';
import { cleanupExpiredAuthentication } from '../../src/server/auth/maintenance.ts';

const fixture = JSON.parse(await readFile('.local-tools/auth-test-context.json', 'utf8'));
const origin = process.env.SITE_URL;
assert.equal(origin, fixture.origin);
assert.match(fixture.name, /^novair_auth_test_[a-f0-9]{12}$/);
assert.equal(new URL(process.env.DATABASE_URL).pathname, '/' + fixture.name);
const db = new PrismaClient();
const password = randomBytes(24).toString('hex');
let admin, customer, stranger;
const cookieOf = r => r.headers.getSetCookie().map(x => x.split(';')[0]).filter(x => !x.endsWith('=')).join('; ');
const call = (path, who, body, extra = {}) => fetch(origin + path, { redirect: 'manual', method: body === undefined ? 'GET' : 'POST', headers: { origin, cookie: who?.cookie ?? '', ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
async function checked(path, who, body, status = 200) {
  const r = await call(path, who, body);
  assert.equal(r.status, status, `${path}: ${await r.clone().text()}`);
  return r.json();
}
async function register() {
  const email = `release-${randomBytes(7).toString('hex')}@example.invalid`;
  const r = await call('/api/auth/sign-up/email', null, { name: 'مشتری آزمون نهایی', email, password, passwordConfirmation: password });
  assert.equal(r.status, 200);
  return { cookie: cookieOf(r), user: (await r.json()).user, email, password };
}
before(async () => {
  assert.equal((await db.siteSetting.findUnique({ where: { key: '__novair_auth_test' } })).value.nonce, fixture.nonce);
  await db.rateLimit.deleteMany();
  const r = await call('/api/auth/sign-in/email', null, { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
  assert.equal(r.status, 200);
  admin = { cookie: cookieOf(r), user: (await r.json()).user };
  customer = await register(); stranger = await register();
});
beforeEach(async () => { await db.rateLimit.deleteMany(); });
after(async () => { await db.$disconnect(); });

test('release: HTTP registration rejects malicious name controls without persistence or rate side effects', async () => {
  const count = await db.user.count();
  for (const name of ['مشتری\u202eADMIN', 'name\u0000text', 'name\ntext', 'name\u2066text', 'name\u009ftext']) {
    const r = await call('/api/auth/sign-up/email', null, { name, email: `invalid-${randomUUID()}@example.invalid`, password, passwordConfirmation: password });
    assert.equal(r.status, 400); assert.equal(r.headers.getSetCookie().length, 0);
    assert((await r.json()).fieldErrors.name.length);
  }
  assert.equal(await db.user.count(), count); assert.equal(await db.rateLimit.count(), 0);
});

test('release: oversized normalized project URL is a safe field error with no partial request/history', async () => {
  const count = await db.projectRequest.count(), history = await db.projectRequestStatusHistory.count();
  const body = { operationKey: randomUUID(), title: 'درخواست لینک فارسی', category: 'WEBSITE', description: 'توضیحات معتبر و کافی برای آزمون لینک پروژهٔ فارسی.', relevantUrl: 'https://example.com/' + 'ا'.repeat(300) };
  const r = await call('/api/requests', customer, body);
  assert.equal(r.status, 400); assert((await r.json()).fieldErrors.relevantUrl.length);
  assert.equal(await db.projectRequest.count(), count); assert.equal(await db.projectRequestStatusHistory.count(), history);
  const saved = await checked('/api/requests', customer, { ...body, relevantUrl: 'https://example.com/مسیر' }, 201);
  assert.equal((await db.projectRequest.findUnique({ where: { id: saved.id } })).relevantUrl, 'https://example.com/%D9%85%D8%B3%DB%8C%D8%B1');
});

test('release: real library emits host-only Secure HttpOnly SameSite cookies for HTTPS configuration', async () => {
  // Actual maintained library and MySQL; this tests cookie configuration, NOT a deployed TLS connection.
  const https = 'https://release.example.invalid';
  const service = createAuthentication(db, { baseURL: https, secret: process.env.BETTER_AUTH_SECRET });
  const request = new Request(https + '/api/auth/sign-in/email', { method: 'POST', headers: { origin: https, 'content-type': 'application/json' }, body: JSON.stringify({ email: customer.email, password }) });
  const r = await service.handle(request);
  assert.equal(r.status, 200);
  const cookie = r.headers.getSetCookie().find(x => /__Secure-novair\.session_token=/.test(x));
  assert(cookie); assert.match(cookie, /; Secure/i); assert.match(cookie, /; HttpOnly/i); assert.match(cookie, /; SameSite=Lax/i); assert.match(cookie, /; Path=\//i); assert(!/; Domain=/i.test(cookie));
  assert.equal((await service.principal(new Headers({ cookie: cookieOf(r) }))).user.id, customer.user.id);
  const bad = await service.handle(new Request(request.url, { method: 'POST', headers: { origin: 'https://attacker.example', 'content-type': 'application/json' }, body: '{}' }));
  assert.equal(bad.status, 403);
});

test('release: cleanup removes only expired ephemeral rows and preserves credentials/business/operation ledgers', async () => {
  const now = new Date(), expired = new Date(now.getTime() - 10000), future = new Date(now.getTime() + 86400000);
  const expiredSession = await db.session.create({ data: { token: randomBytes(24).toString('hex'), userId: customer.user.id, expiresAt: expired } });
  const activeSession = await db.session.create({ data: { token: randomBytes(24).toString('hex'), userId: customer.user.id, expiresAt: future } });
  const oldVerification = await db.verification.create({ data: { identifier: randomUUID(), value: randomBytes(20).toString('hex'), expiresAt: expired } });
  const keepVerification = await db.verification.create({ data: { identifier: randomUUID(), value: randomBytes(20).toString('hex'), expiresAt: future } });
  const oldKey = randomUUID(), keepKey = randomUUID();
  await db.rateLimit.createMany({ data: [{ key: oldKey, count: 1, windowStart: expired, expiresAt: expired }, { key: keepKey, count: 1, windowStart: now, expiresAt: future }] });
  const models = ['user', 'account', 'projectRequest', 'projectRequestStatusHistory', 'project', 'projectStatusHistory', 'adminOperation', 'ticket', 'ticketMessage', 'ticketOperation', 'contentOperation', 'contentAudit'];
  const before = await Promise.all(models.map(name => db[name].count()));
  const result = await cleanupExpiredAuthentication(db, now);
  assert(result.sessions >= 1 && result.verifications >= 1 && result.limits >= 1);
  assert.equal(await db.session.findUnique({ where: { id: expiredSession.id } }), null);
  assert(await db.session.findUnique({ where: { id: activeSession.id } }));
  assert.equal(await db.verification.findUnique({ where: { id: oldVerification.id } }), null);
  assert(await db.verification.findUnique({ where: { id: keepVerification.id } }));
  assert.equal(await db.rateLimit.findUnique({ where: { key: oldKey } }), null);
  assert(await db.rateLimit.findUnique({ where: { key: keepKey } }));
  assert.deepEqual(await Promise.all(models.map(name => db[name].count())), before);
});

test('release: full persisted customer/admin/request/project/support/publication lifecycle and second-customer isolation', async () => {
  const requestBody = { operationKey: randomUUID(), title: 'پروژهٔ چرخهٔ پذیرش نهایی', category: 'WEB_APP', description: 'یک سامانهٔ فارسی برای ثبت و پیگیری سفارش‌های استودیو می‌خواهم.' };
  const submitted = await checked('/api/requests', customer, requestBody, 201);
  assert((await checked('/api/requests', customer)).items.some(x => x.id === submitted.id));
  assert.equal((await call('/api/requests/' + submitted.id, stranger)).status, 404);
  for (const [expectedVersion, toStatus] of [[0, 'REVIEWING'], [1, 'ACCEPTED']]) await checked(`/api/admin/requests/${submitted.id}/review`, admin, { operationKey: randomUUID(), expectedVersion, toStatus });
  const conversion = { operationKey: randomUUID(), expectedVersion: 2 };
  const conversions = await Promise.all(Array.from({ length: 3 }, () => checked(`/api/admin/requests/${submitted.id}/convert`, admin, conversion)));
  const projectId = conversions[0].result.id;
  assert(conversions.every(x => x.result.id === projectId));
  assert.equal(await db.project.count({ where: { requestId: submitted.id } }), 1);
  assert.equal((await checked('/api/projects/' + projectId, customer)).project.originRequestId, submitted.id);
  assert.equal((await call('/api/projects/' + projectId, stranger)).status, 404);
  await checked(`/api/admin/projects/${projectId}/status`, admin, { operationKey: randomUUID(), expectedVersion: 0, toStatus: 'IN_PROGRESS' });
  assert.equal((await checked('/api/projects/' + projectId, customer)).project.status, 'IN_PROGRESS');
  const ticket = await checked('/api/tickets', customer, { operationKey: randomUUID(), subject: 'پیگیری پروژه در آزمون نهایی', category: 'PROJECT', projectId, body: 'دربارهٔ وضعیت فعلی این پروژه یک پرسش دارم.' }, 201);
  const ticketId = ticket.result.id;
  await checked(`/api/admin/tickets/${ticketId}/messages`, admin, { operationKey: randomUUID(), body: 'پاسخ پشتیبانی واقعی در پایگاه دادهٔ ایزوله ثبت شد.' });
  const canary = 'RELEASE-PRIVATE-' + randomUUID();
  await checked(`/api/admin/tickets/${ticketId}/notes`, admin, { operationKey: randomUUID(), body: canary });
  let detail = (await checked('/api/tickets/' + ticketId, customer)).ticket;
  assert.equal(detail.unread, true); assert.equal(detail.messages.length, 2);
  await checked(`/api/tickets/${ticketId}/read`, customer, { through: detail.readThrough });
  detail = (await checked('/api/tickets/' + ticketId, customer)).ticket; assert.equal(detail.unread, false);
  await checked(`/api/tickets/${ticketId}/status`, customer, { operationKey: randomUUID(), expectedVersion: detail.version, toStatus: 'CLOSED' });
  detail = (await checked('/api/tickets/' + ticketId, customer)).ticket;
  await checked(`/api/tickets/${ticketId}/status`, customer, { operationKey: randomUUID(), expectedVersion: detail.version, toStatus: 'WAITING_SUPPORT' });
  assert.equal((await call('/api/tickets/' + ticketId, stranger)).status, 404);
  for (const path of ['/api/tickets/' + ticketId, '/dashboard/tickets/' + ticketId, '/dashboard/projects/' + projectId]) {
    const r = await call(path, customer); assert.equal(r.status, 200); assert(!(await r.text()).includes(canary));
  }
  const question = 'پرسش چرخهٔ نهایی ' + randomUUID();
  const fields = { question, answer: 'پاسخ ویراستاری فقط برای آزمون واقعی انتشار در پایگاه ایزوله.', sortOrder: -9999, published: false };
  const created = await checked('/api/admin/content/faq', admin, { operationKey: randomUUID(), expectedVersion: 0, content: fields }, 201);
  assert(!(await (await call('/', null)).text()).includes(question));
  await checked('/api/admin/content/faq/' + created.result.id, admin, { operationKey: randomUUID(), expectedVersion: created.result.version, content: { ...fields, published: true } });
  assert((await (await call('/', null)).text()).includes(question));
  const editor = await checked('/api/admin/content/faq/' + created.result.id, admin);
  await checked('/api/admin/content/faq/' + created.result.id, admin, { operationKey: randomUUID(), expectedVersion: editor.record.version, content: fields });
  assert(!(await (await call('/', null)).text()).includes(question));
  // Retain only private, nonce-owned browser inputs; final cleanup removes this file.
  await writeFile('.local-tools/release-browser.json', JSON.stringify({ customer: { email: customer.email, password }, stranger: { email: stranger.email, password }, requestId: submitted.id, projectId, ticketId, canary }), { mode: 0o600 });
  for (const who of [customer, admin]) { await checked('/api/auth/sign-out', who, {}); assert.equal((await call('/api/requests', who)).status, 401); }
});

test('release: forged ingress headers cannot bypass exact Origin, no-store or unsupported account endpoints', async () => {
  const who = await register();
  for (const path of ['/api/requests', '/api/tickets', '/api/admin/content/faq', '/api/auth/change-password']) {
    const r = await call(path, who, {}, { origin: 'https://attacker.example', 'x-forwarded-host': new URL(origin).host, 'x-forwarded-proto': 'https', 'x-forwarded-for': '127.0.0.1' });
    assert.equal(r.status, 403); assert.match(r.headers.get('cache-control'), /no-store/);
  }
  for (const path of ['request-password-reset', 'reset-password', 'send-verification-email', 'update-user']) assert.equal((await call('/api/auth/' + path, who, {})).status, 404);
});

test('release: production client assets contain no configured database/auth secrets or public source maps', async () => {
  let checkedFiles = 0;
  const localEnvironment = await readFile('.env', 'utf8');
  const privateValues = ['BETTER_AUTH_SECRET', 'DATABASE_URL', 'MYSQL_ROOT_PASSWORD'].flatMap(key => {
    const line = localEnvironment.split(/\r?\n/).find(line => line.startsWith(key + '='));
    return [process.env[key], line?.slice(key.length + 1).replace(/^["']|["']$/g, '')].filter(value => value?.length > 15);
  });
  async function inspect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = directory + '/' + entry.name;
      if (entry.isDirectory()) await inspect(path);
      else {
        assert(!entry.name.endsWith('.map'), 'Do not publish production client source maps.');
        if (/\.(?:js|css)$/.test(entry.name)) {
          const data = await readFile(path, 'utf8');
          for (const value of privateValues) assert(!data.includes(value), 'Private environment value appeared in client assets.');
          checkedFiles++;
        }
      }
    }
  }
  await inspect('.next/static'); assert(checkedFiles > 5);
});

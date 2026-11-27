import { before, beforeEach, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { createAuthentication } from '../../src/server/auth/service.ts';
import { createCustomerProjectsService } from '../../src/server/projects/service.ts';
const fixture = JSON.parse(await readFile('.local-tools/auth-test-context.json', 'utf8'));
const origin = process.env.SITE_URL;
assert.equal(origin, fixture.origin);
assert.match(fixture.name, /^novair_auth_test_[a-f0-9]{12}$/);
assert.equal(new URL(process.env.DATABASE_URL).pathname, `/${fixture.name}`);
const db = new PrismaClient();
const password = randomBytes(20).toString('hex');
let admin, a, b;
const cookies = r => r.headers.getSetCookie().map(x => x.split(';')[0]).filter(x => !x.endsWith('=')).join('; ');
const call = (path, cookie = '', body, extra = {}) => fetch(origin + path, { redirect: 'manual', method: body === undefined ? 'GET' : 'POST', headers: { origin, cookie, ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
async function customerRead(path, cookie, extra = {}) {
    let response = await call(path, cookie, undefined, extra);
    if (extra.RSC && response.status === 307) {
        const target = new URL(response.headers.get('location'), origin);
        assert.equal(target.origin, origin);
        assert.equal(target.pathname, path);
        assert([...target.searchParams.keys()].every(key => key === '_rsc'));
        response = await call(target.pathname + target.search, cookie, undefined, extra);
    }
    assert.equal(response.status, 200, path);
    if (extra.RSC)
        assert.match(response.headers.get('content-type'), /text\/x-component/);
    return response;
}
async function user() { const email = `projects-${randomBytes(6).toString('hex')}@example.invalid`; const r = await call('/api/auth/sign-up/email', '', { name: 'مشتری واقعی آزمون پروژه', email, password, passwordConfirmation: password }); assert.equal(r.status, 200); return { cookie: cookies(r), user: (await r.json()).user, email }; }
async function login(email, pass = password) { const r = await call('/api/auth/sign-in/email', '', { email, password: pass }); assert.equal(r.status, 200); return { cookie: cookies(r), user: (await r.json()).user }; }
async function request(owner = a) { const r = await call('/api/requests', owner.cookie, { operationKey: randomUUID(), title: 'پروژهٔ واقعی پنل سفارش‌های کارگاه', category: 'DASHBOARD', description: 'یک پنل فارسی برای پیگیری سفارش‌ها و کارهای کارگاه نیاز دارم.' }); assert.equal(r.status, 201); return (await r.json()).id; }
async function make(owner = a) { const requestId = await request(owner); for (const [expectedVersion, toStatus] of [[0, 'REVIEWING'], [1, 'ACCEPTED']])
    assert.equal((await call(`/api/admin/requests/${requestId}/review`, admin.cookie, { operationKey: randomUUID(), expectedVersion, toStatus })).status, 200); const r = await call(`/api/admin/requests/${requestId}/convert`, admin.cookie, { operationKey: randomUUID(), expectedVersion: 2 }); assert.equal(r.status, 200); return { id: (await r.json()).result.id, requestId }; }
async function detail(id, owner = a) { const r = await call(`/api/projects/${id}`, owner.cookie); assert.equal(r.status, 200); return (await r.json()).project; }
before(async () => { assert.equal((await db.siteSetting.findUnique({ where: { key: '__novair_auth_test' } })).value.nonce, fixture.nonce); await db.rateLimit.deleteMany(); admin = await login(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD); a = await user(); b = await user(); });
beforeEach(async () => { await db.rateLimit.deleteMany(); });
after(async () => { await db.$disconnect(); });
test('all customer project reads reject anonymous/forged sessions and ADMIN roles', async () => {
    for (const path of ['/api/projects', '/api/projects/summary', `/api/projects/${randomUUID()}`]) {
        assert.equal((await call(path)).status, 401);
        assert.equal((await call(path, 'novair.session_token=forged')).status, 401);
        assert.equal((await call(path, admin.cookie)).status, 403);
    }
});
test('direct service boundaries independently require a legitimate current USER', async () => {
    const service = createCustomerProjectsService(db, createAuthentication(db, { baseURL: origin, secret: process.env.BETTER_AUTH_SECRET }));
    for (const headers of [new Headers(), new Headers({ cookie: admin.cookie })])
        for (const run of [() => service.list(headers), () => service.detail(headers, randomUUID()), () => service.overview(headers)])
            await assert.rejects(run, error => [401, 403].includes(error.status));
});
test('real conversion exposes only the explicit owned customer DTO and persisted dates', async () => {
    const item = await make();
    const row = await detail(item.id);
    assert.deepEqual(Object.keys(row).sort(), ['id', 'title', 'status', 'createdAt', 'updatedAt', 'plannedStart', 'targetCompletion', 'originRequestId', 'historyLimited', 'history'].sort());
    assert.equal(row.originRequestId, item.requestId);
    assert.equal(row.status, 'PLANNED');
    assert.equal(row.plannedStart, null);
    assert.equal(row.history.length, 1);
    assert.equal(row.history[0].fromStatus, null);
    assert.equal(row.history[0].toStatus, 'PLANNED');
    const actual = await db.project.findUnique({ where: { id: item.id } });
    assert.equal(row.createdAt, actual.createdAt.toISOString());
    assert.equal(row.updatedAt, actual.updatedAt.toISOString());
    assert.deepEqual(Object.keys(row.history[0]).sort(), ['id', 'fromStatus', 'toStatus', 'createdAt'].sort());
});
test('cross-customer IDs, missing IDs and malformed IDs have the same safe not-found contract', async () => {
    const item = await make();
    const responses = await Promise.all([call(`/api/projects/${item.id}`, b.cookie), call(`/api/projects/${randomUUID()}`, b.cookie), call('/api/projects/malformed', b.cookie)]);
    const bodies = await Promise.all(responses.map(async (r) => { assert.equal(r.status, 404); return r.json(); }));
    assert.deepEqual(bodies[0], bodies[1]);
    assert.deepEqual(bodies[1], bodies[2]);
});
test('status changes display genuine chronological history and terminal states without invented activity', async () => {
    const item = await make();
    for (const [expectedVersion, toStatus] of [[0, 'IN_PROGRESS'], [1, 'ON_HOLD'], [2, 'IN_PROGRESS'], [3, 'COMPLETED']])
        assert.equal((await call(`/api/admin/projects/${item.id}/status`, admin.cookie, { operationKey: randomUUID(), expectedVersion, toStatus })).status, 200);
    const data = await detail(item.id);
    assert.equal(data.status, 'COMPLETED');
    assert.deepEqual(data.history.map(e => e.toStatus), ['PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'IN_PROGRESS', 'COMPLETED']);
    assert.equal(data.history.length, await db.projectStatusHistory.count({ where: { projectId: item.id } }));
    assert(data.history.every((e, i) => !i || e.createdAt >= data.history[i - 1].createdAt));
});
test('cancelled and held projects retain accurate states and scheduled date-only values', async () => {
    const item = await make();
    const original = (await (await call(`/api/admin/projects/${item.id}`, admin.cookie)).json()).project;
    assert.equal((await call(`/api/admin/projects/${item.id}/update`, admin.cookie, { operationKey: randomUUID(), expectedVersion: 0, title: original.title, description: original.description, assigneeId: admin.user.id, plannedStart: '2027-01-03', targetCompletion: '2027-02-15' })).status, 200);
    assert.equal((await call(`/api/admin/projects/${item.id}/status`, admin.cookie, { operationKey: randomUUID(), expectedVersion: 1, toStatus: 'CANCELLED' })).status, 200);
    const data = await detail(item.id);
    assert.equal(data.status, 'CANCELLED');
    assert.equal(data.plannedStart, '2027-01-03');
    assert.equal(data.targetCompletion, '2027-02-15');
    assert.equal(data.history.length, 2);
    assert(!Object.hasOwn(data, 'assignee'));
});
test('private description/note/history-note/audit/operation/assignee canaries never cross any customer serialization boundary', async () => {
    const item = await make();
    const canaries = Array.from({ length: 6 }, () => `PRIVATE-${randomUUID()}`);
    await db.project.update({ where: { id: item.id }, data: { description: canaries[0], assigneeId: admin.user.id } });
    await db.adminNote.create({ data: { projectId: item.id, authorId: admin.user.id, body: canaries[1] } });
    await db.projectStatusHistory.updateMany({ where: { projectId: item.id }, data: { note: canaries[2] } });
    await db.projectAuditEvent.create({ data: { projectId: item.id, actorId: admin.user.id, changes: { description: { from: canaries[3], to: canaries[0] } } } });
    await db.adminOperation.create({ data: { actorId: admin.user.id, operationKey: randomUUID(), kind: 'private-fixture', targetId: item.id, payloadHash: 'a'.repeat(64), result: { private: canaries[4] } } });
    const original = await db.user.findUnique({ where: { id: admin.user.id } });
    await db.user.update({ where: { id: admin.user.id }, data: { email: `${canaries[5]}@example.invalid` } });
    try {
        for (const [path, extra] of [['/api/projects', {}], [`/api/projects/${item.id}`, {}], ['/api/projects/summary', {}], [`/dashboard/projects/${item.id}`, {}], [`/dashboard/projects/${item.id}`, { RSC: '1' }], ['/dashboard/projects', {}], ['/dashboard', {}], [`/dashboard/requests/${item.requestId}`, { RSC: '1' }]]) {
            const r = await customerRead(path, a.cookie, extra);
            const text = await r.text();
            assert(text.includes(path.includes('/requests/') ? item.requestId : item.id));
            for (const secret of canaries)
                assert(!text.includes(secret), `${path} leaked private value`);
            for (const field of ['adminNotes', 'auditEvents', 'payloadHash', 'assigneeId'])
                assert(!text.includes(field));
        }
    }
    finally {
        await db.user.update({ where: { id: admin.user.id }, data: { email: original.email } });
    }
});
test('owned request resolves an owned managed project reference and accepted-but-unconverted stays distinct', async () => {
    const item = await make();
    const req = (await (await call(`/api/requests/${item.requestId}`, a.cookie)).json()).request;
    assert.equal(req.managedProjectId, item.id);
    assert.equal(req.projectCreated, true);
    const waiting = await request();
    for (const [expectedVersion, toStatus] of [[0, 'REVIEWING'], [1, 'ACCEPTED']])
        await call(`/api/admin/requests/${waiting}/review`, admin.cookie, { operationKey: randomUUID(), expectedVersion, toStatus });
    const data = (await (await call(`/api/requests/${waiting}`, a.cookie)).json()).request;
    assert.equal(data.status, 'ACCEPTED');
    assert.equal(data.managedProjectId, null);
    assert.equal(data.projectCreated, false);
});
test('inconsistent legacy origin ownership cannot create either direction of a cross-account link', async () => {
    const item = await make();
    await db.project.update({ where: { id: item.id }, data: { ownerId: b.user.id } });
    const p = await detail(item.id, b);
    assert.equal(p.originRequestId, null);
    const req = (await (await call(`/api/requests/${item.requestId}`, a.cookie)).json()).request;
    assert.equal(req.managedProjectId, null);
    assert.equal(req.projectCreated, false);
    assert.equal((await call(`/api/projects/${item.id}`, a.cookie)).status, 404);
});
test('customer project APIs do not expose any write or management subroute', async () => {
    const item = await make();
    const before = await db.project.findUnique({ where: { id: item.id } });
    for (const method of ['POST', 'PATCH', 'PUT', 'DELETE'])
        for (const path of ['/api/projects', `/api/projects/${item.id}`, '/api/projects/summary']) {
            const r = await fetch(origin + path, { method, headers: { origin, cookie: a.cookie, 'content-type': 'application/json' }, body: JSON.stringify({ status: 'COMPLETED', ownerId: b.user.id }) });
            assert.equal(r.status, 405);
            assert.match(r.headers.get('cache-control'), /no-store/);
        }
    assert.equal((await call(`/api/projects/${item.id}/status`, a.cookie, { status: 'COMPLETED' })).status, 404);
    assert.deepEqual(await db.project.findUnique({ where: { id: item.id } }), before);
});
test('pagination/filtering remain owner-scoped, bounded, deterministic and recent-first', async () => {
    const owner = await user();
    for (let i = 0; i < 12; i++) {
        await db.rateLimit.deleteMany();
        await make(owner);
    }
    const first = (await (await call('/api/projects', owner.cookie)).json());
    const second = (await (await call('/api/projects?page=2', owner.cookie)).json());
    assert.equal(first.total, 12);
    assert.equal(first.items.length, 10);
    assert.equal(second.items.length, 2);
    assert.equal(new Set([...first.items, ...second.items].map(i => i.id)).size, 12);
    const repeat = await (await call('/api/projects', owner.cookie)).json();
    assert.deepEqual(first, repeat);
    assert(first.items.every((e, i) => !i || e.updatedAt <= first.items[i - 1].updatedAt));
    const filtered = await (await call('/api/projects?status=COMPLETED', owner.cookie)).json();
    assert.equal(filtered.total, 0);
    const active = await (await call('/api/projects?active=true', owner.cookie)).json();
    assert.equal(active.total, 12);
});
test('strict queries reject ownership/protected/repeated/invalid filters and unsafe origins', async () => {
    for (const suffix of ['?ownerId=other', '?status=ACCEPTED', '?page=0', '?page=1001', '?page=1&page=2', '?active=invalid', '?include=adminNotes'])
        assert.equal((await call('/api/projects' + suffix, a.cookie)).status, 400);
    assert.equal((await call('/api/projects/summary?ownerId=other', a.cookie)).status, 400);
    assert.equal((await call(`/api/projects/${randomUUID()}?include=notes`, a.cookie)).status, 400);
    assert.equal((await call('/api/projects', a.cookie, undefined, { origin: 'https://example.invalid' })).status, 403);
    assert.equal((await call('/api/projects', a.cookie, undefined, { 'sec-fetch-site': 'cross-site' })).status, 403);
});
test('dashboard totals and recent records reflect only persisted owned data', async () => {
    const overview = (await (await call('/api/projects/summary', a.cookie)).json()).overview;
    assert.equal(overview.requests.total, await db.projectRequest.count({ where: { ownerId: a.user.id } }));
    assert.equal(overview.requests.awaitingReview, await db.projectRequest.count({ where: { ownerId: a.user.id, status: { in: ['NEW', 'REVIEWING'] } } }));
    assert.equal(overview.requests.accepted, await db.projectRequest.count({ where: { ownerId: a.user.id, status: 'ACCEPTED' } }));
    assert.equal(overview.projects.total, await db.project.count({ where: { ownerId: a.user.id } }));
    assert.equal(overview.projects.active, await db.project.count({ where: { ownerId: a.user.id, status: { in: ['PLANNED', 'IN_PROGRESS', 'ON_HOLD'] } } }));
    assert.equal(overview.projects.completed, await db.project.count({ where: { ownerId: a.user.id, status: 'COMPLETED' } }));
    assert(overview.projects.recent.length <= 3);
    assert(overview.requests.recent.length <= 3);
});
test('missing legacy history is not fabricated and long history is accurately bounded/disclosed', async () => {
    const legacy = await db.project.create({ data: { ownerId: a.user.id, title: 'پروژهٔ قدیمی بدون تاریخچه', description: 'INTERNAL legacy description', status: 'ON_HOLD' } });
    let data = await detail(legacy.id);
    assert.equal(data.history.length, 0);
    assert.equal(data.status, 'ON_HOLD');
    const html = await (await call(`/dashboard/projects/${legacy.id}`, a.cookie)).text();
    assert(html.includes('هنوز تاریخچه‌ای ثبت نشده'));
    assert(!html.includes('INTERNAL legacy description'));
    await db.projectStatusHistory.createMany({ data: Array.from({ length: 105 }, (_, i) => ({ projectId: legacy.id, actorId: admin.user.id, fromStatus: i % 2 ? 'ON_HOLD' : 'IN_PROGRESS', toStatus: i % 2 ? 'IN_PROGRESS' : 'ON_HOLD', createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)) })) });
    data = await detail(legacy.id);
    assert.equal(data.history.length, 100);
    assert.equal(data.historyLimited, true);
    assert.equal(data.history[0].createdAt, new Date(Date.UTC(2026, 0, 1, 0, 0, 5)).toISOString());
});
test('expired/revoked/disabled USER sessions and immediate role changes fail closed', async () => {
    const owner = await user();
    await db.user.update({ where: { id: owner.user.id }, data: { disabledAt: new Date() } });
    assert.equal((await call('/api/projects', owner.cookie)).status, 401);
    await db.user.update({ where: { id: owner.user.id }, data: { disabledAt: null, role: 'ADMIN' } });
    assert.equal((await call('/api/projects/summary', owner.cookie)).status, 403);
    await db.user.update({ where: { id: owner.user.id }, data: { role: 'USER' } });
    await db.session.updateMany({ where: { userId: owner.user.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    assert.equal((await call('/api/projects', owner.cookie)).status, 401);
    const current = await login(owner.email);
    await db.session.deleteMany({ where: { userId: owner.user.id } });
    assert.equal((await call('/api/projects', current.cookie)).status, 401);
});
test('real database read failure is sanitized and restoring storage permits a fresh read', async () => {
    await db.$executeRawUnsafe('RENAME TABLE Project TO Project_customer_read_failure');
    try {
        for (const path of ['/api/projects', '/api/projects/summary']) {
            const r = await call(path, a.cookie);
            assert.equal(r.status, 503);
            assert(!/Prisma|SELECT|database|stack/i.test(await r.text()));
        }
    }
    finally {
        await db.$executeRawUnsafe('RENAME TABLE Project_customer_read_failure TO Project');
    }
    assert.equal((await call('/api/projects', a.cookie)).status, 200);
});
test('long persisted Persian titles render as escaped text with private no-store headers', async () => {
    const item = await make();
    const title = 'عنوان <img src=x onerror=alert(1)> ' + 'پروژهٔ فارسی '.repeat(7);
    await db.project.update({ where: { id: item.id }, data: { title } });
    const r = await call(`/api/projects/${item.id}`, a.cookie);
    assert.match(r.headers.get('cache-control'), /no-store/);
    assert.equal((await r.json()).project.title, title);
    const html = await (await call(`/dashboard/projects/${item.id}`, a.cookie)).text();
    assert(html.includes('&lt;img'));
    assert(!html.includes('<img src=x'));
    assert(!html.includes('درصد تکمیل'));
});

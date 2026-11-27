import { before, beforeEach, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { bootstrapAdministrator } from '../../src/server/auth/bootstrap.ts';
import { createAuthentication } from '../../src/server/auth/service.ts';
import { createManagementService } from '../../src/server/management/service.ts';
const ctx = JSON.parse(await readFile('.local-tools/auth-test-context.json', 'utf8'));
const origin = process.env.SITE_URL;
assert.equal(origin, ctx.origin);
assert(/^novair_auth_test_[a-f0-9]{12}$/.test(ctx.name));
assert.equal(new URL(process.env.DATABASE_URL).pathname, `/${ctx.name}`);
const db = new PrismaClient();
const password = randomBytes(20).toString('hex');
const prefix = randomBytes(5).toString('hex');
let admin, other, customer, stranger;
const cookies = r => r.headers.getSetCookie().map(x => x.split(';')[0]).filter(x => !x.endsWith('=')).join('; ');
const call = (path, cookie = '', body, extra = {}) => fetch(origin + path, { method: body === undefined ? 'GET' : 'POST', redirect: 'manual', headers: { origin, cookie, ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
async function login(email, pass = password) { const r = await call('/api/auth/sign-in/email', '', { email, password: pass }); assert.equal(r.status, 200); return { cookie: cookies(r), user: (await r.json()).user, email, password: pass }; }
async function user() { const email = `mgmt-${randomBytes(7).toString('hex')}@example.invalid`; const r = await call('/api/auth/sign-up/email', '', { email, password, passwordConfirmation: password, name: `مشتری ${prefix}` }); assert.equal(r.status, 200); return { cookie: cookies(r), user: (await r.json()).user, email, password }; }
async function request(owner = customer) { const r = await call('/api/requests', owner.cookie, { operationKey: randomUUID(), title: `درخواست ${prefix} ${randomBytes(3).toString('hex')}`, category: 'WEB_APP', description: 'یک برنامهٔ وب فارسی برای مدیریت سفارش‌ها و اطلاعات مشتریان می‌خواهم.', relevantUrl: 'https://example.com/reference' }); assert.equal(r.status, 201); return (await r.json()).id; }
async function detail(id, actor = admin) { const r = await call(`/api/admin/requests/${id}`, actor.cookie); assert.equal(r.status, 200); return (await r.json()).request; }
async function project(id, actor = admin) { const r = await call(`/api/admin/projects/${id}`, actor.cookie); assert.equal(r.status, 200); return (await r.json()).project; }
const change = (id, body, actor = admin) => call(`/api/admin/requests/${id}/review`, actor.cookie, { operationKey: randomUUID(), ...body });
async function accept(id) { assert.equal((await change(id, { expectedVersion: 0, toStatus: 'REVIEWING' })).status, 200); assert.equal((await change(id, { expectedVersion: 1, toStatus: 'ACCEPTED' })).status, 200); }
async function convert(id, actor = admin) { const d = await detail(id, actor); const r = await call(`/api/admin/requests/${id}/convert`, actor.cookie, { operationKey: randomUUID(), expectedVersion: d.reviewVersion }); assert.equal(r.status, 200); return (await r.json()).result.id; }
const updateBody = (row, extra = {}) => ({ operationKey: randomUUID(), expectedVersion: row.version, title: row.title, description: row.description, assigneeId: row.assignee?.id ?? null, plannedStart: row.plannedStart, targetCompletion: row.targetCompletion, ...extra });
async function rejectInserts(table, run) {
    assert(['ProjectRequestStatusHistory', 'ProjectStatusHistory', 'ProjectAuditEvent', 'AdminNote', 'AdminOperation'].includes(table));
    const ids = await db.$queryRawUnsafe(`SELECT id FROM \`${table}\``);
    for (const row of ids)
        assert.match(row.id, /^[a-zA-Z0-9-]{20,36}$/);
    const condition = ids.length ? `id IN (${ids.map(x => `'${x.id}'`).join(',')})` : 'id <> id';
    await db.$executeRawUnsafe(`ALTER TABLE \`${table}\` ADD CONSTRAINT management_test_failure CHECK (${condition})`);
    try {
        await run();
    }
    finally {
        await db.$executeRawUnsafe(`ALTER TABLE \`${table}\` DROP CHECK management_test_failure`);
    }
}
before(async () => { assert.equal((await db.siteSetting.findUnique({ where: { key: '__novair_auth_test' } })).value.nonce, ctx.nonce); await db.rateLimit.deleteMany(); admin = await login(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD); const email = `colleague-${prefix}@example.invalid`; await bootstrapAdministrator(db, { email, name: 'مدیر همکار آزمون', password }); other = await login(email); customer = await user(); stranger = await user(); });
beforeEach(async () => { await db.rateLimit.deleteMany(); });
after(async () => { await db.$disconnect(); });
test('all administrative data and valid mutation paths deny anonymous, forged and USER sessions', async () => {
    const id = randomUUID();
    for (const [cookie, status] of [['', 401], ['novair.session_token=forged; role=ADMIN', 401], [customer.cookie, 403]]) {
        for (const path of ['/api/admin/requests', '/api/admin/projects', '/api/admin/summary', `/api/admin/requests/${id}`, `/api/admin/projects/${id}`, `/api/admin/operations/${randomUUID()}`])
            assert.equal((await call(path, cookie)).status, status);
        for (const path of [`requests/${id}/review`, `requests/${id}/convert`, `requests/${id}/notes`, `projects/${id}/status`, `projects/${id}/update`, `projects/${id}/notes`])
            assert.equal((await call('/api/admin/' + path, cookie, {})).status, status);
    }
});
test('real request list supports bounded filters/search/customer identity and direct admin service authorization', async () => {
    const id = await request();
    const row = await detail(id);
    const response = await call(`/api/admin/requests?q=${prefix}&status=NEW`, admin.cookie);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert(data.items.some(x => x.id === id && x.owner.name === customer.user.name));
    assert(data.items.length <= 10);
    for (const q of ['ownerId=x', 'page=-1', 'page=1001', 'status=PLANNED', 'page=1&page=2', 'q=' + encodeURIComponent('x'.repeat(101))])
        assert.equal((await call('/api/admin/requests?' + q, admin.cookie)).status, 400);
    const service = createManagementService(db, createAuthentication(db, { baseURL: origin, secret: process.env.BETTER_AUTH_SECRET }), process.env.BETTER_AUTH_SECRET);
    await assert.rejects(service.requestDetail(new Headers({ cookie: customer.cookie }), id), e => e.status === 403);
    assert.equal(row.owner.email, customer.email);
});
test('NEW to REVIEWING persists one attributed event/version without changing customer submission/idempotency', async () => {
    const id = await request();
    const before = await db.projectRequest.findUnique({ where: { id } });
    const r = await change(id, { expectedVersion: 0, toStatus: 'REVIEWING' });
    assert.equal(r.status, 200);
    const after = await db.projectRequest.findUnique({ where: { id } });
    assert.equal(after.status, 'REVIEWING');
    assert.equal(after.reviewVersion, 1);
    for (const field of ['ownerId', 'title', 'description', 'category', 'budgetPreference', 'timelinePreference', 'relevantUrl', 'submissionKey', 'submissionHash'])
        assert.equal(after[field], before[field]);
    const events = await db.projectRequestStatusHistory.findMany({ where: { requestId: id }, orderBy: { createdAt: 'asc' } });
    assert.equal(events.length, 2);
    assert.equal(events[1].actorId, admin.user.id);
    assert.equal(events[1].fromStatus, 'NEW');
    assert.equal(events[1].toStatus, 'REVIEWING');
});
test('direct acceptance and reopening terminal request states are rejected', async () => {
    const id = await request();
    assert.equal((await change(id, { expectedVersion: 0, toStatus: 'ACCEPTED' })).status, 409);
    assert.equal((await change(id, { expectedVersion: 0, toStatus: 'DECLINED', publicExplanation: 'محدودهٔ این درخواست با ظرفیت فعلی تیم هماهنگ نیست.' })).status, 200);
    assert.equal((await change(id, { expectedVersion: 1, toStatus: 'REVIEWING' })).status, 409);
    assert.equal(await db.projectRequestStatusHistory.count({ where: { requestId: id } }), 2);
});
test('acceptance remains distinct from conversion and customers see the genuine accepted state', async () => {
    const id = await request();
    await accept(id);
    assert.equal(await db.project.count({ where: { requestId: id } }), 0);
    const response = await call(`/api/requests/${id}`, customer.cookie);
    const data = (await response.json()).request;
    assert.equal(data.status, 'ACCEPTED');
    assert.equal(data.projectCreated, false);
    assert.deepEqual(data.history.map(x => x.toStatus), ['NEW', 'REVIEWING', 'ACCEPTED']);
    const html = await (await call(`/dashboard/requests/${id}`, customer.cookie)).text();
    assert(html.includes('پروژهٔ اجرایی هنوز ساخته نشده'));
});
test('decline explanation is public while optional private note never enters customer JSON, HTML, RSC or public landing', async () => {
    const id = await request();
    const privateText = `PRIVATE-${randomUUID()}`;
    const explanation = 'این درخواست در محدودهٔ خدمات فعلی قرار نمی‌گیرد؛ می‌توانید نیاز دیگری را جداگانه ثبت کنید.';
    const r = await change(id, { expectedVersion: 0, toStatus: 'DECLINED', publicExplanation: explanation, privateNote: privateText });
    assert.equal(r.status, 200);
    const d = await detail(id);
    assert.equal(d.notes[0].body, privateText);
    assert.equal(d.notes[0].author.id, admin.user.id);
    assert.equal(d.history.at(-1).publicExplanation, explanation);
    for (const [path, cookie, headers] of [[`/api/requests/${id}`, customer.cookie, {}], [`/dashboard/requests/${id}`, customer.cookie, {}], [`/dashboard/requests/${id}`, customer.cookie, { RSC: '1' }], ['/', customer.cookie, {}], ['/api/requests', customer.cookie, {}]]) {
        const response = await call(path, cookie, undefined, headers);
        const body = await response.text();
        assert(!body.includes(privateText));
        assert(!body.includes('adminNotes'));
        assert(!body.includes('payloadHash'));
    }
    const publicData = (await (await call(`/api/requests/${id}`, customer.cookie)).json()).request;
    assert.equal(publicData.decisionExplanation, explanation);
    assert(!JSON.stringify(publicData).includes('actorId'));
    assert.equal((await call(`/api/requests/${id}`, stranger.cookie)).status, 404);
});
test('decision replay is durable even after later changes, and conflicting key reuse is rejected', async () => {
    const id = await request();
    const body = { operationKey: randomUUID(), expectedVersion: 0, toStatus: 'REVIEWING' };
    assert.equal((await call(`/api/admin/requests/${id}/review`, admin.cookie, body)).status, 200);
    await change(id, { expectedVersion: 1, toStatus: 'ACCEPTED' });
    const repeat = await call(`/api/admin/requests/${id}/review`, admin.cookie, body);
    assert.equal(repeat.status, 200);
    assert.equal((await repeat.json()).replayed, true);
    assert.equal(await db.projectRequestStatusHistory.count({ where: { requestId: id } }), 3);
    assert.equal((await call(`/api/admin/requests/${id}/review`, admin.cookie, { ...body, toStatus: 'DECLINED', publicExplanation: 'دلیل دیگر برای رد درخواست مشتری ثبت شده است.' })).status, 409);
    const recovery = await call(`/api/admin/operations/${body.operationKey}`, admin.cookie);
    assert.equal(recovery.status, 200);
    assert.equal((await call(`/api/admin/operations/${body.operationKey}`, other.cookie)).status, 404);
});
test('two administrators making concurrent decisions produce one winner and one stale conflict', async () => {
    const id = await request();
    const responses = await Promise.all([change(id, { expectedVersion: 0, toStatus: 'REVIEWING' }, admin), change(id, { expectedVersion: 0, toStatus: 'DECLINED', publicExplanation: 'این درخواست با امکانات کنونی تیم قابل اجرا نیست.' }, other)]);
    assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
    assert.equal(await db.projectRequestStatusHistory.count({ where: { requestId: id } }), 2);
    assert.equal((await detail(id)).reviewVersion, 1);
});
test('request status/history transaction rolls back on a real history write failure', async () => {
    const id = await request();
    const body = { operationKey: randomUUID(), expectedVersion: 0, toStatus: 'REVIEWING' };
    await rejectInserts('ProjectRequestStatusHistory', async () => { const r = await call(`/api/admin/requests/${id}/review`, admin.cookie, body); assert.equal(r.status, 503); assert(!/Prisma|constraint|SQL/.test(await r.text())); });
    assert.equal((await detail(id)).status, 'NEW');
    assert.equal((await detail(id)).reviewVersion, 0);
    assert.equal(await db.adminOperation.count({ where: { actorId: admin.user.id, operationKey: body.operationKey } }), 0);
    assert.equal((await call(`/api/admin/requests/${id}/review`, admin.cookie, body)).status, 200);
});
test('private-note failure rolls back decline/history/explanation atomically', async () => {
    const id = await request();
    await rejectInserts('AdminNote', async () => { assert.equal((await change(id, { expectedVersion: 0, toStatus: 'DECLINED', publicExplanation: 'نیاز به ابزار دیگری برای اجرای این درخواست وجود دارد.', privateNote: 'دلیل داخلی و خصوصی این تصمیم' })).status, 503); });
    const row = await detail(id);
    assert.equal(row.status, 'NEW');
    assert.equal(row.history.length, 1);
    assert.equal(row.notes.length, 0);
});
test('only accepted requests convert and repeated conversion preserves ownership/original data', async () => {
    const id = await request();
    assert.equal((await call(`/api/admin/requests/${id}/convert`, admin.cookie, { operationKey: randomUUID(), expectedVersion: 0 })).status, 409);
    await accept(id);
    const before = await db.projectRequest.findUnique({ where: { id } });
    const pid = await convert(id);
    const row = await project(pid);
    assert.equal(row.owner.id, customer.user.id);
    assert.equal(row.status, 'PLANNED');
    assert.equal(row.requestId, id);
    assert.equal(row.history.length, 1);
    assert.equal(row.history[0].actor.id, admin.user.id);
    assert.equal(row.history[0].fromStatus, null);
    const again = await call(`/api/admin/requests/${id}/convert`, other.cookie, { operationKey: randomUUID(), expectedVersion: 2 });
    assert.equal(again.status, 200);
    assert.equal((await again.json()).result.id, pid);
    assert.equal(await db.project.count({ where: { requestId: id } }), 1);
    const after = await db.projectRequest.findUnique({ where: { id } });
    for (const field of ['ownerId', 'title', 'description', 'submissionKey', 'submissionHash', 'category', 'status'])
        assert.equal(after[field], before[field]);
    assert.equal(after.status, 'ACCEPTED');
    const owned = (await (await call(`/api/requests/${id}`, customer.cookie)).json()).request;
    assert.equal(owned.projectCreated, true);
    assert(!Object.hasOwn(owned, 'project'));
    assert(!Object.hasOwn(owned, 'projectId'));
});
test('concurrent conversions by different administrators create exactly one project and initial event', async () => {
    const id = await request();
    await accept(id);
    const responses = await Promise.all([admin, other].map(actor => call(`/api/admin/requests/${id}/convert`, actor.cookie, { operationKey: randomUUID(), expectedVersion: 2 })));
    assert(responses.every(r => r.status === 200));
    const results = await Promise.all(responses.map(r => r.json()));
    assert.equal(results[0].result.id, results[1].result.id);
    assert.equal(await db.projectStatusHistory.count({ where: { projectId: results[0].result.id } }), 1);
});
test('failed project history creation leaves accepted request intact and permits exact retry', async () => {
    const id = await request();
    await accept(id);
    const body = { operationKey: randomUUID(), expectedVersion: 2 };
    await rejectInserts('ProjectStatusHistory', async () => { assert.equal((await call(`/api/admin/requests/${id}/convert`, admin.cookie, body)).status, 503); });
    assert.equal(await db.project.count({ where: { requestId: id } }), 0);
    assert.equal((await detail(id)).reviewVersion, 2);
    assert.equal((await detail(id)).status, 'ACCEPTED');
    assert.equal((await call(`/api/admin/requests/${id}/convert`, admin.cookie, body)).status, 200);
});
test('database unique origin constraint and private-note single-target/FK constraints are genuine', async () => {
    const id = await request();
    await accept(id);
    const pid = await convert(id);
    await assert.rejects(db.project.create({ data: { requestId: id, ownerId: customer.user.id, title: 'تکراری', description: 'این نباید ایجاد شود' } }));
    await assert.rejects(db.adminNote.create({ data: { authorId: admin.user.id, body: 'بدون هدف' } }));
    await assert.rejects(db.adminNote.create({ data: { requestId: id, projectId: pid, authorId: admin.user.id, body: 'دو هدف' } }));
    await assert.rejects(db.adminNote.create({ data: { requestId: randomUUID(), authorId: admin.user.id, body: 'بدون درخواست موجود' } }));
});
test('project execution states enforce the documented lifecycle and terminal policy', async () => {
    const id = await request();
    await accept(id);
    const pid = await convert(id);
    assert.equal((await call(`/api/admin/projects/${pid}/status`, admin.cookie, { operationKey: randomUUID(), expectedVersion: 0, toStatus: 'COMPLETED' })).status, 409);
    for (const [expectedVersion, toStatus] of [[0, 'IN_PROGRESS'], [1, 'ON_HOLD'], [2, 'IN_PROGRESS'], [3, 'COMPLETED']])
        assert.equal((await call(`/api/admin/projects/${pid}/status`, admin.cookie, { operationKey: randomUUID(), expectedVersion, toStatus })).status, 200);
    assert.equal((await call(`/api/admin/projects/${pid}/status`, admin.cookie, { operationKey: randomUUID(), expectedVersion: 4, toStatus: 'IN_PROGRESS' })).status, 409);
    const row = await project(pid);
    assert.deepEqual(row.history.map(e => e.toStatus), ['PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'IN_PROGRESS', 'COMPLETED']);
    assert.equal(row.version, 4);
});
test('concurrent project changes cannot overwrite a newer committed version', async () => {
    const id = await request();
    await accept(id);
    const pid = await convert(id);
    const rows = await Promise.all([admin, other].map(actor => call(`/api/admin/projects/${pid}/status`, actor.cookie, { operationKey: randomUUID(), expectedVersion: 0, toStatus: 'IN_PROGRESS' })));
    assert.deepEqual(rows.map(r => r.status).sort(), [200, 409]);
    assert.equal((await project(pid)).version, 1);
    assert.equal(await db.projectStatusHistory.count({ where: { projectId: pid } }), 2);
});
test('assignment, title and scheduling use existing eligible ADMIN and generate an attributed audit', async () => {
    const id = await request();
    await accept(id);
    const pid = await convert(id);
    const original = await project(pid);
    const body = updateBody(original, { assigneeId: other.user.id, plannedStart: '2027-01-10', targetCompletion: '2027-02-10', title: 'عنوان تازهٔ پروژه' });
    assert.equal((await call(`/api/admin/projects/${pid}/update`, admin.cookie, body)).status, 200);
    const row = await project(pid);
    assert.equal(row.assignee.id, other.user.id);
    assert.equal(row.plannedStart, '2027-01-10');
    assert.equal(row.audit.length, 1);
    assert.equal(row.audit[0].actor.id, admin.user.id);
    assert.equal(row.history.length, 1);
    assert.equal((await db.projectRequest.findUnique({ where: { id } })).title, original.title);
    assert.equal((await call(`/api/admin/projects/${pid}/update`, admin.cookie, body)).status, 200);
    assert.equal((await project(pid)).audit.length, 1);
    await db.user.update({ where: { id: other.user.id }, data: { disabledAt: new Date() } });
    try {
        assert.equal((await call(`/api/admin/projects/${pid}/update`, admin.cookie, body)).status, 200);
    }
    finally {
        await db.user.update({ where: { id: other.user.id }, data: { disabledAt: null } });
    }
});
test('invalid/disabled/non-admin assignees, impossible dates and owner/mass assignment are rejected', async () => {
    const id = await request();
    await accept(id);
    const pid = await convert(id);
    const row = await project(pid);
    for (const extra of [{ assigneeId: customer.user.id }, { assigneeId: randomUUID() }, { plannedStart: '2027-02-30' }, { plannedStart: '2027-05-10', targetCompletion: '2027-01-01' }, { ownerId: admin.user.id }, { status: 'COMPLETED' }, { requestId: randomUUID() }])
        assert.equal((await call(`/api/admin/projects/${pid}/update`, admin.cookie, updateBody(row, extra))).status, 400);
    await db.user.update({ where: { id: other.user.id }, data: { disabledAt: new Date() } });
    try {
        assert.equal((await call(`/api/admin/projects/${pid}/update`, admin.cookie, updateBody(row, { assigneeId: other.user.id }))).status, 400);
    }
    finally {
        await db.user.update({ where: { id: other.user.id }, data: { disabledAt: null } });
    }
    assert.equal((await project(pid)).version, 0);
});
test('metadata no-op produces no invented audit or status history; stale edits conflict', async () => {
    const id = await request();
    await accept(id);
    const pid = await convert(id);
    const row = await project(pid);
    const r = await call(`/api/admin/projects/${pid}/update`, admin.cookie, updateBody(row));
    assert.equal((await r.json()).result.noChange, true);
    assert.equal((await project(pid)).audit.length, 0);
    await call(`/api/admin/projects/${pid}/update`, other.cookie, updateBody(row, { title: 'تغییر توسط مدیر دوم' }));
    assert.equal((await call(`/api/admin/projects/${pid}/update`, admin.cookie, updateBody(row, { title: 'عنوان قدیمی از صفحهٔ مانده' }))).status, 409);
});
test('project audit insertion failure rolls back assignment/scheduling/version and operation result', async () => {
    const id = await request();
    await accept(id);
    const pid = await convert(id);
    const row = await project(pid);
    const body = updateBody(row, { assigneeId: other.user.id, plannedStart: '2027-03-01' });
    await rejectInserts('ProjectAuditEvent', async () => { assert.equal((await call(`/api/admin/projects/${pid}/update`, admin.cookie, body)).status, 503); });
    const after = await project(pid);
    assert.equal(after.assignee, null);
    assert.equal(after.plannedStart, null);
    assert.equal(after.version, 0);
    assert.equal((await call(`/api/admin/projects/${pid}/update`, admin.cookie, body)).status, 200);
});
test('private notes append across administrators and exact retry does not duplicate', async () => {
    const id = await request();
    const key = randomUUID();
    const body = { operationKey: key, body: 'یادداشت خصوصی و قابل اعتماد برای بررسی نیاز مشتری' };
    const responses = await Promise.all([admin, other].map(actor => call(`/api/admin/requests/${id}/notes`, actor.cookie, body)));
    assert(responses.every(r => r.status === 200));
    assert.equal((await detail(id)).notes.length, 2);
    assert.equal((await call(`/api/admin/requests/${id}/notes`, admin.cookie, body)).status, 200);
    assert.equal((await detail(id)).notes.length, 2);
    assert.equal((await call(`/api/admin/requests/${id}/notes`, admin.cookie, { ...body, body: 'متن متفاوت برای همان شناسه' })).status, 409);
    await accept(id);
    const pid = await convert(id);
    const projectSecret = `PROJECT-PRIVATE-${randomUUID()} <script>alert(1)</script>`;
    assert.equal((await call(`/api/admin/projects/${pid}/notes`, admin.cookie, { operationKey: randomUUID(), body: projectSecret })).status, 200);
    assert.equal((await project(pid)).notes.length, 1);
    for (const [path, extra] of [[`/api/requests/${id}`, {}], [`/dashboard/requests/${id}`, {}], [`/dashboard/requests/${id}`, { RSC: '1' }]])
        assert(!(await (await call(path, customer.cookie, undefined, extra)).text()).includes(projectSecret));
});
test('expired/revoked/disabled administrators and changed roles fail immediately', async () => {
    const email = `temp-admin-${randomBytes(5).toString('hex')}@example.invalid`;
    await bootstrapAdministrator(db, { email, name: 'مدیر موقت آزمون', password });
    let actor = await login(email);
    await db.user.update({ where: { id: actor.user.id }, data: { disabledAt: new Date() } });
    assert.equal((await call('/api/admin/requests', actor.cookie)).status, 401);
    await db.user.update({ where: { id: actor.user.id }, data: { disabledAt: null, role: 'USER' } });
    assert.equal((await call('/api/admin/projects', actor.cookie)).status, 403);
    await db.user.update({ where: { id: actor.user.id }, data: { role: 'ADMIN' } });
    await db.session.updateMany({ where: { userId: actor.user.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    assert.equal((await call('/api/admin/summary', actor.cookie)).status, 401);
    actor = await login(email);
    await db.session.deleteMany({ where: { userId: actor.user.id } });
    assert.equal((await call('/api/admin/projects', actor.cookie)).status, 401);
});
test('CSRF, strict bodies/parameters and size limits protect real administrative writes', async () => {
    const id = await request();
    const body = { operationKey: randomUUID(), expectedVersion: 0, toStatus: 'REVIEWING' };
    for (const extra of [{ origin: '' }, { origin: 'https://example.invalid' }, { 'sec-fetch-site': 'cross-site' }])
        assert.equal((await call(`/api/admin/requests/${id}/review`, admin.cookie, body, extra)).status, 403);
    for (const extra of [{ actorId: other.user.id }, { ownerId: customer.user.id }, { expectedVersion: -1 }])
        assert.equal((await call(`/api/admin/requests/${id}/review`, admin.cookie, { ...body, ...extra })).status, 400);
    const huge = await fetch(`${origin}/api/admin/requests/${id}/notes`, { method: 'POST', headers: { origin, cookie: admin.cookie, 'content-type': 'application/json' }, body: 'x'.repeat(33000) });
    assert.equal(huge.status, 413);
    assert.equal((await call(`/api/admin/requests/${id}?ownerId=x`, admin.cookie)).status, 400);
    assert.equal((await detail(id)).status, 'NEW');
    assert.equal((await call(`/api/admin/requests/${id}/toString`, admin.cookie, body)).status, 404);
});
test('atomic MySQL admin rate limits enforce concurrent new operations and allow committed recovery', async () => {
    // This policy is fixed-window: a legitimate burst spanning two windows has two budgets.
    // Start the concurrent assertion away from the boundary without changing the server clock/policy.
    const remaining = 60000 - Date.now() % 60000;
    if (remaining < 20000)
        await new Promise(resolve => setTimeout(resolve, remaining + 100));
    const id = await request();
    const bodies = Array.from({ length: 35 }, (_, i) => ({ operationKey: randomUUID(), body: `یادداشت واقعی آزمون محدودسازی شماره ${i}` }));
    const responses = await Promise.all(bodies.map(body => call(`/api/admin/requests/${id}/notes`, admin.cookie, body, { 'x-forwarded-for': randomUUID() })));
    assert.equal(responses.filter(r => r.status === 200).length, 30);
    assert.equal(responses.filter(r => r.status === 429).length, 5);
    const first = responses.findIndex(r => r.status === 200);
    assert.equal((await call(`/api/admin/requests/${id}/notes`, admin.cookie, bodies[first])).status, 200);
    assert.equal((await call(`/api/admin/operations/${bodies[first].operationKey}`, admin.cookie)).status, 200);
    assert.equal((await detail(id)).notes.length, 30);
});
test('unavailable limiter fails closed and previously committed admin operations remain recoverable', async () => {
    const id = await request();
    const body = { operationKey: randomUUID(), body: 'یادداشت ثبت‌شده پیش از قطع شمارنده' };
    assert.equal((await call(`/api/admin/requests/${id}/notes`, admin.cookie, body)).status, 200);
    await db.$executeRawUnsafe('RENAME TABLE RateLimit TO RateLimit_management_failure');
    try {
        assert.equal((await call(`/api/admin/requests/${id}/notes`, admin.cookie, { operationKey: randomUUID(), body: 'نباید ثبت شود' })).status, 503);
        assert.equal((await call(`/api/admin/requests/${id}/notes`, admin.cookie, body)).status, 200);
    }
    finally {
        await db.$executeRawUnsafe('RENAME TABLE RateLimit_management_failure TO RateLimit');
    }
    assert.equal((await detail(id)).notes.length, 1);
});
test('real operational summaries and project pagination/filtering match persisted records only', async () => {
    const id = await request();
    await accept(id);
    const pid = await convert(id);
    const filtered = await call('/api/admin/projects?status=PLANNED&q=' + prefix, admin.cookie);
    assert.equal(filtered.status, 200);
    const data = await filtered.json();
    assert(data.items.some(row => row.id === pid));
    assert(data.items.length <= 10);
    const summary = await (await call('/api/admin/summary', admin.cookie)).json();
    assert.equal(summary.newRequests, await db.projectRequest.count({ where: { status: 'NEW' } }));
    assert.equal(summary.awaitingConversion, await db.projectRequest.count({ where: { status: 'ACCEPTED', project: null } }));
    assert.equal(summary.activeProjects, await db.project.count({ where: { status: { in: ['PLANNED', 'IN_PROGRESS', 'ON_HOLD'] } } }));
    assert(summary.recentProjects.length <= 3);
    assert.match(filtered.headers.get('cache-control'), /no-store/);
    assert.equal((await call('/api/admin/projects?status=ACCEPTED', admin.cookie)).status, 400);
});
test('durable operation insertion failure rolls back the whole decision and exact retry remains safe', async () => {
    const id = await request();
    const body = { operationKey: randomUUID(), expectedVersion: 0, toStatus: 'REVIEWING' };
    await rejectInserts('AdminOperation', async () => { assert.equal((await call(`/api/admin/requests/${id}/review`, admin.cookie, body)).status, 503); });
    const row = await detail(id);
    assert.equal(row.status, 'NEW');
    assert.equal(row.reviewVersion, 0);
    assert.equal(row.history.length, 1);
    assert.equal((await call(`/api/admin/requests/${id}/review`, admin.cookie, body)).status, 200);
    assert.equal((await detail(id)).history.length, 2);
});
test('cancelled project is terminal while its private append-only notes remain available', async () => {
    const id = await request();
    await accept(id);
    const pid = await convert(id);
    const row = await project(pid);
    assert.equal((await call(`/api/admin/projects/${pid}/status`, admin.cookie, { operationKey: randomUUID(), expectedVersion: 0, toStatus: 'CANCELLED' })).status, 200);
    assert.equal((await call(`/api/admin/projects/${pid}/status`, admin.cookie, { operationKey: randomUUID(), expectedVersion: 1, toStatus: 'IN_PROGRESS' })).status, 409);
    assert.equal((await call(`/api/admin/projects/${pid}/update`, admin.cookie, updateBody({ ...row, version: 1 }, { title: 'تغییر نباید ثبت شود' }))).status, 409);
    assert.equal((await call(`/api/admin/projects/${pid}/notes`, admin.cookie, { operationKey: randomUUID(), body: 'یادداشت واقعی پس از بستن پروژه' })).status, 200);
    const final = await project(pid);
    assert.deepEqual(final.history.map(e => e.toStatus), ['PLANNED', 'CANCELLED']);
    assert.equal(final.notes.length, 1);
    assert.equal(final.audit.length, 0);
});
test('admin request/project pagination is bounded, deterministic, disjoint and accurately filtered', async () => {
    for (const resource of ['requests', 'projects']) {
        const a = await (await call(`/api/admin/${resource}?page=1`, admin.cookie)).json();
        const b = await (await call(`/api/admin/${resource}?page=2`, admin.cookie)).json();
        assert(a.total > 10);
        assert.equal(a.items.length, 10);
        assert(b.items.length > 0);
        assert.equal(b.total, a.total);
        assert.equal(new Set([...a.items, ...b.items].map(x => x.id)).size, a.items.length + b.items.length);
        const again = await (await call(`/api/admin/${resource}?page=1`, admin.cookie)).json();
        assert.deepEqual(again.items.map(x => x.id), a.items.map(x => x.id));
    }
    const active = await (await call('/api/admin/projects?active=true', admin.cookie)).json();
    assert.equal(active.total, await db.project.count({ where: { status: { in: ['PLANNED', 'IN_PROGRESS', 'ON_HOLD'] } } }));
    assert(active.items.every(x => ['PLANNED', 'IN_PROGRESS', 'ON_HOLD'].includes(x.status)));
});

import { before, beforeEach, after, test } from 'node:test';
import { readFile, mkdir } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { expect } from '@playwright/test';
import { openBrowser } from '../shared/open-browser.mjs';
import { auditPage } from '../shared/accessibility.ts';
const fixture = JSON.parse(await readFile('.local-tools/auth-test-context.json', 'utf8'));
const origin = process.env.NOVAIR_TEST_ORIGIN;
if (origin !== 'http://127.0.0.1:3100' || new URL(process.env.DATABASE_URL).pathname !== `/${fixture.name}` || !/^novair_auth_test_[a-f0-9]{12}$/.test(fixture.name))
    throw Error('Owned customer-project fixture required.');
const db = new PrismaClient();
let browser, axeCount = 0, adminId;
const output = `${process.env.NOVAIR_TEST_OUTPUT || 'test-results/prompt07'}/customer-projects`;
const values = () => ({ name: 'مشتری پروژهٔ نوایر', email: `customer-project-ui-${randomBytes(6).toString('hex')}@example.invalid`, password: randomBytes(20).toString('hex') });
before(async () => {
    expect((await db.siteSetting.findUnique({ where: { key: '__novair_auth_test' } })).value.nonce).toBe(fixture.nonce);
    browser = await openBrowser();
    await mkdir(output, { recursive: true });
    adminId = (await db.user.findUnique({ where: { email: process.env.ADMIN_EMAIL } })).id;
    console.log(`Customer project workflows in isolated MySQL/Chromium ${browser.version()}.`);
});
beforeEach(async () => { await db.rateLimit.deleteMany(); });
after(async () => { console.log(`Completed ${axeCount} customer-project axe configurations.`); await browser?.close(); await db.$disconnect(); });
function scenario(name, run) { test(name, async () => { const context = await browser.newContext({ baseURL: origin, reducedMotion: 'reduce' }); const admin = await browser.newContext({ baseURL: origin, reducedMotion: 'reduce' }); try {
    const r = await admin.request.post('/api/auth/sign-in/email', { headers: { origin }, data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD } });
    expect(r.status()).toBe(200);
    await run({ context, admin, page: await context.newPage() });
}
finally {
    await context.close();
    await admin.close();
} }); }
async function user(context) { const identity = values(); const r = await context.request.post('/api/auth/sign-up/email', { headers: { origin }, data: { ...identity, passwordConfirmation: identity.password } }); expect(r.status()).toBe(200); return { ...identity, user: (await r.json()).user }; }
const body = () => ({ operationKey: randomUUID(), title: 'سامانهٔ فارسی سفارش‌های کارگاه و پیگیری اجرای پروژه', category: 'DASHBOARD', description: 'برای ثبت سفارش و پیگیری کارهای کارگاه یک پنل فارسی و خوانا نیاز دارم.' });
async function submit(context) { const payload = body(); const r = await context.request.post('/api/requests', { headers: { origin }, data: payload }); expect(r.status()).toBe(201); return { id: (await r.json()).id, payload }; }
async function accept(admin, id) { for (const [expectedVersion, toStatus] of [[0, 'REVIEWING'], [1, 'ACCEPTED']])
    expect((await admin.request.post(`/api/admin/requests/${id}/review`, { headers: { origin }, data: { operationKey: randomUUID(), expectedVersion, toStatus } })).status()).toBe(200); }
async function make(context, admin) { const request = await submit(context); await accept(admin, request.id); const r = await admin.request.post(`/api/admin/requests/${request.id}/convert`, { headers: { origin }, data: { operationKey: randomUUID(), expectedVersion: 2 } }); expect(r.status()).toBe(200); return { id: (await r.json()).result.id, requestId: request.id, payload: request.payload }; }
async function status(admin, id, toStatus) { const current = (await (await admin.request.get(`/api/admin/projects/${id}`)).json()).project; expect((await admin.request.post(`/api/admin/projects/${id}/status`, { headers: { origin }, data: { operationKey: randomUUID(), expectedVersion: current.version, toStatus } })).status()).toBe(200); }
async function manage(page, action) { const loaded = page.waitForEvent('domcontentloaded'); await page.locator(`#management-${action} button[type="submit"]`).click(); await page.getByRole('dialog').getByRole('button', { name: 'تأیید و ثبت', exact: true }).click(); await loaded; await expect(page.locator('.management-result')).toBeVisible(); }
async function audit(page) { expect((await auditPage(page)).violations).toEqual([]); axeCount++; }
scenario('real browser registration/login/submission, ADMIN decisions/conversion and customer execution tracking work end to end', async ({ context, admin, page }) => {
    const identity = values();
    await page.goto('/register?next=%2Fdashboard%2Frequests%2Fnew');
    for (const key of ['name', 'email', 'password'])
        await page.locator(`input[name="${key}"]`).fill(identity[key]);
    await page.locator('input[name="passwordConfirmation"]').fill(identity.password);
    await page.getByRole('button', { name: 'ساخت حساب', exact: true }).click();
    await expect(page.locator('input[name="title"]')).toBeEnabled();
    const payload = body();
    await page.locator('input[name="title"]').fill(payload.title);
    await page.locator('select[name="category"]').selectOption(payload.category);
    await page.locator('textarea[name="description"]').fill(payload.description);
    await page.getByRole('button', { name: 'ثبت درخواست', exact: true }).click();
    await expect(page.getByTestId('request-confirmation')).toBeVisible();
    const requestId = await page.locator('.request-identifier').textContent();
    await page.locator('.account-menu summary').click();
    await page.getByRole('button', { name: 'خروج از حساب', exact: true }).click();
    await expect(page).toHaveURL(/\/login\?notice=signed-out$/);
    await page.goto(`/login?next=${encodeURIComponent(`/dashboard/requests/${requestId}`)}`);
    await page.locator('input[name="email"]').fill(identity.email);
    await page.locator('input[name="password"]').fill(identity.password);
    await page.getByRole('button', { name: 'ورود به حساب', exact: true }).click();
    await expect(page.locator('h1')).toContainText(payload.title);
    const ap = await admin.newPage();
    await ap.goto(`/admin/requests/${requestId}`);
    await manage(ap, 'review');
    await ap.locator('#management-review select').selectOption('ACCEPTED');
    await manage(ap, 'review');
    await page.reload();
    await expect(page.locator('main')).toContainText('پروژهٔ اجرایی هنوز ساخته نشده');
    await expect(page.getByRole('link', { name: 'پیگیری پروژهٔ اجرایی', exact: true })).toHaveCount(0);
    await manage(ap, 'convert');
    const id = new URL(ap.url()).pathname.split('/').at(-1);
    await page.reload();
    await page.getByRole('link', { name: 'پیگیری پروژهٔ اجرایی', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/projects/${id}$`));
    await expect(page.locator('.customer-project-history li')).toHaveCount(1);
    await expect(page.locator('.customer-project-status')).toContainText('برنامه‌ریزی‌شده');
    await page.reload();
    await expect(page.locator('.customer-project-history li')).toHaveCount(1);
    await ap.locator('#management-project-status select').selectOption('IN_PROGRESS');
    await manage(ap, 'project-status');
    await page.reload();
    await expect(page.locator('.customer-project-status')).toContainText('در حال انجام');
    await expect(page.locator('.customer-project-history li')).toHaveCount(2);
    await page.getByRole('link', { name: 'مشاهدهٔ درخواست اولیه و شرح نیاز تو', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/requests/${requestId}$`));
    await page.getByRole('navigation', { name: 'ناوبری ناحیهٔ کاربری' }).getByRole('link', { name: 'پیشخوان', exact: true }).click();
    await expect(page.locator('.customer-project-recent')).toContainText(payload.title);
    await expect(page.locator('.customer-metrics')).toContainText('۱');
    expect((await context.request.get(`/api/projects/${id}`)).status()).toBe(200);
    await audit(page);
});
scenario('customer list filters/pages correctly while navigation identifies active project routes', async ({ context, admin, page }) => {
    await user(context);
    for (let i = 0; i < 12; i++) {
        await db.rateLimit.deleteMany();
        await make(context, admin);
    }
    await page.goto('/dashboard/projects');
    await expect(page.locator('.customer-project-item')).toHaveCount(10);
    await expect(page.getByRole('navigation', { name: 'ناوبری ناحیهٔ کاربری' }).getByRole('link', { name: 'پروژه‌ها', exact: true })).toHaveAttribute('aria-current', 'page');
    await page.getByRole('link', { name: 'صفحهٔ بعد', exact: true }).click();
    await expect(page.locator('.customer-project-item')).toHaveCount(2);
    await page.locator('select[name="status"]').selectOption('COMPLETED');
    await page.getByRole('button', { name: 'اعمال فیلتر', exact: true }).click();
    await expect(page.locator('.customer-project-empty')).toContainText('پیدا نشد');
    await page.getByRole('link', { name: 'همهٔ پروژه‌ها', exact: true }).click();
    await page.getByRole('link', { name: /^وضعیت و مسیر پروژهٔ/ }).first().click();
    await expect(page.getByRole('navigation', { name: 'ناوبری ناحیهٔ کاربری' }).getByRole('link', { name: 'پروژه‌ها', exact: true })).toHaveAttribute('aria-current', 'page');
});
scenario('private fixture canaries never appear in customer DOM, RSC, serialized HTML or APIs', async ({ context, admin, page }) => {
    await user(context);
    const item = await make(context, admin);
    const secrets = Array.from({ length: 5 }, () => `PRIVATE-BROWSER-${randomUUID()}`);
    await db.project.update({ where: { id: item.id }, data: { description: secrets[0], assigneeId: adminId } });
    await db.adminNote.create({ data: { projectId: item.id, authorId: adminId, body: secrets[1] } });
    await db.projectAuditEvent.create({ data: { projectId: item.id, actorId: adminId, changes: { internal: secrets[2] } } });
    await db.adminOperation.create({ data: { actorId: adminId, operationKey: randomUUID(), kind: 'privacy-fixture', targetId: item.id, payloadHash: 'a'.repeat(64), result: { internal: secrets[3] } } });
    await db.projectStatusHistory.updateMany({ where: { projectId: item.id }, data: { note: secrets[4] } });
    for (const path of [`/dashboard/projects/${item.id}`, '/dashboard/projects', '/dashboard', `/dashboard/requests/${item.requestId}`]) {
        await page.goto(path);
        const html = await page.content();
        for (const secret of [...secrets, process.env.ADMIN_EMAIL])
            expect(html).not.toContain(secret);
        const rsc = await context.request.get(path, { headers: { RSC: '1' } });
        for (const secret of secrets)
            expect(await rsc.text()).not.toContain(secret);
    }
    for (const path of ['/api/projects', `/api/projects/${item.id}`, '/api/projects/summary']) {
        const r = await context.request.get(path);
        expect(r.status()).toBe(200);
        for (const secret of [...secrets, process.env.ADMIN_EMAIL])
            expect(await r.text()).not.toContain(secret);
    }
    await page.goto(`/dashboard/projects/${item.id}`);
    await audit(page);
});
scenario('session expiration, safe login return, logout and browser back cannot restore private project access', async ({ context, admin, page }) => {
    const owner = await user(context);
    const item = await make(context, admin);
    await page.goto(`/dashboard/projects/${item.id}`);
    await db.session.updateMany({ where: { userId: owner.user.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await page.reload();
    await expect(page).toHaveURL(new RegExp(`/login\\?next=`));
    await page.locator('input[name="email"]').fill(owner.email);
    await page.locator('input[name="password"]').fill(owner.password);
    await page.getByRole('button', { name: 'ورود به حساب', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/projects/${item.id}$`));
    await page.locator('.account-menu summary').click();
    await page.getByRole('button', { name: 'خروج از حساب', exact: true }).click();
    await expect(page).toHaveURL(/\/login\?notice=signed-out$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/login/);
    expect((await context.request.get(`/api/projects/${item.id}`)).status()).toBe(401);
});
scenario('cross-account and forged browser navigation reveal no project or originating request', async ({ context, admin, page }) => {
    const owner = await user(context);
    const item = await make(context, admin);
    await context.request.post('/api/auth/sign-out', { headers: { origin }, data: {} });
    await user(context);
    expect((await context.request.get(`/api/projects/${item.id}`)).status()).toBe(404);
    await page.goto(`/dashboard/projects/${item.id}`);
    expect(await page.locator('body').textContent()).not.toContain(owner.email);
    expect(await page.content()).not.toContain(item.requestId);
    await context.clearCookies();
    await context.addCookies([{ name: 'novair.session_token', value: 'forged', url: origin }]);
    await page.goto('/dashboard/projects');
    await expect(page).toHaveURL(/\/login\?next=/);
});
scenario('real storage failure and interrupted navigation recover through genuine fresh reads', async ({ context, admin, page }) => {
    await user(context);
    const item = await make(context, admin);
    await page.goto('/dashboard/projects');
    await db.$executeRawUnsafe('RENAME TABLE Project TO Project_customer_browser_failure');
    try {
        await page.goto('/dashboard/projects');
        await expect(page.locator('main')).toContainText('دریافت اطلاعات ممکن نشد');
        expect(await page.locator('main').textContent()).not.toContain('Prisma');
        await audit(page);
        await page.screenshot({ path: `${output}/light-project-read-error.png`, fullPage: true });
    }
    finally {
        await db.$executeRawUnsafe('RENAME TABLE Project_customer_browser_failure TO Project');
    }
    await page.getByRole('button', { name: 'تلاش دوباره', exact: true }).click();
    await expect(page.locator('.customer-project-item')).toHaveCount(1);
    await page.goto('/dashboard/projects?status=ACCEPTED');
    await expect(page.locator('h1')).toContainText('فیلتر پروژه معتبر نیست');
    await page.getByRole('link', { name: 'بازگشت به همهٔ پروژه‌ها', exact: true }).click();
    await expect(page.locator('.customer-project-item')).toHaveCount(1);
    await page.route(`**/dashboard/projects/${item.id}`, route => route.abort('internetdisconnected'));
    let interrupted = false;
    try {
        await page.goto(`/dashboard/projects/${item.id}`);
    }
    catch {
        interrupted = true;
    }
    expect(interrupted).toBe(true);
    await page.unroute(`**/dashboard/projects/${item.id}`);
    await page.goto(`/dashboard/projects/${item.id}`);
    await expect(page.locator('.customer-project-history li')).toHaveCount(1);
});
scenario('legacy history and completed/cancelled states stay honest and contain no artificial activity', async ({ context, admin, page }) => {
    const owner = await user(context);
    const legacy = await db.project.create({ data: { ownerId: owner.user.id, title: 'پروژهٔ قدیمی بدون رویداد آغاز', description: 'این شرح داخلی نباید در صفحه مشتری باشد', status: 'ON_HOLD' } });
    await page.goto(`/dashboard/projects/${legacy.id}`);
    await expect(page.locator('.customer-project-history')).toContainText('هنوز تاریخچه‌ای ثبت نشده');
    await expect(page.locator('.customer-project-history li')).toHaveCount(0);
    expect(await page.content()).not.toContain('این شرح داخلی نباید');
    for (const state of ['COMPLETED', 'CANCELLED']) {
        const item = await make(context, admin);
        if (state === 'COMPLETED')
            await status(admin, item.id, 'IN_PROGRESS');
        await status(admin, item.id, state);
        await page.goto(`/dashboard/projects/${item.id}`);
        await expect(page.locator('.customer-project-status')).toContainText(state === 'COMPLETED' ? 'تکمیل‌شده' : 'لغوشده');
        await expect(page.locator('.customer-project-history li')).toHaveCount(state === 'COMPLETED' ? 3 : 2);
        expect(await page.locator('main').textContent()).not.toMatch(/\d+\s*[%٪]/);
    }
});
scenario('empty dashboard, keyboard project/account navigation and saved theme remain functional', async ({ context, page }) => {
    const owner = await user(context);
    await page.setViewportSize({ width: 375, height: 950 });
    await page.goto('/dashboard');
    await expect(page.locator('.customer-metric strong')).toHaveText(['۰', '۰', '۰', '۰', '۰', '۰']);
    await expect(page.locator('.customer-project-empty')).toContainText('پذیرش درخواست به‌تنهایی پروژه نمی‌سازد');
    const nav = page.getByRole('navigation', { name: 'ناوبری ناحیهٔ کاربری' });
    await nav.getByRole('link', { name: 'پروژه‌ها', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/dashboard\/projects$/);
    await page.getByRole('button', { name: 'پوستهٔ تیره', exact: true }).click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await nav.getByRole('link', { name: 'حساب و امنیت', exact: true }).click();
    await expect(page.locator('main')).toContainText(owner.email);
    await expect(page.locator('main')).toContainText('تأییدنشده');
    await expect(page.locator('main')).toContainText('بازیابی رمز از طریق ایمیل هنوز فعال نیست');
    await page.getByRole('button', { name: 'نمایش رمز عبور فعلی', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('input[name="currentPassword"]')).toHaveAttribute('type', 'text');
    await audit(page);
});
for (const theme of ['light', 'dark'])
    scenario(`all customer project states at seven widths, RTL, 200% text and axe in ${theme}`, async ({ context, admin, page }) => {
        const owner = await user(context);
        await page.addInitScript(value => localStorage.setItem('novair-theme', value), theme);
        const emptyViews = [['empty-projects', '/dashboard/projects', '.customer-project-empty'], ['empty-dashboard', '/dashboard', '.customer-metrics']];
        async function inspect(views) { for (const [name, path, selector] of views)
            for (const width of [320, 375, 430, 768, 1024, 1440, 1920]) {
                await page.setViewportSize({ width, height: 1000 });
                await page.goto(path);
                await page.locator(selector).first().waitFor();
                await page.evaluate(() => document.fonts.ready);
                await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
                await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
                if ([375, 1440].includes(width)) {
                    await audit(page);
                    await page.screenshot({ path: `${output}/${theme}-${name}-${width}.png`, fullPage: true });
                }
                await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
                if (width === 375) {
                    await page.locator('main').evaluate(el => el.scrollIntoView({ block: 'start' }));
                    await page.screenshot({ path: `${output}/${theme}-${name}-text200.png` });
                }
                await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
            } }
        await inspect(emptyViews);
        const active = await make(context, admin);
        await status(admin, active.id, 'IN_PROGRESS');
        const current = (await (await admin.request.get(`/api/admin/projects/${active.id}`)).json()).project;
        expect((await admin.request.post(`/api/admin/projects/${active.id}/update`, { headers: { origin }, data: { operationKey: randomUUID(), expectedVersion: current.version, title: 'سامانهٔ فارسی مدیریت سفارش‌ها و پیگیری کارهای کارگاه برای خوانایی عنوان‌های بلند در صفحه‌های کوچک', description: 'شرح داخلی پروژه که انتخاب آن برای مشتری مجاز نیست.', assigneeId: adminId, plannedStart: '2027-01-10', targetCompletion: '2027-03-12' } })).status()).toBe(200);
        const completed = await make(context, admin);
        await status(admin, completed.id, 'IN_PROGRESS');
        await status(admin, completed.id, 'COMPLETED');
        const cancelled = await make(context, admin);
        await status(admin, cancelled.id, 'CANCELLED');
        const waiting = await submit(context);
        await accept(admin, waiting.id);
        const legacy = await db.project.create({ data: { ownerId: owner.user.id, title: 'پروژهٔ قدیمی بدون تاریخچهٔ قابل ارائه', description: 'شرح داخلی قدیمی', status: 'PLANNED' } });
        await inspect([['dashboard', '/dashboard', '.customer-project-recent'], ['projects', '/dashboard/projects', '.customer-project-item'], ['project', `/dashboard/projects/${active.id}`, '.customer-project-history'], ['request', `/dashboard/requests/${active.requestId}`, '.request-timeline'], ['profile', '/dashboard/profile', 'input[name="currentPassword"]'], ['waiting', `/dashboard/requests/${waiting.id}`, '.request-timeline'], ['completed', `/dashboard/projects/${completed.id}`, '.customer-project-history'], ['cancelled', `/dashboard/projects/${cancelled.id}`, '.customer-project-history'], ['legacy', `/dashboard/projects/${legacy.id}`, '.customer-project-history'], ['filtered', '/dashboard/projects?status=ON_HOLD', '.customer-project-empty']]);
    });

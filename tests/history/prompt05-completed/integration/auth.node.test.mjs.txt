import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { createAuthentication } from "../../src/server/auth/service.ts";
import { bootstrapAdministrator } from "../../src/server/auth/bootstrap.ts";
import { verifyPassword } from "../../src/server/auth/password.ts";

const origin = process.env.SITE_URL;
const context = JSON.parse(await readFile(".local-tools/auth-test-context.json", "utf8"));
assert.equal(origin, context.origin);
assert(/^novair_auth_test_[a-f0-9]{12}$/.test(context.name));
assert.equal(new URL(process.env.DATABASE_URL).pathname, `/${context.name}`);
const db = new PrismaClient();
const prefix = randomBytes(5).toString("hex");
const password = `Correct-${randomBytes(15).toString("hex")}`;
let sequence = 0;
const email = () => `auth-${prefix}-${++sequence}@example.invalid`;
const cookies = (response) => response.headers.getSetCookie().map((value) => value.split(";")[0]).filter((value) => !value.endsWith("=")).join("; ");
const call = (path, data, cookie = "", extra = {}) => fetch(`${origin}${path}`, {
  method: data === undefined ? "GET" : "POST", redirect: "manual",
  headers: { origin, cookie, ...(data === undefined ? {} : { "content-type": "application/json" }), ...extra },
  ...(data === undefined ? {} : { body: JSON.stringify(data) }),
});
const register = async (address = email()) => {
  const response = await call("/api/auth/sign-up/email", { name: "کاربر آزمون نوایر", email: address, password, passwordConfirmation: password });
  assert.equal(response.status, 200, "Real registration must succeed.");
  const body = await response.json();
  return { email: address.trim().toLowerCase(), cookie: cookies(response), user: body.user, body };
};
const login = async (address, pass = password, next) => call("/api/auth/sign-in/email", { email: address, password: pass, ...(next ? { next } : {}) });
before(async () => {
  const marker = await db.siteSetting.findUnique({ where: { key: "__novair_auth_test" } });
  assert(marker?.value?.nonce === context.nonce, "Owned isolated test database is required.");
  assert.equal((await fetch(`${origin}/login`)).status, 200);
});
beforeEach(async () => { await db.rateLimit.deleteMany(); }); // Owned test DB only, never the application DB.
after(async () => { await db.$disconnect(); });

test("registration persists an unverified USER, versioned password and real session", async () => {
  const account = await register(`  AUTH-${prefix}@example.invalid  `);
  assert.equal(account.user.role, "USER"); assert.equal(account.user.emailVerified, false);
  assert.equal(account.user.email, account.email);
  const user = await db.user.findUnique({ where: { email: account.email }, include: { accounts: true, sessions: true } });
  assert(user && user.accounts.length === 1 && user.sessions.length === 1);
  assert(user.accounts[0].password !== password && user.accounts[0].password.startsWith("scrypt-v1$"));
  assert(await verifyPassword(password, user.accounts[0].password));
  assert(!JSON.stringify(account.body).includes('"token"') && !JSON.stringify(account.body).includes('"password"'));
  const sessionResponse = await call("/api/auth/get-session", undefined, account.cookie);
  const sessionBody = await sessionResponse.json();
  assert.equal(sessionBody.user.id, user.id);
  assert(!JSON.stringify(sessionBody).includes('"token"') && !JSON.stringify(sessionBody).includes('"session"'));
});

test("malformed fields, weak passwords, confirmation and public privilege inputs are rejected", async () => {
  const before = await db.user.count();
  for (const patch of [{ email: "invalid" }, { password: "short", passwordConfirmation: "short" }, { passwordConfirmation: "different-password" }, { role: "ADMIN" }, { emailVerified: true }, { userId: "someone-else" }]) {
    const response = await call("/api/auth/sign-up/email", { name: "کاربر آزمون", email: email(), password, passwordConfirmation: password, ...patch });
    assert.equal(response.status, 400);
    assert(response.headers.getSetCookie().length === 0);
  }
  assert.equal(await db.user.count(), before);
  assert.equal(await db.rateLimit.count(), 0, "Ordinary field-validation failures do not consume account-attempt limits.");
});

test("duplicate registration fails without modifying the existing identity", async () => {
  const account = await register();
  const before = await db.user.count();
  const response = await call("/api/auth/sign-up/email", { name: "نام متفاوت", email: account.email, password, passwordConfirmation: password });
  assert.equal(response.status, 400);
  assert.equal(await db.user.count(), before);
  assert.equal((await db.user.findUnique({ where: { id: account.user.id } })).name, account.user.name);
});

test("concurrent duplicate registrations leave exactly one user, credential and session", async () => {
  const address = email();
  const responses = await Promise.all(Array.from({ length: 6 }, () => call("/api/auth/sign-up/email", { name: "کاربر همزمان", email: address, password, passwordConfirmation: password })));
  assert.equal(responses.filter((response) => response.status === 200).length, 1);
  assert(responses.every((response) => [200, 400].includes(response.status)), "Duplicate races must return controlled responses.");
  const user = await db.user.findUnique({ where: { email: address }, include: { accounts: true, sessions: true } });
  assert(user && user.accounts.length === 1 && user.sessions.length === 1);
  assert.equal(user.role, "USER");
});

test("unknown-account and wrong-password login errors have identical status and public message", async () => {
  const account = await register();
  const badPassword = `Wrong-${password}`;
  const wrong = await login(account.email, badPassword);
  const unknown = await login(email(), badPassword);
  assert.equal(wrong.status, 401); assert.equal(unknown.status, 401);
  assert.deepEqual(await wrong.json(), await unknown.json());
  assert(wrong.headers.getSetCookie().length === 0 && unknown.headers.getSetCookie().length === 0);
});

test("login creates a fresh persistent HttpOnly SameSite session and safe internal redirect", async () => {
  const account = await register();
  const response = await login(account.email, password, "https://example.invalid/redirect");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.redirectTo, "/dashboard");
  const values = response.headers.getSetCookie();
  assert(values.some((value) => /novair\.session_token=/.test(value) && /HttpOnly/i.test(value) && /SameSite=Lax/i.test(value) && /Path=\//i.test(value) && /Max-Age=604800/i.test(value)));
  const cookie = cookies(response);
  assert(cookie !== account.cookie, "Login must not reuse an existing session credential.");
  for (let index=0; index<2; index++) assert.equal((await (await call("/api/account", undefined, cookie)).json()).user.id, account.user.id);
  assert.equal((await call("/dashboard", undefined, cookie)).status, 200);
});

test("USER cannot enter administration or select another account by client identity", async () => {
  const account = await register();
  const other = await register();
  const denied = await call("/api/admin/overview", undefined, account.cookie, { "x-user-role": "ADMIN", "x-user-id": other.user.id });
  assert.equal(denied.status, 403);
  const page = await call("/admin", undefined, account.cookie);
  assert.equal(page.status, 307); assert(new URL(page.headers.get("location"), origin).pathname === "/dashboard");
  const own = await call("/api/account", undefined, account.cookie, { "x-user-id": other.user.id });
  assert.equal((await own.json()).user.id, account.user.id);
  assert.equal((await call(`/api/account?userId=${other.user.id}`, undefined, account.cookie)).status, 400);
  const altered = await call("/api/auth/change-password", { currentPassword: password, newPassword: `Changed-${password}`, passwordConfirmation: `Changed-${password}`, userId: other.user.id, role: "ADMIN" }, account.cookie);
  assert.equal(altered.status, 400);
  assert.equal((await db.user.findUnique({ where: { id: account.user.id } })).role, "USER");
});

test("all private URLs reject anonymous and forged session/role credentials", async () => {
  const forged = "novair.session_token=forged; role=ADMIN; session=forged";
  for (const path of ["/dashboard", "/dashboard/requests", "/dashboard/tickets", "/dashboard/profile", "/admin", "/admin/requests", "/admin/projects", "/admin/tickets", "/admin/users", "/admin/content"]) {
    const response = await call(path, undefined, forged, { "x-user-role": "ADMIN", RSC: "1" });
    assert.equal(response.status, 307, path);
    assert.equal(new URL(response.headers.get("location"), origin).pathname, "/login");
    assert(/no-store/.test(response.headers.get("cache-control")));
  }
  assert.equal((await call("/api/account", undefined, forged)).status, 401);
  assert.equal((await call("/api/admin/overview", undefined, forged)).status, 401);
  assert.equal((await call("/api/auth/change-password", { currentPassword: password, newPassword: `Changed-${password}`, passwordConfirmation: `Changed-${password}` }, forged)).status, 401);
});

test("signed-cookie tampering and an expired database session cannot authorize", async () => {
  const account = await register();
  const tampered = account.cookie.slice(0, -2) + "xx";
  assert.equal((await call("/api/account", undefined, tampered)).status, 401);
  await db.session.updateMany({ where: { userId: account.user.id }, data: { expiresAt: new Date(Date.now()-1000) } });
  assert.equal((await call("/api/account", undefined, account.cookie)).status, 401);
  assert.equal((await call("/dashboard", undefined, account.cookie)).status, 307);
});

test("logout revokes only the active session and replaying it fails", async () => {
  const account = await register();
  const second = await login(account.email); const secondCookie = cookies(second);
  const response = await call("/api/auth/sign-out", {}, account.cookie);
  assert.equal(response.status, 200);
  assert(response.headers.getSetCookie().some((value) => /novair\.session_token=/.test(value) && /Max-Age=0/i.test(value)));
  assert.equal((await call("/api/account", undefined, account.cookie)).status, 401);
  assert.equal((await call("/api/account", undefined, secondCookie)).status, 200);
});

test("password change validates current credentials, rotates the session and invalidates all old sessions", async () => {
  const account = await register();
  const second = await login(account.email); const secondCookie = cookies(second);
  const changed = `Changed-${password}`;
  const wrong = await call("/api/auth/change-password", { currentPassword: `Wrong-${password}`, newPassword: changed, passwordConfirmation: changed }, account.cookie);
  assert.equal(wrong.status, 400);
  assert.equal((await call("/api/account", undefined, account.cookie)).status, 200);
  const response = await call("/api/auth/change-password", { currentPassword: password, newPassword: changed, passwordConfirmation: changed }, account.cookie);
  assert.equal(response.status, 200);
  const newCookie = cookies(response);
  assert(newCookie && newCookie !== account.cookie);
  assert.equal((await call("/api/account", undefined, account.cookie)).status, 401);
  assert.equal((await call("/api/account", undefined, secondCookie)).status, 401);
  assert.equal((await call("/api/account", undefined, newCookie)).status, 200);
  assert.equal((await login(account.email, password)).status, 401);
  assert.equal((await login(account.email, changed)).status, 200);
});

test("database-side revocation, disabled accounts and changed roles are read on the next request", async () => {
  const account = await register();
  await db.session.deleteMany({ where: { userId: account.user.id } });
  assert.equal((await call("/api/account", undefined, account.cookie)).status, 401);
  const response = await login(account.email); const cookie = cookies(response);
  await db.user.update({ where: { id: account.user.id }, data: { disabledAt: new Date() } });
  assert.equal((await call("/api/account", undefined, cookie)).status, 401);
  assert.notEqual((await login(account.email)).status, 200);
  await db.user.update({ where: { id: account.user.id }, data: { disabledAt: null, role: "ADMIN" } });
  assert.equal((await call("/api/admin/overview", undefined, cookie)).status, 200);
  await db.user.update({ where: { id: account.user.id }, data: { role: "USER" } });
  assert.equal((await call("/api/admin/overview", undefined, cookie)).status, 403);
});

test("password changes require a fresh session and the real reauthentication route restores freshness", async () => {
  const account = await register();
  await db.session.updateMany({ where: { userId: account.user.id }, data: { createdAt: new Date(Date.now()-7_200_000) } });
  const changed = `Fresh-${password}`;
  const stale = await call("/api/auth/change-password", { currentPassword: password, newPassword: changed, passwordConfirmation: changed }, account.cookie);
  assert.equal(stale.status, 400);
  assert.equal((await call("/api/account", undefined, account.cookie)).status, 200);
  const reauthentication = await call("/login?reauth=1", undefined, account.cookie);
  assert.equal(reauthentication.status, 200); assert((await reauthentication.text()).includes("<form"));
  const fresh = await login(account.email);
  assert.equal((await call("/api/auth/change-password", { currentPassword: password, newPassword: changed, passwordConfirmation: changed }, cookies(fresh))).status, 200);
});

test("password/session changes roll back atomically if creating the replacement session fails", async () => {
  const account = await register();
  const changed = `Rollback-${password}`;
  await db.$executeRawUnsafe("ALTER TABLE Session ADD CONSTRAINT auth_test_session_failure CHECK (userAgent IS NULL OR userAgent <> 'novair-auth-test-replacement-failure')");
  try {
    const response = await call("/api/auth/change-password", { currentPassword: password, newPassword: changed, passwordConfirmation: changed }, account.cookie, { "user-agent": "novair-auth-test-replacement-failure" });
    assert.equal(response.status, 503);
    assert(response.headers.getSetCookie().length === 0);
    assert(!JSON.stringify(await response.json()).includes("test-only"));
    const credential = await db.account.findFirst({ where: { userId: account.user.id, providerId: "credential" } });
    assert(await verifyPassword(password, credential.password));
    assert.equal((await call("/api/account", undefined, account.cookie)).status, 200);
  } finally { await db.$executeRawUnsafe("ALTER TABLE Session DROP CHECK auth_test_session_failure"); }
});

test("unavailable rate-limit storage fails closed before credential verification", async () => {
  const account = await register();
  await db.$executeRawUnsafe("RENAME TABLE RateLimit TO RateLimit_test_unavailable");
  try {
    const response = await login(account.email);
    assert.equal(response.status, 503);
    assert(response.headers.getSetCookie().length === 0);
    assert.equal(await db.session.count({ where: { userId: account.user.id } }), 1);
  } finally { await db.$executeRawUnsafe("RENAME TABLE RateLimit_test_unavailable TO RateLimit"); }
});

test("unsafe/missing origins and cross-site mutations are rejected without changing account state", async () => {
  const account = await register();
  for (const headers of [{ origin: "https://example.invalid" }, { origin: "null" }, { origin: "" }, { "sec-fetch-site": "cross-site" }]) {
    const response = await call("/api/auth/sign-out", {}, account.cookie, headers);
    assert.equal(response.status, 403);
    assert(response.headers.getSetCookie().length === 0);
  }
  assert.equal((await call("/api/account", undefined, account.cookie)).status, 200);
  const large = await call("/api/auth/sign-in/email", { email: email(), password: "a".repeat(9000) });
  assert.equal(large.status, 413);
  const wrongType = await fetch(`${origin}/api/auth/sign-in/email`, { method: "POST", headers: { origin, "content-type": "text/plain" }, body: "{}" });
  assert.equal(wrongType.status, 415);
});

test("atomic MySQL limits enforce concurrent attempts despite forged forwarding addresses and across instances", async () => {
  const account = await register();
  const responses = await Promise.all(Array.from({ length: 12 }, (_, index) => call("/api/auth/sign-in/email", { email: account.email, password: `Wrong-${password}` }, "", { "x-forwarded-for": `198.51.100.${index}`, "x-real-ip": `203.0.113.${index}` })));
  assert.equal(responses.filter((response) => response.status === 429).length, 4);
  assert.equal(responses.filter((response) => response.status === 401).length, 8);
  assert(responses.filter((response) => response.status === 429).every((response) => Number(response.headers.get("retry-after")) > 0));
  const second = createAuthentication(db, { baseURL: origin, secret: process.env.BETTER_AUTH_SECRET });
  const another = await second.handle(new Request(`${origin}/api/auth/sign-in/email`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ email: account.email, password }) }));
  assert.equal(another.status, 429);
  assert((await db.rateLimit.findMany()).every((row) => !row.key.includes(account.email)));
});

test("controlled bootstrap is idempotent, does not promote users and real ADMIN login authorizes management", async () => {
  const existing = await db.user.findUnique({ where: { email: process.env.ADMIN_EMAIL } });
  assert(existing?.role === "ADMIN", "The actual bootstrap CLI must prepare this fixture before the suite.");
  const repeated = await bootstrapAdministrator(db, { email: process.env.ADMIN_EMAIL, name: "نام جایگزین", password: process.env.ADMIN_PASSWORD });
  assert.equal(repeated.created, false);
  assert.equal((await db.user.findUnique({ where: { id: existing.id } })).name, existing.name);
  const account = await register();
  await assert.rejects(bootstrapAdministrator(db, { email: account.email, name: "مدیر", password }));
  assert.equal((await db.user.findUnique({ where: { id: account.user.id } })).role, "USER");
  const response = await login(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD, "/dashboard/profile");
  assert.equal(response.status, 200); assert.equal((await response.json()).redirectTo, "/admin");
  const cookie = cookies(response);
  assert.equal((await call("/admin", undefined, cookie)).status, 200);
  assert.equal((await call("/dashboard", undefined, cookie)).status, 307);
  const overview = await call("/api/admin/overview", undefined, cookie);
  assert.equal(overview.status, 200);
  const value = await overview.json();
  assert.equal(value.activeUsers, await db.user.count({ where: { disabledAt: null } }));
});

test("HTTPS configuration sets Secure cookies through the maintained library", async () => {
  const secureOrigin = "https://127.0.0.1:3443";
  const secure = createAuthentication(db, { baseURL: secureOrigin, secret: process.env.BETTER_AUTH_SECRET });
  const response = await secure.handle(new Request(`${secureOrigin}/api/auth/sign-up/email`, { method: "POST", headers: { origin: secureOrigin, "content-type": "application/json" }, body: JSON.stringify({ name: "آزمون کوکی", email: email(), password, passwordConfirmation: password }) }));
  assert.equal(response.status, 200);
  assert(response.headers.getSetCookie().some((value) => /Secure/i.test(value) && /HttpOnly/i.test(value) && /__Secure-novair\.session_token=/.test(value)));
});

test("unimplemented recovery and unsupported sensitive operations remain unavailable", async () => {
  for (const path of ["request-password-reset", "reset-password", "update-user", "delete-user", "sign-in/social", "admin/create-user"]) assert.equal((await call(`/api/auth/${path}`, {})).status, 404);
  for (const path of ["/login", "/register"]) {
    const response = await fetch(origin + path); const html = await response.text();
    assert(html.includes("بازیابی رمز از طریق ایمیل هنوز فعال نیست"));
    assert(html.includes("<form"));
    assert(/no-store/.test(response.headers.get("cache-control")));
  }
});

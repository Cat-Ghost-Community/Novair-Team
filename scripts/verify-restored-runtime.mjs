import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const context = JSON.parse(await readFile('.local-tools/release-backup/context.json', 'utf8'));
assert.equal(new URL(process.env.DATABASE_URL).pathname, '/' + context.name);
const browser = JSON.parse(await readFile('.local-tools/release-browser.json', 'utf8'));
const origin = 'http://127.0.0.1:3101';
const cookieOf = r => r.headers.getSetCookie().map(x => x.split(';')[0]).filter(x => !x.endsWith('=')).join('; ');
const call = (path, cookie = '', body) => fetch(origin + path, { redirect: 'manual', method: body ? 'POST' : 'GET', headers: { origin, cookie, ...(body ? { 'content-type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
for (const [account, paths] of [
  [{ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }, ['/admin', '/api/admin/content', '/api/admin/requests', '/api/admin/tickets']],
  [browser.customer, ['/dashboard', '/api/projects/' + browser.projectId, '/api/tickets/' + browser.ticketId]],
]) {
  const login = await call('/api/auth/sign-in/email', '', account); assert.equal(login.status, 200);
  const cookie = cookieOf(login);
  for (const path of paths) { const r = await call(path, cookie); assert.equal(r.status, 200, path); await r.text(); }
  assert.equal((await call('/api/auth/sign-out', cookie, {})).status, 200);
  assert.equal((await call(paths[1], cookie)).status, 401);
}
assert.equal((await call('/')).status, 200);
console.log('PASS: restored real ADMIN/USER logins, permitted operational/CMS/project/ticket reads, logout/revocation and public landing.');

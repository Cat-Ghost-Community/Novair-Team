import { test } from "node:test";
import assert from "node:assert/strict";

// This verifies the blocked-stage boundary, not registration, sessions, or working RBAC.
const origin = "http://127.0.0.1:3000";
const forged = { cookie: "role=ADMIN; session=forged; better-auth.session_token=forged", "x-user-id": "untrusted", "x-user-role": "ADMIN" };

test("all planned auth handlers stay absent and issue no cookies", async () => {
  for (const path of ["get-session", "sign-in/email", "sign-up/email", "sign-out", "change-password", "request-password-reset", "reset-password", "admin/create-user"]) {
    for (const method of ["GET", "POST"]) {
      const response = await fetch(`${origin}/api/auth/${path}`, {
        method, redirect: "manual", headers: { ...forged, origin, "content-type": "application/json" },
        ...(method === "POST" ? { body: JSON.stringify({ email: "boundary-probe@example.invalid", password: "not-a-real-credential", role: "ADMIN" }) } : {}),
      });
      assert.equal(response.status, 404, `${method} ${path}`);
      assert.equal(response.headers.get("set-cookie"), null);
    }
  }
});

test("forged session and role headers cannot access private RSC requests", async () => {
  for (const path of ["/dashboard", "/dashboard/requests", "/dashboard/tickets", "/dashboard/profile", "/admin", "/admin/requests", "/admin/projects", "/admin/tickets", "/admin/users", "/admin/content"]) {
    const response = await fetch(origin + path, { redirect: "manual", headers: { ...forged, RSC: "1", "Next-Router-Prefetch": "1" } });
    assert.equal(response.status, 307, path);
    const destination = new URL(response.headers.get("location"), origin);
    assert.equal(destination.origin, origin);
    assert.equal(destination.pathname, "/login");
    assert.equal(destination.searchParams.get("next"), path);
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.equal(response.headers.get("set-cookie"), null);
  }
});

test("private mutation URLs fail closed without trusting client identity", async () => {
  for (const path of ["/dashboard/profile", "/admin/users", "/admin/content"]) {
    const response = await fetch(origin + path, { method: "POST", redirect: "manual", headers: { ...forged, origin, "content-type": "application/json" }, body: JSON.stringify({ userId: "someone-else", role: "ADMIN" }) });
    assert.equal(response.status, 307, path);
    assert.equal(new URL(response.headers.get("location"), origin).pathname, "/login");
    assert.equal(response.headers.get("set-cookie"), null);
  }
});

test("unavailable login never follows external or encoded return destinations", async () => {
  for (const destination of ["https://example.invalid/redirect", "//example.invalid/redirect", "/%2f%2fexample.invalid", "/admin/../outside"]) {
    const response = await fetch(`${origin}/login?next=${encodeURIComponent(destination)}`, { redirect: "manual" });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("location"), null);
    assert.equal(response.headers.get("set-cookie"), null);
    assert(!((await response.text()).includes("<form")));
  }
});

test("unavailable account pages do not collect credentials or promise password recovery", async () => {
  for (const path of ["/login", "/register"]) {
    const response = await fetch(origin + path);
    const html = await response.text();
    assert.match(html, /بازیابی رمز هنوز در دسترس نیستند/);
    assert(!/<(?:form|input)\b/.test(html));
    assert.equal(response.headers.get("set-cookie"), null);
  }
  assert.equal((await fetch(origin + "/forgot-password")).status, 404);
});

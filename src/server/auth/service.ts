import "server-only";
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { betterAuth } from "better-auth/minimal";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { z } from "zod";
import { hashPassword, verifyPassword } from "./password.ts";
import { safeReturnPath } from "./policy.ts";
import { consumeAuthLimit } from "../security/auth-rate-limit.ts";
import { loginSchema, registrationSchema, changePasswordSchema, type PublicAccount } from "../../shared/auth-contracts.ts";

export type AuthConfiguration = { baseURL: string; secret: string };
const accountSelect = { id: true, name: true, email: true, role: true, emailVerified: true, createdAt: true, disabledAt: true } as const;
type AccountRecord = Awaited<ReturnType<PrismaClient["user"]["findUnique"]>>;
function publicAccount(user: NonNullable<AccountRecord>): PublicAccount {
  return { id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified, createdAt: user.createdAt.toISOString() };
}
export function accountDestination(role: "USER" | "ADMIN", requested?: unknown) {
  const path = safeReturnPath(requested);
  return role === "ADMIN" ? (path === "/admin" || path.startsWith("/admin/") ? path : "/admin")
    : (path === "/dashboard" || path.startsWith("/dashboard/") ? path : "/dashboard");
}

export function createAuthentication(db: PrismaClient, configuration: AuthConfiguration) {
  const baseURL = new URL(configuration.baseURL).origin;
  if (configuration.secret.length < 32) throw new Error("Authentication configuration is incomplete.");
  const auth = betterAuth({
    appName: "NovAir", baseURL, secret: configuration.secret,
    database: prismaAdapter(db, { provider: "mysql", transaction: true }),
    trustedOrigins: [baseURL],
    emailAndPassword: {
      enabled: true, minPasswordLength: 12, maxPasswordLength: 128, requireEmailVerification: false,
      autoSignIn: true,
      password: { hash: hashPassword, verify: ({ password, hash }) => verifyPassword(password, hash) },
    },
    user: { additionalFields: {
      role: { type: "string", required: false, defaultValue: "USER", input: false },
      disabledAt: { type: "date", required: false, input: false, returned: false },
    } },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24, freshAge: 60 * 60, cookieCache: { enabled: false } },
    advanced: {
      database: { generateId: () => randomUUID() },
      cookiePrefix: "novair", useSecureCookies: new URL(baseURL).protocol === "https:",
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" },
      ipAddress: { ipAddressHeaders: [] },
    },
    rateLimit: { enabled: false }, // The enforced atomic MySQL policy below replaces this storage format.
    telemetry: { enabled: false }, logger: { disabled: true },
    // Let the application sanitize unexpected failures; the router otherwise logs raw SQL errors.
    onAPIError: { throw: true },
    databaseHooks: {
      user: { create: { before: async (user) => ({ data: { ...user, email: user.email.trim().toLowerCase(), role: "USER", emailVerified: false } }) } },
      session: { create: { before: async (session, context) => {
        // Use the library's transaction-bound adapter; an outer-client read can deadlock a full pool.
        const user = await context?.context.internalAdapter.findUserById(session.userId);
        if (user && "disabledAt" in user && user.disabledAt) return false;
        return { data: { ...session, ipAddress: null, userAgent: typeof session.userAgent === "string" ? session.userAgent.slice(0, 500) : null } };
      } } },
    },
  });

  async function principal(headers: Headers) {
    const session = await auth.api.getSession({ headers, query: { disableCookieCache: true, disableRefresh: true } });
    if (!session || new Date(session.session.expiresAt).getTime() <= Date.now()) return null;
    const user = await db.user.findUnique({ where: { id: session.user.id }, select: accountSelect });
    if (!user || user.disabledAt || !["USER", "ADMIN"].includes(user.role)) return null;
    return { user: publicAccount(user as NonNullable<AccountRecord>), session: { id: session.session.id, expiresAt: session.session.expiresAt, createdAt: session.session.createdAt } };
  }

  const json = (body: object, status = 200, extra?: HeadersInit) => {
    const headers = new Headers(extra);
    headers.set("Content-Type", "application/json; charset=utf-8");
    headers.set("Cache-Control", "private, no-store, max-age=0");
    headers.delete("content-length");
    return new Response(JSON.stringify(body), { status, headers });
  };
  async function bodyOf(request: Request): Promise<unknown> {
    if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") ?? "")) throw new Error("CONTENT_TYPE");
    if (Number(request.headers.get("content-length") || 0) > 8192) throw new Error("BODY_SIZE");
    const reader = request.body?.getReader();
    if (!reader) return {};
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.length;
      if (size > 8192) { await reader.cancel(); throw new Error("BODY_SIZE"); }
      chunks.push(part.value);
    }
    try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))); }
    catch { throw new Error("BODY_JSON"); }
  }

  async function handle(request: Request) {
    const path = new URL(request.url).pathname.replace(/^\/api\/auth\//, "");
    const allowed = request.method === "GET" ? path === "get-session"
      : request.method === "POST" && ["sign-up/email", "sign-in/email", "sign-out", "change-password"].includes(path);
    if (!allowed) return json({ ok: false, message: "این مسیر در دسترس نیست." }, 404);
    const origin = request.headers.get("origin");
    if ((request.method === "POST" && origin !== baseURL) || (origin && origin !== baseURL) || request.headers.get("sec-fetch-site") === "cross-site") {
      return json({ ok: false, message: "درخواست معتبر نیست. صفحه را دوباره باز کنید." }, 403);
    }
    try {
      let parsed: unknown = {};
      if (request.method === "POST") parsed = await bodyOf(request);
      const schema = path === "sign-up/email" ? registrationSchema : path === "sign-in/email" ? loginSchema
        : path === "change-password" ? changePasswordSchema : z.strictObject({});
      const validation = schema.safeParse(parsed);
      if (!validation.success) {
        const fieldErrors: Record<string, string[]> = {};
        for (const issue of validation.error.issues) {
          const field = issue.path[0];
          if (typeof field === "string") (fieldErrors[field] ??= []).push(issue.message);
        }
        return json({ ok: false, message: "اطلاعات فرم معتبر نیست.", fieldErrors }, 400);
      }
      const data = validation.data;
      let context: Awaited<ReturnType<typeof principal>> = null;
      if (path === "change-password") {
        context = await principal(request.headers);
        if (!context) return json({ ok: false, message: "برای ادامه دوباره وارد حساب شوید." }, 401);
        // This library version requires an authoritative session here but does not enforce freshness.
        if (Date.now() - new Date(context.session.createdAt).getTime() >= 3_600_000) {
          return json({ ok: false, message: "برای تغییر رمز، ابتدا دوباره وارد حساب شوید." }, 400);
        }
      }
      if (["sign-up/email", "sign-in/email", "change-password"].includes(path)) {
        const identity = "email" in data ? String(data.email) : context!.user.id;
        const budget = await consumeAuthLimit(db, configuration.secret, path, identity);
        if (!budget.allowed) return json({ ok: false, message: "تعداد تلاش‌ها زیاد است. کمی بعد دوباره تلاش کنید." }, 429, { "Retry-After": String(budget.retryAfter) });
      }
      let payload: object = {};
      if (path === "sign-up/email" && "name" in data) payload = { name: data.name, email: data.email, password: data.password };
      if (path === "sign-in/email" && "email" in data) payload = { email: data.email, password: data.password };
      if (path === "change-password" && "newPassword" in data) payload = { newPassword: data.newPassword, currentPassword: data.currentPassword, revokeOtherSessions: true };
      const forwardedHeaders = new Headers(request.headers);
      forwardedHeaders.delete("content-length"); forwardedHeaders.delete("transfer-encoding");
      const forwarded = new Request(`${baseURL}/api/auth/${path}`, {
        method: request.method, headers: forwardedHeaders,
        ...(request.method === "POST" ? { body: JSON.stringify(payload) } : {}),
      });
      const response = await auth.handler(forwarded);
      const result = await response.json();
      if (!response.ok) {
        const unavailable = response.status >= 500;
        return json({ ok: false, message: unavailable ? "سرویس حساب فعلاً در دسترس نیست. دوباره تلاش کنید."
          : path === "sign-in/email" ? "ایمیل یا رمز عبور صحیح نیست."
          : path === "change-password" ? "تغییر رمز انجام نشد. رمز فعلی را بررسی کنید؛ ممکن است نیاز باشد دوباره وارد شوید."
          : "ایجاد حساب انجام نشد. اطلاعات را بررسی کنید یا وارد حساب شوید." }, unavailable ? 503 : path === "sign-in/email" ? 401 : 400);
      }
      if (path === "sign-out") return json({ ok: true, redirectTo: "/login?notice=signed-out" }, 200, response.headers);
      const record = result?.user?.id ? await db.user.findUnique({ where: { id: result.user.id }, select: accountSelect }) : null;
      const user = record && !record.disabledAt ? publicAccount(record as NonNullable<AccountRecord>) : null;
      // Library session tokens remain HttpOnly; never copy its raw token/session objects to JSON.
      return json({ ok: true, user, ...(path === "get-session" ? {} : { redirectTo: accountDestination(user?.role ?? "USER", "next" in data ? data.next : undefined) }) }, 200, response.headers);
    } catch (error) {
      if (error instanceof Error && ["CONTENT_TYPE", "BODY_SIZE"].includes(error.message)) return json({ ok: false, message: "قالب یا اندازهٔ درخواست معتبر نیست." }, error.message === "BODY_SIZE" ? 413 : 415);
      if (error instanceof Error && error.message === "BODY_JSON") return json({ ok: false, message: "درخواست معتبر نیست." }, 400);
      // Never log the body, library exception, SQL, password, cookies or token.
      console.warn("[auth] An account operation could not be completed.");
      return json({ ok: false, message: "سرویس حساب فعلاً در دسترس نیست. دوباره تلاش کنید." }, 503);
    }
  }
  return { principal, handle, auth };
}
export type AuthenticationService = ReturnType<typeof createAuthentication>;

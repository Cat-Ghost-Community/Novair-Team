# Authentication — final V1 release decision

Prompt 10 retains Better Auth 1.7.12/official Prisma adapter 1.7.12, existing password callbacks, cookies, sessions, authorization and account UX. Shared display-name validation now rejects dangerous controls/bidi overrides with NFC/ZWNJ preservation. Real HTTP and browser regression, fresh 20-case auth/security suite, actual native password change/old-session revocation, expired-session denial and both-role logout pass. HTTPS Secure/HttpOnly/SameSite/host-only behavior is tested through the actual library/MySQL with an HTTPS configuration; actual TLS/ingress is still BLOCKED.

**Release option C: no public launch until real email ownership verification and self-service recovery are delivered and verified.** No authorized sender/provider credentials/test mailbox were supplied. AccountEmailProvider remains a contract only, unsupported recovery/verification routes remain absent, local accounts are unverified and their UI is truthful. No invitation workflow, manual reset substitute or fake queue is claimed. FINAL_V1_RELEASE_REPORT.md states exact provider/token/expiry/replay/rate/non-enumeration/session-revocation/delivery acceptance work.

cleanupExpiredAuthentication is now shared with the existing auth:cleanup CLI; real isolated tests verify only expired sessions/verifications/rate windows are removed and active credentials/business/ledgers remain. CLI execution succeeded. Host scheduler, production provisioning and retention require operator review; local bootstrap still refuses production/remote use.

Fresh official npm advisory request and normal lifecycle clean install were attempted once and blocked by approved proxy/spawn restrictions, respectively. Selective official advisories were reviewed but do not replace a complete fresh dependency audit. See DEPLOYMENT_READINESS.md and the safe normal-PowerShell install qualifier. No security control or dependency version was weakened.

---

## Historical preceding-stage record

The following text preserves earlier stage decisions/results; its pending/continuation wording is historical. The Prompt 10 release report and checklist above govern the current decision.

# Authentication — Prompt 04

Implemented 2026-10-24 with **Better Auth 1.7.12**, **@better-auth/prisma-adapter 1.7.12**, Prisma/client 6.19.3, Next 16.4.2, React 19.3.1 and existing local MySQL. Final execution results/acceptance are in [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md). The previous blocked report is preserved in [history/PROMPT04_BLOCKED_AUTHENTICATION.md](history/PROMPT04_BLOCKED_AUTHENTICATION.md).

## Dependency integrity

The supplied receipt was compared with installed manifests, exports and TypeScript declarations. `better-auth/minimal`, `@better-auth/prisma-adapter`, and the Next handler export import successfully. Declared peers support the existing stack. The installed adapter supports MySQL and explicit `transaction: true`, essential for atomic password/session changes. No migration or stack replacement was needed.

The staging tree's unintended `novair: file:../..` self-reference was removed from a separate reviewed copy; original staging remains untouched. The complete root lock matches the manifest and contains 523 official registry entries with SSRI integrity. An isolated offline `npm ci --ignore-scripts --no-audit --no-fund --cache .npm-cache` successfully installed 449 packages. Versions/engines were checked before promoting the reviewed tree; the old tree is retained locally. Matching Prisma native engines were preserved and Prisma Client generation passed. This verifies the explicitly script-disabled clean installation, not an online installation with every lifecycle hook.

[Official v1.7.12 release](https://github.com/better-auth/better-auth/releases/tag/v1.7.12), [tagged manifest](https://raw.githubusercontent.com/better-auth/better-auth/v1.7.12/packages/better-auth/package.json), [Prisma adapter documentation](https://better-auth.com/docs/adapters/prisma) and [GHSA-965c-763c-88jm](https://github.com/better-auth/better-auth/security/advisories/GHSA-965c-763c-88jm) were reviewed. That advisory was patched in 1.7.7 and concerns providers not enabled here. Offline npm audit returned exit 0 and zero reported vulnerabilities; **it is not a fresh online advisory audit**. No global npm/proxy/security setting was changed. Optional Prettier/Vitest remain absent; native Node tests are active.

## Configuration and endpoints

`AUTH_ENABLED=true`, canonical local `SITE_URL`, and private `BETTER_AUTH_SECRET` (at least 32 characters) are required. `node scripts/configure-local-auth.mjs --enable` initializes missing local configuration without printing secrets. Keep `.env` private. A secret rotation invalidates existing signed cookies. Open the exact configured host/port; localhost and 127.0.0.1 are distinct origins.

Only GET `/api/auth/get-session` and POST `/api/auth/sign-up/email`, `/sign-in/email`, `/sign-out`, `/change-password` are exposed. Unsupported library endpoints (including role/user updates, deletion, reset, verification, social login) return 404. When disabled, APIs remain 404 and account pages show honest unavailable states. There is no substitute auth framework.

## Credentials and registration

Client/server share strict Zod contracts: lowercase trimmed email (max 191), trimmed display name (2–100), passwords (12–128), matching confirmation and a different new password. Unknown public input including role/ID/verification claims is rejected. The library creation hook independently forces USER and unverified email. MySQL's unique email constraint handles registration races; tests require exactly one user/credential/session under concurrent duplicates. Unknown-account and incorrect-password login responses are identical.

The existing `scrypt-v1` encoding is deliberately wired through Better Auth's documented hash/verify callbacks and shared with bootstrap: N=32768, r=8, p=3, random 16-byte salt, 64-byte key, timing-safe comparison. Default library hashes are not assumed compatible. Password derivations are bounded to 16 pending per process, with database budgets checked first. No plaintext password is stored or logged.

## Sessions, roles and ownership

Better Auth owns opaque database sessions and signed cookies. Sessions last seven days; refresh is eligible after one day through the browser's same-origin session endpoint. Guards disable refresh and cookie caching. Cookies are HttpOnly, SameSite=Lax, host-only, Path=/; HTTPS enables Secure and the `__Secure-` prefix. Plain local HTTP uses the documented development cookie without weakening HTTPS configuration. Application JSON/localStorage never receives session tokens.

Every protected request checks the signed cookie, database expiry, fresh account role and disabled status. Proxy is the early no-store boundary; server layouts/pages repeat role checks. `readOwnAccount` derives ownership from the validated session, accepts no client user ID. `readAdminOverview` validates ADMIN before querying real counts. Future data functions/mutations must enforce their own authorization/ownership, regardless of layout protection.

USER defaults to `/dashboard`; ADMIN to `/admin`, with separate role areas. Safe return paths are restricted to that role's subtree; external/encoded/cross-role values cannot override routing. `?reauth=1` permits explicit login while already authenticated.

Password changes require the current credential and a session created within one hour. **NovAir explicitly enforces freshness:** this installed library version requires an authoritative session on change-password but does not apply its fresh-session middleware there. The real library operation always receives `revokeOtherSessions: true`. MySQL transaction updates password, deletes previous sessions and creates a replacement atomically. A real test-only CHECK constraint forces replacement failure and verifies the previous password/session remain valid. All old credentials fail after a successful change; the requesting browser receives a new session. Logout revokes only the active session and expires its cookie. Disabled accounts, role changes and direct revocation take effect on the next request.

Account transitions reload the document to discard stale router identity. Cross-tab localStorage events carry only a change nonce; persisted-page restoration and visibility validation recheck authentication. Storage is never an authority, and network failure does not falsely establish logout.

## Request and error security

POST requires exact canonical Origin and JSON content type. Missing/null/unsafe origins and cross-site fetch metadata are rejected before mutations; library origin protections remain enabled. Streaming bodies are bounded to 8 KiB. Only allowlisted validated payload fields reach the library. GET cannot change credentials. HttpOnly/SameSite cookies supplement these checks.

`onAPIError.throw` routes unexpected library errors through the application's sanitizer, preventing the library router's raw SQL error logger. Malformed client JSON returns 400; unexpected internal errors return generic 503. No credential, hash, token, raw SQL or exception is logged. Responses are no-store. Existing local-only headers/SEO remain; CSP's framework inline-script allowance is a documented baseline, not a strict nonce-based XSS policy.

## Shared database rate limits

The atomic MySQL limiter uses parameterized upsert/read transactions and HMAC keys. There is no Map fallback. Fixed windows:

| Operation | Shared source | Per identity |
| --- | --- | --- |
| Registration | 30 / 10 minutes | 6 / 10 minutes per email |
| Login | 60 / minute | 8 / minute per email |
| Password change | 60 / minute | 8 / minute per validated user |

The current local single-ingress policy deliberately shares one aggregate source bucket. Arbitrary forwarding/IP headers cannot choose identity or bypass limits. This trades global contention for a clear local trust boundary; a future deployment must configure a trusted ingress before using client addresses. Ordinary validation failures do not consume credential budgets. Denied attempts return 429/Retry-After; unavailable counter storage fails closed with 503 before credential verification. Limits are shared across application instances and tested under concurrency. Run `npm run auth:cleanup` periodically: it deletes only expired sessions, windows and verifications, never users or business records. No permanent account lockout exists.

## Local administrator

There is no public registration/promotion API. Set `ADMIN_EMAIL`, `ADMIN_NAME`, and a unique 12–128 character `ADMIN_PASSWORD` privately, run `npm run admin:bootstrap`, then remove the temporary password environment entry. The command rejects production/remote databases, existing USER accounts and differing existing ADMIN credentials. A matching ADMIN is unchanged; it never silently resets/promotes anyone. The actual CLI ran twice on isolated MySQL and that administrator is used for real API/browser login verification. No default/live administrator was planted in the application database.

## Honest limitations

No email delivery/recovery/verification provider is configured. Public accounts remain unverified: address ownership is not established, and address squatting/abuse remains a public-release consideration. Screens disclose this and ask users to retain their password. `AccountEmailProvider` defines a real queueing contract for later integration; no no-op sender or reset-success claim exists. Administrator bootstrap is not ordinary user recovery.

Project request submission/tracking is implemented in Prompt 05 through USER-authorized services; Prompt 06 adds separate ADMIN review/project management below. Tickets, content editors and uploads remain deferred. Dashboard empty states disclose availability; counts use only real permitted records. See [TESTING.md](TESTING.md) for executed results, isolated MySQL ownership/cleanup, browser transport and remaining noncritical tooling limits. Automated axe checks are not accessibility certification; hosting/TLS, fresh online audit and independent security review remain release work.

## Prompt 05 preserved authentication guarantees

Registration now accepts only an optional bounded return path in addition to its existing strict fields; server role-aware safe-path policy validates it before redirecting. Login/register links preserve a genuine request-form destination. Role/owner/status claims remain rejected. AuthSync preserves a marked open request draft during same-account reauthentication, validating rather than blindly reloading that page; a different identity/role still reloads. This client behavior never grants server permissions. Existing auth budgets use the same transaction-compatible limiter helper and are rerun in the request verification harness. See REQUESTS.md for authenticated customer boundaries and TESTING.md for results.

## Prompt 06 management boundaries

The authentication library/schema/cookie/session policy is unchanged. ADMIN management services validate the existing real session and current account state for every read/write, with another role/disabled check under actor-row lock for mutations. USER authorization and request ownership remain separate. A role change, disabled account, expired/revoked session or forged cookie cannot gain management access. Assignment accepts only a currently enabled, existing ADMIN, with no public promotion flow.

Management mutations retain exact-origin/cross-site checks, strict 32 KiB JSON parsing and a separate atomic MySQL budget (30/admin and 120/shared-source per minute). No forwarding header is trusted. Private notes and durable actor-scoped operation results are not added to account/customer DTOs. Marked management forms reuse the existing same-account reauthentication behavior; all authorization remains server-side. See PROJECT_MANAGEMENT.md for concurrency/privacy contracts and TESTING.md for actual full regression results. Email verification/recovery and production-release limitations above remain unchanged.

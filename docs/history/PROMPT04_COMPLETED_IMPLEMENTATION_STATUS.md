# Implementation status

Current stage: **Prompt 04/10 — completed and accepted for local continuation**, 2026-10-24. Real authentication is enabled locally after passing the dependency gate and critical security/browser tests. The repository is ready for Prompt 05; **no Prompt 05 workflow or deployment was implemented**. This is not certification of the entire V1 for production release.

## Completed

- Preserved the complete Persian RTL landing, local Vazirmatn, both themes, SVG identity, navigation/mobile menu, publication-filtered content and both MySQL migrations.
- Reviewed/installed Better Auth **1.7.12** and official Prisma adapter **1.7.12** with the existing Prisma **6.19.3**, Next **16.4.2**, React **19.3.1** stack. Root lock is complete; 523 trusted registry/integrity entries match the manifest. An isolated script-disabled offline clean install of 449 packages passed; matching Prisma engine/client generation passed. Old dependencies/staging remain retained locally.
- Real strict USER registration (unverified email), normalized unique email, race protection, secure versioned scrypt through library callbacks, login, signed persistent database sessions, logout/revocation and authenticated password changes with replacement/all-old-session invalidation.
- Server role/disabled/expiry checks in Proxy, layouts/pages and authorized data access; owner context never comes from client IDs. USER and ADMIN areas remain separate. Internal role-aware redirects prevent open redirects. No public admin registration/promotion.
- Controlled idempotent local administrator bootstrap, actually executed twice on isolated MySQL and verified through real API/browser login. No default/live administrator was inserted.
- Enforced atomic database rate limits for registration/login/password changes; concurrent attempts, shared instances, forged forwarding headers and unavailable counter storage tested. Exact Origin/CSRF/media/body checks, secure cookie policy and sanitized no-store errors are active.
- Persian accessible account forms, real pending/errors/success, password visibility/autocomplete, disabled pre-hydration POST safety, personalized responsive user/admin shells, account overview/profile/password management, real permitted admin counts and logout.
- Browser identity synchronization/refresh, theme persistence, keyboard/menu behavior and honest unavailable future-feature/recovery messaging. No fabricated records or reset delivery.
- Reusable owned-database verification harness, auth cleanup command, complete documentation and supported constrained-host build command. Initial security-test findings were corrected and rerun successfully.

## Actual final verification

| Gate | Result |
| --- | --- |
| Production build | **PASS**, `npm run build:local`: compilation, types, page generation/tracing; normal child-worker build remains restricted |
| Post-build TypeScript / ESLint | **PASS / PASS**, zero lint warnings |
| Native unit/workflow tests | **16/16 PASS** |
| Real MySQL/HTTP auth/security | **20/20 PASS** |
| Foundation + negative-access HTTP | **12/12 PASS**; repeated against enabled live local server |
| Landing/account CDP regressions | **51/51 PASS** |
| Authenticated CDP scenarios | **10/10 PASS** |
| Axe | **34 configurations**, zero detected violations; not accessibility certification |
| MySQL integrity/content | Connectivity, 14 models, both migrations, Persian/default/rollback checks PASS; all five publication/fallback integration groups PASS |
| Full owned verification harness | PASS, including real bootstrap, all suites, server shutdown and nonce-verified test cleanup; live counts unchanged |
| Responsive/theme | Seven requested widths in both themes, 200% root text and no-overflow checks PASS; actual representative screenshots inspected |
| Local runtime | Enabled app starts at `http://127.0.0.1:3000`; real forms/private boundaries/asset HTTP regressions PASS |
| Optional tools | Prettier/Vitest absent, not passed; active native tests/ESLint/manual review used as documented |

**109 unique native/HTTP/browser scenarios passed**, plus separate database verification groups. See [TESTING.md](TESTING.md) for exact scope and artifact paths. These are executed results, not test plans or mock-auth checks. Fifty-eight current screenshots were saved; representative phone/desktop/tablet/theme/error/text-size images were opened. Current screenshots do not replace lost historical artifacts.

## Important decisions

1. Maintained Better Auth owns sessions and credential operations; the application wraps a strict endpoint/payload allowlist rather than exposing all library capabilities. The adapter explicitly uses transactions. No custom session/token framework was written.
2. Existing auth models fit the installed adapter; **no schema change or new migration** was required. Existing business/content records and migration files were preserved. Test fixtures existed only in owned disposable MySQL databases and were removed after verification.
3. Existing scrypt encoding is explicitly integrated through documented callbacks and reused by bootstrap; default Better Auth hashes are not assumed compatible. Public role/verification input is rejected and creation hooks force USER/unverified.
4. Password changes require one-hour freshness in the server wrapper, because the installed change-password middleware does not enforce it automatically. A real forced replacement-session failure verified transactional rollback. Unexpected library errors are sanitized before logging/responding.
5. Fixed-window MySQL counters use one aggregate local-source bucket plus email/user identity. Forwarding headers are untrusted. This is a deliberate local trust boundary; production ingress policy must be reviewed later.
6. User/admin data is authorized at the server data boundary as well as route/layout protection. No client-supplied ownership or role is trusted. Session cookie cache is disabled and current role/disabled state is read from MySQL.
7. `build:local` uses supported Next in-process/threaded compilation and TypeScript API for the host's process restrictions. Checks remain enabled. CDP uses isolated contexts and no default-context overrides; direct official axe engine execution avoids an unstable auxiliary transfer page.

## Remaining limitations and release work

- Email verification/recovery delivery is **unavailable** and clearly disclosed. Accounts remain unverified; address ownership/squatting risk remains. A real provider contract exists but no sender/reset endpoint or fake success flow is enabled.
- The full lock and script-disabled clean install are verified. Fresh ordinary lifecycle-enabled installation, online advisory audit and independent production review remain release work. Offline audit exited 0/reported zero vulnerabilities, which is not a fresh online security certification. No proxy/network policy was bypassed.
- Prettier/Vitest remain optional/unavailable. Native tests provide actual coverage; manual formatting/ESLint is not called a formatter-equivalent pass. Standard Playwright worker/Next dev subprocess restrictions remain; supported build/start and CDP are verified alternatives.
- Local HTTP is intentional; HTTPS Secure-cookie behavior was tested through real library configuration, not deployed TLS. Trusted ingress, proxy/client-address policy, mail, strict CSP nonce hardening, scheduled maintenance and deployment hardening must be reviewed before any future release. No remote service/hosting was configured.
- No manual screen-reader certification, cross-browser certification, fresh Lighthouse measurement or external penetration test is claimed. No known severe Chromium responsive/accessibility defect remains after the executed checks.
- Requests, project tracking, ticket workflows, management editors and uploads are still unavailable and labelled truthfully. Administrator account bootstrap is available but the operator must choose private credentials; no default account/password exists.

## Continuation and operation

Read [AUTHENTICATION.md](AUTHENTICATION.md), [ARCHITECTURE.md](ARCHITECTURE.md), [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), [TESTING.md](TESTING.md), [LOCAL_AUTH_SETUP.md](LOCAL_AUTH_SETUP.md) and [README.md](../README.md). Run `npm run build:local` then `npm run start`; use `npm run test:auth:browser` for owned-database security/browser verification. Stop a running server before rebuilding. `npm run admin:bootstrap` accepts only explicit private local operator credentials; remove temporary ADMIN_PASSWORD afterwards. Run `npm run auth:cleanup` periodically for expired auth rows only.

Historical blocked/recovery findings and prior Prompt 01–03 results are preserved in `docs/history/`. Obsolete blocked-auth test source is preserved in `tests/history/prompt04-blocked`. The standard-runner artifact cleanup incident and historical raw-image loss are preserved, not concealed. Current test output stays under `test-results/prompt04-auth`; keep conventional Playwright cleanup under `test-results/playwright`.

| Prompt | Intended remaining scope |
| --- | --- |
| 05 | Real project request submission and tracking using current authenticated owner helpers |
| 06 | Authorized admin request review, projects, assignments and status history |
| 07 | Expanded real user/project dashboard and profile capabilities |
| 08 | Authorized support tickets/messages and secure attachments if requested |
| 09 | Admin services/portfolio/FAQ/settings management and validated public assets |
| 10 | End-to-end hardening, release verification and all remaining release/environment checks |

Do not weaken authorization, reset live data, add fictional content or deploy while continuing these stages.

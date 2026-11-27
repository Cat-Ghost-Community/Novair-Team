# Testing

Current phase: Prompt 04 authentication completion, verified locally on 2026-10-24. Historical results are retained in [history/PROMPT01_STATUS.md](history/PROMPT01_STATUS.md), [history/PROMPT02_STATUS.md](history/PROMPT02_STATUS.md), [history/PROMPT03_STATUS.md](history/PROMPT03_STATUS.md), and [history/PROMPT04_BLOCKED_TESTING.md](history/PROMPT04_BLOCKED_TESTING.md). Earlier failures are not retroactively relabelled as passes.

## Actual final results

| Check | Executed result |
| --- | --- |
| `npm run build:local` | PASS: real webpack compilation, strict TypeScript, prerendering and traces; dynamic auth/API/private routes generated |
| `npm run typecheck` | PASS after final build |
| `npm run lint` | PASS, zero warnings |
| `npm test` | **16/16 PASS**, native Node runner (12 original security/content/contrast + 4 workflow-policy tests) |
| Real MySQL auth/HTTP integration | **20/20 PASS**, `security-http.tap` |
| HTTP regressions | **12/12 PASS** (7 foundation + 5 negative-access tests), isolated server and repeated on live local port 3000 |
| Shared CDP landing/account regressions | **51/51 PASS**, `browser-regression.tap` |
| New real-auth CDP scenarios | **10/10 PASS**, `browser-auth.tap` |
| MySQL connectivity/integrity | PASS: 14 models, both applied migrations, Persian round-trip/defaults, rollback |
| Public-content MySQL integration | All **5 PASS groups**, actual migrated random database; fixtures removed, live content counts unchanged |
| Admin bootstrap | Real CLI create then idempotent rerun PASS; actual administrator HTTP and browser login PASS |
| Owned auth verification harness | Full `powershell -NoProfile -File scripts/verify-auth.ps1 -Browser` PASS, including setup/server/bootstrap/suites/final cleanup |
| Dependency integrity | 523 official-registry SSRI entries match root declarations; isolated offline `npm ci --ignore-scripts` installed 449 packages; versions/engines/exports checked |
| Offline npm audit | Exit 0, zero vulnerabilities reported; **not a fresh online audit** |
| Expired auth cleanup | Executed against local application: 0 expired sessions/windows/verifications, no account/business deletion |

There are **109 passing unique native/HTTP/browser test scenarios** across the listed suites (16 + 20 + 12 + 51 + 10), plus the database integrity/content groups. Repeated runs are not counted as additional unique coverage. Native unit tests are not described as executed Vitest tests.

## Run commands

```powershell
npm run build:local
npm run typecheck
npm run lint
npm test
npm run db:check
npm run db:verify
npm run test:content-db
npm run test:auth:browser
```

Run build and typecheck sequentially: `.next/types` is regenerated. Stop running servers before rebuilding to avoid stale asset hashes. Standard `npm run build` remains the normal-host command. Here its child workers/TypeScript CLI fail with `spawn EPERM`; `build:local` uses installed Next's supported in-process webpack/TypeScript API and worker-thread options, skipping no checks or permissions. `npm run start` runs the verified local build. Standard Next dev/Playwright worker launching remain constrained; the CDP path is separate actual execution.

Optional `format:check` and `test:vitest` require absent Prettier/Vitest. No formatter-equivalence or Vitest pass is claimed. ESLint/manual formatting review and native tests are the documented alternatives; no repeated network retrieval was attempted. Script-disabled offline clean installation plus explicit matching Prisma engine generation is verified; fresh lifecycle-enabled installation/online audit remain release work.

## Authentication tests and isolation

`verify-auth.ps1` requires local root credentials from ignored `.env`, a complete build and unused port 3100. It refuses an existing fixture context/occupied port, creates a random `novair_auth_test_<hex>` database, applies actual migration SQL and inserts a nonce ownership marker. Private fixtures contain random administrator credentials and a separate auth secret, never printed or stored in source/docs. The actual bootstrap CLI runs twice. A hidden owned Next server uses only this database/origin. Tests never insert accounts into the configured application database.

`finally` stops only the server it started, verifies the test database's name/marker and unchanged live user/session/portfolio/FAQ counts, drops only its owned database and removes private fixture files. Final cleanup passed. Migration files and live data remain unchanged. Fixtures apply genuine DDL; no fabricated Prisma migration ledger is used. The public-content integration independently creates/removes its own random database.

The 20 security cases exercise actual maintained-library APIs through real Next HTTP/MySQL: persisted USER/unverified registration and hashing, validation/privilege rejection, duplicates and six-way races, equal unknown/wrong-credential failures, cookie properties and safe redirects, owner-only access, USER/ADMIN separation, all ten private URLs and forged/RSC entry points, tampered/expired sessions, logout/replay, password rotation/all-old-session invalidation, disabled/revoked/changed-role accounts, one-hour freshness plus real reauthentication, atomic rollback under a real test-only CHECK-constraint failure, unavailable counter storage, CSRF/unsafe origins/body/media bounds, concurrent database rate limits despite forged forwarding headers/shared service instances, controlled bootstrap, HTTPS Secure-cookie configuration and unsupported sensitive endpoints.

The HTTPS cookie case invokes the real configured library against MySQL; it does not certify a deployed TLS terminator. The fault tests intentionally produce two fixed sanitized server warnings. No raw exception/SQL/credential appears in the final application server log. Database errors are not converted into fake success or client validation.

The real library's authoritative-session middleware did not enforce freshness on change-password; an initial negative test found this and the server now explicitly requires a session younger than one hour. A fault test also found non-JSON internal failures being misclassified as bad client JSON; the handler now distinguishes those errors and suppresses raw library SQL logging. Both corrected scenarios passed final execution. Original failures remain local diagnostic evidence, not concealed passes.

## Browser and accessibility coverage

Chromium **155.0.8059.85**, Playwright **1.64.1**, axe-core **4.14.0**, existing approved local CDP endpoint. Runners validate loopback endpoints, use `noDefaults: true`, create/close isolated contexts and disconnect. They never navigate/close user tabs or change existing default-context settings. The earlier connection timeout was resolved using the supported no-default-overrides option; no assertion or timeout was relaxed.

The 51 shared cases preserve landing, local fonts/assets, navigation/history, real portfolio/FAQ rendering, mobile dialog focus/Escape/backdrop, both themes/default/persistence/cross-tab synchronization, delayed hydration, reduced motion, seven-width RTL, 200% root text, landscape navigation, public headers/private boundaries, account forms and captures. Obsolete blocked-auth assertions were archived verbatim under `tests/history/prompt04-blocked` before updating them to actual enabled behavior; negative authorization assertions remain.

The 10 auth browser cases cover real registration/double-submit prevention, password visibility, validation/focus, pre-hydration POST safety, login with hostile redirect, persistent sessions across reload, password change/new credentials, account-menu Escape/logout/history, USER rejection from admin, real bootstrapped ADMIN navigation, truthful project CTA, and both role dashboards/profile across all seven widths with 200% root text.

**34 axe configurations completed with zero detected violations:** 20 landing/menu/dialog/expanded-FAQ/account configurations and 14 new error/private-page configurations. `tests/shared/accessibility.ts` injects the official installed axe engine and runs the same WCAG tags directly in each real page. It asserts there are no iframes; the application has none. This avoids the previous auxiliary transfer-page closure in AxeBuilder without disabling rules, altering assertions or substituting static HTML inspection. It is not a full accessibility, assistive-technology or cross-browser certification.

## Responsive and screenshot review

Both themes passed at **320, 375, 430, 768, 1024, 1440, 1920px**, including account forms and authenticated user/profile/admin layouts; no horizontal overflow was detected. Increased text, touch controls, password buttons, keyboard focus/menu restoration and long mixed-direction email values were checked. This is Chromium evidence; manual screen-reader/other-engine review remains open.

Current ignored artifacts: `test-results/prompt04-auth/` contains result logs, 40 landing/account regression PNGs, 18 authenticated/error/zoom PNGs and landing measurements. **58 screenshots** were generated. Representative light mobile login, dark desktop registration, light mobile profile, dark desktop/mobile admin, light desktop dashboard, dark 320px validation, dark profile at 200% text and tablet landing images were actually opened and inspected. No known severe overlap/contrast/layout defect was found. Not every individual capture received a separate manual inspection, and no new Lighthouse/CWV score is claimed.

The historical conventional-runner cleanup incident deleted old ignored Prompt 02/03 images, not source/data/history; those losses remain documented in the archived reports. Do not claim restored historical screenshots. **Keep Playwright `outputDir: "test-results/playwright"`**: its cleanup must not target the parent phase-artifact directory. Standard Playwright workers previously failed EPERM; successful CDP execution does not imply that worker launcher now works.

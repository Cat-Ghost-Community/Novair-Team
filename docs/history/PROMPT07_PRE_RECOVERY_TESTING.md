# Testing

## Prompt 07 — implemented, browser acceptance pending

2026-10-24. **This stage is not accepted yet and is not ready for Prompt 08.** Production build, TypeScript, ESLint, real MySQL/security tests and approved Chrome-tool checks passed. The preserved direct Playwright suites have not passed in this execution environment, and screenshots could not be obtained/inspected. Historical Prompt 06 testing is preserved below and in `history/PROMPT06_COMPLETED_TESTING.md`.

| Executed check | Actual result |
| --- | --- |
| `npm run build:local` | PASS, actual compilation/types/pages/traces; no checks skipped |
| Post-build TypeScript / ESLint | PASS / PASS, zero warnings |
| Native tests | **26/26 PASS** |
| Existing real auth/security / HTTP | **20/20 + 12/12 PASS** |
| Existing customer requests / ADMIN management | **21/21 + 29/29 PASS** |
| New real customer project integration | **17/17 PASS** |
| Full owned backend harness | PASS; **125 unique Node scenarios** including native tests, not repeated runs |
| Approved Chrome MCP functional groups | **6 PASS**: real registration/request/review/accept/conversion/link; waiting distinction/dialog focus; execution update/reload/history; keyboard/theme/profile; logout/login/expiry; second-user isolation/read-only APIs |
| Chrome MCP real zero-data proof | Six dashboard metrics were zero for a genuine new customer; honest empty project state |
| Chrome MCP matrix | **168 checks**: twelve views × seven widths × both themes, plus **2 spot checks** |
| Axe | **170 actual runs**, installed official engine and original wcag2a/wcag2aa/wcag21aa tags; zero detected violations |
| Direct Playwright/CDP | **BLOCKED**, WebSocket handshake returns HTTP 403; the new suite's 10 scenarios failed setup before assertions, existing 85 not retried against the same unavailable transport |
| Screenshots / visual inspection | **UNVERIFIED**; full-page, viewport and temporary-file captures did not return; no new repository images or visual pass claimed |
| MySQL | 18 models/four migrations, fresh owned DDL, zero-pending rerun, Persian/default/history/rollback PASS; five content groups PASS |

The 17 new integration scenarios exercise actual maintained sessions and MySQL: current USER authorization inside APIs/direct service methods, anonymous/forged/ADMIN rejection, expired/revoked/disabled/role-changed sessions, owner-only list/detail/aggregate predicates, identical missing/non-owned/malformed 404, explicit DTO keys, genuine conversion/status/history/dates, all no-write methods, strict/repeated/ownership query rejection, exact private description/note/history-note/audit/operation/assignee-contact canaries across JSON/server HTML/real RSC, inconsistent legacy relationship isolation, ten-item disjoint deterministic pagination, legacy/100-event truncation honesty, real renamed-table failure/sanitized 503/fresh recovery, and escaped long titles. Existing auth/request/management suites retain their assertions and are executed in full in backend mode.

The first privacy attempt expected 200 on a bare RSC request. Next's real cache-key validation returned a 307 canonical `_rsc` redirect. The corrected helper follows only a same-origin/same-path cache-key redirect, asserts `text/x-component`, verifies the permitted record is present, and checks all private canaries absent. It cannot count a redirect to login as a privacy pass. The failed artifact `rsc-canonical-fixture-failure.tap` is retained; no framework validation was disabled.

### Browser evidence and exact limits

The existing DevToolsActivePort WebSocket endpoint rejects Playwright with **403 Forbidden / Connection rejected**. One standalone probe confirmed the same condition after activating the approved Chrome tool; no proxy/global npm/browser security setting or permission policy was changed. The rejected setup is preserved in `cdp-403-blocked.tap`, not presented as ten product failures or ten passes. No repeated worker/registry download attempts were made.

Chrome DevTools MCP still worked. Actual UI registration, submission, administrator login/review/acceptance/conversion, project linking and execution transition were driven in isolated browser contexts against the owned port-3100 server. Other checks used real authenticated browser fetches and actual DOM/keyboard events. No fake browser session, user role, database or API was substituted. Official installed axe was injected only into test pages through the approved browser tool; it is not bundled/served by the application and required no application CSP relaxation.

The 12 matrix views were empty dashboard/projects, populated dashboard/list/detail, converted request, profile, accepted-awaiting-conversion, completed, cancelled, legacy and filtered empty. Every view ran at 320/375/430/768/1024/1440/1920px in Light and Dark, with actual emulated viewport verification, RTL and 200% root-text horizontal overflow assertions. The initial project and zero-dashboard spot checks make 170 axe executions in total. No automated result is WCAG certification, physical-device proof or visual inspection. Full-page/viewport screenshot attempts failed to return, including a temporary-file attempt; their lack of response is not assigned an invented cause.

`test-results/prompt07/browser-tools-final.json` contains all 168 matrix records, two spot checks, functional groups and explicit false flags for full Playwright and screenshot verification. These observations do **not** relabel the old 85 or new 10 Node/CDP scenarios as executed. The direct new browser suite remains available unchanged for a permitted endpoint. Prior phase 06's 147 and phase 05's 97 screenshots remain present; no historical test artifacts were deleted.

### Commands, fixture ownership and unblock

```powershell
npm run build:local
npm run typecheck
npm run lint
npm test
npm run db:verify
npm run test:content-db
npm run test:projects
# After an approved/current loopback CDP endpoint is available:
$env:NOVAIR_CDP_URL = 'ws://127.0.0.1:<approved-port>/devtools/browser/<current-id>'
npm run test:projects:browser
```

Use build/typecheck sequentially and stop servers before rebuilding. `test:projects` runs every existing backend suite plus new projects. `-ProjectsOnly` is an iteration option, not the full gate. `-Browser` runs the preserved 85 and new 10 CDP scenarios. `-BrowserTools` keeps the nonce-owned fixture alive for separately authorized Chrome MCP inspection and waits for its own completion signal; it explicitly does not certify a CDP pass. The full backend run and approved Chrome inspection used this mode; finally stopped only the owned server, checked every model's live counts, dropped only the marker-owned fixture and removed private fixture configuration. An independent SHA-256 comparison verified all original row values/counts and all four released SQL files unchanged. No schema change/reset/reseed occurred.

The only previous CDP test-source change is management's output directory honoring `NOVAIR_TEST_OUTPUT`, preserving old screenshot artifacts; its assertions are not weakened. Original reports/test files are saved under `PROMPT06_COMPLETED_*` / `tests/history/prompt06-completed`. The four existing migrations and dependency lock remain intact. Optional Prettier/Vitest were not required or claimed. Fresh dependency advisory/lifecycle-install, other engines, manual assistive technology and deployed TLS remain release checks.

After final fixture cleanup, the previous owned port-3000 process was identified by its original session/PID/start time and restarted on the current build. The actual configured application passed all 12 existing read-only HTTP checks again, plus new forged/anonymous project API/page and read-only method probes. Original value/migration hashes still matched afterwards. Repeated HTTP checks are not additional unique scenarios. Private browser credential helper files were removed; no temporary port-3100 server/context remains. `verification-summary.json` independently checks TAP counts, Chrome-tool counts, cleanup, unchanged dependency manifest/lock and historical image counts, with acceptance/visual flags explicitly false.

To accept Prompt 07, provide a permitted current loopback CDP endpoint, run the full browser command, fix any failures, capture mobile/desktop Light/Dark screenshots and actually inspect them. This source tree contains the implementation and tests; it is not an accepted Prompt 07/full V1 release until those gates are satisfied.

---

## Historical Prompt 06 verification

## Prompt 06 — administrative processing

Local verification date: 2026-10-24. **Prompt 06 is accepted locally on the final production build.** The full regression workflow passed again after date-only rendering, dialog spacing and assignment-option refinements. Actual counts/cleanup were independently parsed into `test-results/prompt06/verification-summary.json`. Accepted Prompt 05 records remain in [history/PROMPT05_COMPLETED_TESTING.md](history/PROMPT05_COMPLETED_TESTING.md); the historical report below is preserved.

The full owned `npm run test:management:browser` workflow executes existing real Better Auth/MySQL security, HTTP, customer-request and CDP suites, followed by the new management suite. Latest completed full-run counts:

| Suite | Passed |
| --- | --- |
| Native contracts/security/dependency workflow (`npm test`) | 24/24 |
| Authentication/security integration | 20/20 |
| Foundation/unsupported-auth HTTP | 12/12 |
| Customer request integration | 21/21 |
| Management integration | 29/29 |
| Shared landing/account CDP | 51/51 |
| Authenticated account CDP | 10/10 |
| Customer request CDP | 13/13 |
| Management CDP | 11/11 |

This is **191 unique scenarios** plus independent database checks, not a sum of repeated runs. Production build, strict TypeScript and ESLint passed. Local connection/18-model verification includes the actual four-migration ledger, Persian storage, defaults, request history and rollback. All five independent public-content groups passed and their fixture was removed. Fresh isolated DDL/real uniqueness/FKs/exactly-one-note-target CHECK and rollback were verified before applying migration 004 to local development; rerun applied zero migrations. Original record values/counts and earlier migration SQL hashes were independently preserved.

After fixture cleanup, the final production build started successfully on the actual configured application at `http://127.0.0.1:3000`. All 12 existing read-only HTTP regressions passed there again, and a separate anonymous/forged-cookie probe confirmed all six management read paths, six write paths and three ADMIN pages reject unauthorized access. The actual landing rendered Persian RTL. This probe created no business records; a subsequent original-value/migration hash comparison passed. Repeated HTTP checks are not added to the unique count.

### Management integration coverage

Real HTTP and service-boundary tests cover anonymous/USER/forged/expired/revoked/disabled principals and immediate role changes; private note absence from customer JSON/HTML/RSC; strict parameters/body/protected-field rejection; required public decline reason; explicit review/execution state maps; concurrent two-admin decision/edit conflicts; terminal behavior; genuine actor/time/order; acceptance distinct from conversion; unique originating request; simultaneous conversion and repeat-after-success; source-owner/submission preservation; genuine SQL ledger/history/note/audit failures with full rollback and safe retry; existing eligible ADMIN assignment; invalid/disabled/non-admin assignment; date rollover/order; metadata audit/no-op; append-only private notes; durable exact replay/recovery and changed-key-payload conflicts; 35 concurrent operations enforcing the 30-per-admin budget; unavailable counters failing closed; origin/cross-site/size/media checks; real summaries, deterministic pagination and filters. No fake identity, mocked storage or bypassed foreign key is used.

Fault injection uses temporary CHECK constraints over validated existing fixture primary keys, or an owned-table rename, restored in finally. These operate only on the marker-owned isolated database. A failure on the final AdminOperation INSERT proves even the acknowledgment is transactional. A fixed-window rate assertion waits briefly when close to a minute boundary, so all 35 operations exercise one real budget; neither server clock nor production limit is overridden.

### Browser, responsive and accessibility

Management's 11 real Chromium/CDP scenarios cover login/navigation/search, review/accept/decline/conversion, cancel/Escape/focus restoration, required reason/date errors, actual customer-visible explanation/privacy, project assignment/audit/execution lifecycle, stale simultaneous pages, retained metadata input, response-aborted-after-commit recovery/reload without duplicate notes, forced history rollback and retry, USER/forged-cookie denial, plain-text note rendering, real database-read error/reload recovery and complete layout matrices.

The seven admin views (empty request/project lists, populated lists, request detail, project detail and operational overview) run at 320/375/430/768/1024/1440/1920px, both themes and 200% root text. RTL/theme/no-overflow checks run at each width. Dialogs also run at 640×320 with doubled text and keyboard focus. Existing public/account/customer request matrices and theme persistence/cross-tab/keyboard/security regressions remain in the full gate.

**98 axe configurations** completed without detected violations: preserved suites 61, management 37 (including validation, conflict, notes, normal responsive views and open dialogs/landscape). This is automated coverage, not WCAG certification. No checks/tags were removed to pass. Current artifacts are `test-results/prompt06`: **147 screenshots** and suite/build logs. Representative light/dark mobile/desktop request/project views, confirmation, conflict, overview and 200% landscape were opened for actual inspection. Final scheduled-project/date-only and keyboard-focused landscape confirmation images were inspected after refinement. The original Prompt 05 97 images remain present.

Initial failed logs are retained: `management-window-boundary-failure.tap` (a burst crossing two legitimate fixed windows) and `browser-strict-login-fixture-failure.tap` (helper supplied an unwanted ID to strict login). The assertions were not weakened: the test starts away from the boundary and the helper now submits only email/password. The complete pre-presentation run is retained under `pre-presentation-regression`. A formatting/syntax-printer pass on new modules does not stand in for executed tests.

### Commands and isolation

```powershell
npm run build:local
npm run typecheck
npm run lint
npm test
powershell -NoProfile -File scripts/prisma-local.ps1 -Action Validate
powershell -NoProfile -File scripts/prisma-local.ps1 -Action Migrate
npm run db:check
npm run db:verify
npm run test:content-db
npm run test:management:browser
```

Build and typecheck remain sequential; stop servers before rebuilding. The final harness creates a random nonce-owned MySQL database from all checked-in migrations, bootstraps the actual test ADMIN twice, starts its own loopback server on port 3100 and runs every listed integration/browser suite. Cleanup stops only its server, verifies marker/name and unchanged live counts (including requests/projects/notes/operations/audits), drops only its own database and removes private fixture config. It refuses occupied ports/existing fixture contexts. An independent pre-phase scalar-value/migration SHA-256 comparison also checks original application data.

`test:management` omits browsers; `powershell -NoProfile -File scripts/verify-management.ps1 -Browser -ManagementOnly` is targeted iteration only. Full regression is the acceptance gate. Prior `test:requests:browser` and `test:auth:browser` remain available. The customer CDP output honors `NOVAIR_TEST_OUTPUT`, so full management runs never overwrite Prompt 05 images. Conventional Playwright output stays scoped to `test-results/playwright`.

No dependencies or network retries were needed. Optional Prettier/Vitest were not executed or claimed. Standard Next/Playwright child launch remains restricted; the supported build/start and real CDP path is used without permission changes. The complete lockfile/previous script-disabled isolated installation remains preserved; fresh online audit/ordinary lifecycle installation, independent security review, other engines, manual screen-reader and deployed TLS remain release work. No Lighthouse score is claimed. All work is local.

---

## Historical Prompt 05 verification

Current phase: **Prompt 05 — customer requests**, local verification on 2026-10-24. Prior results are preserved under `docs/history`, including [Prompt 04 completed testing](history/PROMPT04_COMPLETED_TESTING.md). Historical failures/results and artifacts are not relabelled as current passes.

## Final executed checks

| Check | Actual result |
| --- | --- |
| `npm run build:local` | PASS: production webpack compilation, TypeScript, page generation and traces |
| Post-build `typecheck` / `lint` | PASS / PASS, zero warnings |
| `npm test` | **20/20 PASS**: 16 previous native scenarios + 4 request-contract/domain tests |
| Real MySQL authentication/security | **20/20 PASS**, existing suite |
| Foundation/negative-access HTTP | **12/12 PASS**, existing 7 + 5 scenarios |
| New real request/MySQL integration | **21/21 PASS** |
| Shared landing/account CDP | **51/51 PASS** |
| Authentication/dashboard CDP | **10/10 PASS** |
| New request workflow CDP | **13/13 PASS** |
| Database | Connection, 15 models, real migration ledger, Persian storage/defaults/history/rollback PASS |
| Migration | Additive third migration applied; zero-pending reruns and Prisma validation PASS; old SQL hashes/live counts preserved |
| Public-content integration | All **5 PASS groups**, actual isolated MySQL publication/fallback queries; fixture DB removed |
| Axe | **61 configurations**, zero detected violations; no certification claimed |
| Owned verification harness | Full `verify-requests.ps1 -Browser` PASS, including actual administrator bootstrap, all backend/browser suites and checked cleanup |

**147 unique native/HTTP/browser scenarios** passed (20 + 20 + 12 + 21 + 51 + 10 + 13), plus separate database verification groups. Repeated runs are not additional unique coverage. Optional Prettier/Vitest are absent and not claimed as executed; Node native tests, ESLint and manual formatting review remain the documented workflow.

## Commands

```powershell
npm run build:local
npm run typecheck
npm run lint
npm test
npm run db:check
npm run db:verify
npm run test:content-db
npm run test:requests:browser
```

Build/typecheck must run sequentially because Next regenerates `.next/types`. Stop running servers before rebuilding to avoid stale asset hashes. `build:local` uses supported Next in-process webpack/TypeScript API and worker threads; compilation/types/prerendering remain enabled and no permission control is changed. Standard Next dev/build child workers and conventional Playwright workers remain restricted here; no unchanged retry or new package download was attempted. This is a local build, not deployment.

`test:requests` runs backend suites without browsers. `powershell -NoProfile -File scripts/verify-requests.ps1 -Browser -RequestsOnly` targets new request suites for iteration; **it is not the accepted complete-regression gate**. `test:auth:browser` remains available for the auth subset. Full acceptance uses all suites above.

## Database isolation and preservation

The request harness reuses the proven nonce-owned MySQL fixture setup. It creates a random `novair_auth_test_<hex>` database using actual checked-in DDL, private random test credentials/secret, and a separate loopback server on port 3100. It refuses occupied ports/existing contexts. Bootstrap creates a real test ADMIN and reruns unchanged. Only the owned fixture server receives the isolated database URL; the live application retains its existing configured database user. Local root privileges are used for fixture DDL and never exposed through browser/API responses.

Cleanup stops only the owned server, verifies the database marker/name and unchanged live users/sessions/content/**requests/history/projects** counts, drops only its own database and removes the private fixture configuration. Final cleanup passed. No fixture customer/request/history was inserted into the live application. Rolled-back schema verification records never become real business records. Original migration SQL hashes and live account/content/business counts were independently compared before/after the phase. No reset, business deletion or released migration rewrite occurred.

The third additive migration is exercised both through the real application migration ledger and fresh isolated DDL; fixture tests do not fabricate a migration ledger. Existing legacy budget/deadline records remain readable; no creation history is backfilled fictionally.

## Request security/integration coverage

The 21 new scenarios exercise actual Next HTTP, maintained sessions, Prisma and MySQL: persisted NEW creation plus attributed atomic event; anonymous/forged/ADMIN denial; strict required/length/category/preference/control-character validation; owner/role/status/service/ID injection; unsafe URL rejection; normalized replay; eight concurrent identical keys; changed-payload conflict and real result recovery; same key scoped to different owners; distinct legitimate keys; cross-account IDs/list/helper access; parameter manipulation and forbidden mutations; deterministic pagination/filtering/owned summary; actual ordered history/actor DTOs; honest legacy history; forced history-write failure with rollback/safe same-key retry; concurrent five-operation budgets; committed retries during exhaustion/counter failure; CSRF/media/body limits; expiry/disabled/revoked accounts; escaped server rendering/no-store; and unavailable request storage with generic 503 responses.

The history fault uses a real temporary CHECK constraint over existing history primary IDs, permitting existing data but rejecting the next history INSERT. MySQL disallows the earlier attempted FK-column CHECK fixture; the final test uses valid DDL, without dropping referential integrity. Every renamed table/temporary constraint is restored in finally. Fixture status transitions are explicit isolated test data, not a public administrator feature.

Existing auth tests retain registration race, password/role escalation, persistent cookies, login errors, CSRF, revocation, fresh-session password change, transactional rotation failure, disabled/expired sessions, real bootstrap/admin login and database rate limiting. Existing HTTP/private/RSC/negative mutation checks remain active. Obsolete availability assertions were updated to the actual enabled request feature; their prior exact sources are preserved as non-executable `.txt` snapshots in `tests/history/prompt04-completed`.

## Functional browser coverage

Chromium **155.0.8059.85**, Playwright **1.64.1**, axe-core **4.14.0**, approved existing local CDP. Tests use `noDefaults: true`, own isolated contexts and a validated loopback endpoint, then disconnect. No user tab is navigated/closed, browser downloaded or application security policy weakened.

The thirteen request scenarios cover visitor CTA → login/register → real form, safe destination continuity, real double-submit prevention/confirmation/list/detail/history, client/server validation/focus, lost response **after actual commit** and same-key retry/reload recovery, distinct new forms, actual pagination/filter/summary, cross-account/forged-cookie denial, expired-session draft retention and real new-tab login, explicit cross-tab logout clearing private draft access, actual storage failure without optimistic success, safe read-error boundary/retry after restoration, ADMIN CTA/403 separation, real rate-limit feedback, and full both-theme layout matrices.

One browser check found that boundary `reset()` alone replayed a failed Server Component result after database restoration. The real retry now reloads the document; its storage-fault/restoration test passed. Auth event handling deliberately distinguishes explicit signout (clear private draft access) from same-account reauthentication (preserve live inputs); neither event authorizes data access.

A final-stage CDP reconnect attempt timed out before the auth suite ran; the failed result is retained in `browser-auth-cdp-timeout.tap`. Initializing one new background isolated verification context through the available Chrome tool restored the local transport, after which the complete suites ran. No timeout, assertion, axe rule or authorization was relaxed. Earlier retry-boundary failure is retained in `browser-requests-before-retry-fix.tap`. A successful CDP run does not imply the conventional Playwright worker launcher works.

## Responsive, axe and visual review

At **320, 375, 430, 768, 1024, 1440, 1920px**, both themes pass no-overflow and 200% root text checks for request form, empty list, confirmation, list, detail and owned dashboard summary. Existing public/auth/private layouts/theme storage, mobile menus, keyboard navigation, landscape behavior and reduced motion are also rerun. Long Persian titles and mixed-direction IDs/URLs are covered.

The 61 completed axe configurations are 34 preserved public/auth/private states plus 27 request states (24 matrix views, two validation themes and real rate-limit feedback). Tests use the actual installed axe engine in real pages through the existing helper; no rules are disabled and no static HTML inspection is substituted. Zero detections are not complete WCAG, screen-reader or cross-browser certification.

Current `test-results/prompt05` includes **97 screenshots**: 40 shared landing/account, 18 auth/dashboard and 39 new request captures, including normal phone/desktop, 200% text and error states. Representative phone/desktop/theme/confirmation/list/detail/empty/error/text-size captures were opened for visual inspection. Not every capture is separately inspected; no new Lighthouse/Core Web Vitals score is claimed.

Prompt 01–04 artifacts/results remain separate and unmodified. Historical Prompt 02/03 raw-image loss remains documented in archived reports; new images are not presented as restored history. **Keep conventional Playwright output scoped to `test-results/playwright`**, never its parent directory. Optional formatter/Vitest, fresh lifecycle-enabled online installation/advisory audit, manual assistive-technology review and other-engine verification remain release/environment limitations.

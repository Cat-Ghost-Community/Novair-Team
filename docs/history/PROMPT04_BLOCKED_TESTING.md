# Testing

Actual executed results belong in `IMPLEMENTATION_STATUS.md`. A configured command is not evidence of a passing check.

## Quality gates

Current policy: TypeScript, ESLint, production build, essential security tests, database integrity tests and functional browser checks remain mandatory. Prettier/Vitest are optional tools; their absence does not block when the applicable checks run through documented alternatives. No formatter-equivalence claim is made for manual review/ESLint. Root lockfile/clean-install verification remains a release requirement; do not retry unchanged offline installation failures in every prompt. Earlier blocked-tool results below remain historical facts, not current development-policy requirements.

```sh
npm run db:generate
npm run build
npm run typecheck
npm run lint
npm run test:node
npm run test:http
npm run test:auth-closed
npm run test:smoke:cdp
npm run db:check
npm run db:verify
```

Use the standard Playwright runner when worker launching works; CDP remains a real browser alternative. `npm test` (Vitest) and `npm run format:check` (Prettier) can be used when installed; neither is retried as a prerequisite in the known blocked sandbox.

Prisma generation precedes type checking because types reflect the local schema. `db:migrate` applies versioned migrations; rerun it to verify idempotency. `db:verify` reads all 14 models and the migration ledger, checks a Persian string round-trip and default ownership/status in a transaction, and intentionally rolls it back. It does not seed the application. Connectivity or a parsed URL alone is not migration verification.

Run build and typecheck sequentially. A parallel run can race with removal/regeneration of `.next/types`; the standalone post-build typecheck is the relevant gate. Use `db:init:windows` where Node cannot spawn the Prisma engine. In this sandbox also run `test:node`, `test:http` and `test:smoke:cdp` for the verified fallback paths described below.

## Unit scenarios

The current `test:node` additionally runs four workflow-policy tests in `dependency-workflow.test.mjs`, alongside the unchanged twelve security/content/contrast cases: **16 native scenarios** total. The new metadata fixtures verify optional tools and release debt do not block development, while missing auth/adapter or required framework mismatch still do. They do not simulate users/sessions or count as authentication integration tests. The original twelve remain registered in the optional Vitest suite; the extra workflow tests are Node-only.

The workflow-update run executed all sixteen successfully, plus production build, post-build typecheck, ESLint, seven existing HTTP and five blocked-auth HTTP cases, and `db:verify`. A stale running server initially referenced a pre-build CSS hash; refresh/start against the completed build resolved that asset test without changing assertions. The helper's PowerShell AST and both plan-only modes passed; its installation branch was not executed. Browser UI was unchanged and the existing CDP gap was not retried as an unrelated gate; that gap remains documented and actual functional browser/auth checks are still mandatory before acceptance.

The same twelve scenarios are registered under Vitest (`npm test`) and Node 24's test runner (`npm run test:node`). The original eight remain unchanged: six cover salted password hashing/mismatch, malformed encodings and bounds, denied role combinations, hostile return paths, local MySQL configuration and Persian identity validation; two compute contrast for actual light/dark CSS token pairs (normal text >=4.5:1; focus/control boundaries >=3:1). Prompt 03 adds public URL policy, local/private address rejection, raster image key confinement and editorial FAQ integrity. These checks do not replace a rendered accessibility review. The Node runner uses no child-process isolation to accommodate this sandbox. Twelve native tests passed; this is not an executed Vitest run.

## HTTP smoke checks

Start the local production server, then run `npm run test:http`. Seven native Node tests verify actual HTML, all ten private-route redirects with forged credentials, inactive auth endpoints, Persian 404, security/indexing headers, locally served JS/CSS/WOFF2 and current server-rendered public sections with no-store response behavior. The original six checks remain. These tests do not exercise client-side theme state, focus traps, rendered geometry or assistive technologies.

## Real public-content database verification

```sh
npm run test:content-db
```

This additional local integration command needs the setup-created `MYSQL_ROOT_PASSWORD` in ignored `.env`; it never uses root in the app server. It validates the configured local MySQL origin, creates a random `novair_content_test_<12 hex characters>` database, applies both real checked-in migrations as DDL and tests the actual public query functions. It creates no fake migration ledger. Fixtures stay in that isolated database, which is removed in `finally`; configured app portfolio/FAQ counts are checked unchanged. The SQL splitter supports the current simple DDL only; revisit it if migrations acquire routines or embedded semicolons.

Five PASS groups were executed: migrated empty/editorial state; published filtering, deterministic order, optional category/missing image, safe URLs and public DTO fields; next-read unpublish freshness; managed FAQs replacing the editorial set and restoring it after unpublish; actual refused database connection with safe fallbacks. These are fixture-based query/integration tests, not fabricated public portfolio records. Database failure is tested with a separate client, without interrupting the running application database. `db:verify` separately checks the real application's Prisma migration ledger.

## Browser smoke coverage

Playwright targets Chromium against the local production build. Build first. It can start its own server; a server already running at the same loopback origin may be reused locally. CI refuses `.only` and never reuses a server.

Coverage includes Persian document/RTL, local-only requests, no browser/hydration errors, first-visit light despite dark OS, persistent explicit theme choice across navigation/reload, blocked storage, skip link, dialog keyboard/focus behavior, all protected routes with forged cookies, honest authentication states, 404, indexing/security headers and reduced motion.

Prompt 02 adds complete navigation destination checks, truthful project-access behavior, mobile-menu open/close/Escape/focus/backdrop/desktop resize, landscape scrolling, cross-tab themes, and a deterministic storage change before delayed hydration completes. Hover and visible keyboard focus plus studio-dialog accessibility are checked in both themes.

Prompt 03 adds real services/portfolio empty state, all seven homepage sections, truthful final CTA, cross-route anchors/back history, mobile close-on-process navigation and four expanded FAQ keyboard/axe configurations (375/1440, both themes). A delayed-JavaScript case asserts FAQ buttons are disabled before handlers and function after hydration; it was added after an early keyboard event exposed a real readiness defect. No original scenario was removed or weakened.

Layout is checked at 320, 375, 430, 768, 1024, 1440 and 1920px in both themes; no horizontal overflow and minimum 44px control heights. New expanded FAQ/timeline checks increase root text to 200% at all seven widths and both themes; the prior five-width checks remain. This simulates larger text, rather than claiming every browser-native zoom mode. Short landscape is 768×375. Axe WCAG A/AA/2.1 runs total twelve configurations: original eight home/menu/dialog checks plus the four expanded FAQ cases. Zero violations were detected in the successful full run. This is not a complete accessibility audit, screen-reader test or cross-browser certification.

## Verified local CDP recovery

```sh
# Build first, then start the local server in another terminal.
npm run test:smoke:cdp
```

`tests/cdp/foundation.test.mjs` uses the same `tests/shared/browser-cases.ts` as the conventional Playwright runner. Node runs without worker isolation while Playwright connects directly to an available loopback browser WebSocket endpoint. Every scenario receives a new browser context and real page/request fixtures. Contexts are closed after use; browser close disconnects this CDP client. No existing user tab or session is used. This is real Playwright browser automation, not static HTML substitution.

Set `NOVAIR_CDP_URL` explicitly if needed. On Windows the runner can read the already-enabled Chrome `DevToolsActivePort` file. Endpoint validation allows only local `ws:`/`http:` origins. The runner never enables remote debugging or launches a process. Conventional CI with normal subprocess permissions should use `npm run test:smoke` instead.

Prompt 02 executed **36 passing steps** (35 browser scenarios plus artifact capture) in Chromium 155.0.8059.85. That phase wrote 14 theme/width screenshots and resource/geometry JSON under ignored `test-results/prompt02`. Representative light/dark phone, tablet and desktop results were visually inspected. Browser capture resource transfer sizes can be cache-dependent; they are not a cold-load payload measurement. Those historical files were later lost in the prompt 04 cleanup incident recorded below.

Prompt 03 executed **46 passing steps** (45 shared scenarios plus capture). That phase wrote to `test-results/prompt03`: 14 full-page screenshots, 12 services/FAQ/CTA crops at 375/1440 and 2 mobile CTA captures at 200% root text. Representative light/dark mobile, tablet and desktop images were opened and inspected. Capture explicitly waits for the last section and FAQ readiness before fonts/screenshot: dynamic server streaming otherwise occasionally produced a loading-boundary image, which was found during inspection and corrected. Section captures simplify review of tall pages. The script saves geometry/resource JSON alongside images. The prompt 04 artifact-loss note below explains why those historical files are no longer available.

CDP handshake occasionally timed out before tests began. Activating a new isolated local page with the available Chrome connector, then directly invoking `node --test --test-isolation=none tests/cdp/foundation.test.mjs`, restored the actual connection. This did not launch a process, change restrictions or reuse account tabs. Do not convert a connection timeout into a browser pass or remove scenarios. Successful full-run results and final capture artifacts are recorded separately in the status document.

## Local performance observations

Chrome DevTools traces recorded cache-bypassed navigation at desktop 1440×1000 (CPU 1×, no network throttle) and mobile 375×812 (CPU 4×, Slow 4G), both with reduced motion. The final samples were collected separately from browser test execution. Observed LCP was 171ms/1,695ms and CLS 0.0003/0.0169 respectively. No final navigation-only INP, Lighthouse performance score, field percentile or device guarantee is claimed. Returned trace summaries and insight analysis were available; the connector rejected raw-file export to this workspace. A local summary artifact and the status document record the values and limitations.

Those are preserved prompt 02 observations. Prompt 03 used the same viewport/throttle/cache/motion settings and Chromium version, with browser tests stopped: final-source LCP 218ms desktop / 1,933ms mobile; TTFB 17ms / 12ms. Scheduling/warmth can vary, so these single samples are not a controlled statistical comparison. An earlier 2,363ms mobile observation was investigated with RenderBlocking/LCP/CLS insights; keeping all section shells outside async content boundaries removed the whole-page database wait while preserving hash navigation. An intermediate 1,711ms observation followed a restart (190ms TTFB); it is not presented as the final-source measurement. The final trace identifies local font swap as a contributor to mobile CLS 0.0169; desktop summary reports 0.00. CSS remains render-blocking, and the final mobile LCP sample is 238ms above prompt 02; no unmeasured byte-budget or guaranteed speed claim masks that difference. No compatibility/font rewrite was made solely to chase a score. No navigation-only INP or Lighthouse score is claimed.

The prompt 03 observed homepage entry chunk was about 2.8KB raw / 1.35KB computed gzip. No new package was installed in that phase. A diagnostic mapped actual completed-capture JS resource paths to built files, excluding non-requested nomodule scripts; its computed gzip sizes were not network transfer measurements. Captures can include login-link prefetches. Since prompt 02 lacks a complete cold-load byte baseline, an exact client byte increase is unverified. Prompt 04 does not claim a new bundle or performance trace measurement.

## Prompt 04 blocked-stage checks

Authentication was not enabled because the dependency gate failed. Run the read-only inventory with `npm run auth:inspect`; **BLOCKED / exit 1 is the expected current result**, not a successful auth acceptance check. It does not verify advisory ranges, transitive package integrity, session behavior or clean-install reproducibility. Missing library/adapter and root lockfile are recorded in `AUTHENTICATION.md`.

`npm run test:auth-closed` adds five native HTTP tests without replacing the existing seven. It checks planned auth endpoints remain absent and issue no cookies, forged credentials/headers on private RSC requests, private POST destinations, hostile login return parameters and unavailable recovery copy. These test denial/absence boundaries only. They do not count as real sign-up/login/password-change/session/RBAC/rate-limit tests.

The shared browser set adds four account-preparation scenarios: unavailable pages at seven widths/both themes and 200% root text, keyboard/history/theme navigation, and mobile menu focus restoration. Eight new axe configurations cover login/register at 375/1440 in both themes, in addition to the prior twelve. There are no authenticated dashboards or functioning credential forms to inspect. Standard worker spawning was attempted again and failed with `spawn EPERM` before its selected scenario ran; successful CDP execution is a separate workflow.

A repeated run found the existing FAQ entrance's 0.4-to-1 opacity animation could briefly reduce text contrast while axe inspected it. The text fade was removed, retaining only the short translation and reduced-motion behavior. The test/assertions were not weakened or given a delay to hide the contrast defect. Earlier passing runs did not prove that transient state was safe.

The current CDP capture directory is `test-results/prompt04`. It keeps the 28 homepage captures and adds eight account-access phone/desktop screenshots plus four 200% account-panel crops. Current-source final results and actual visual review are recorded in `IMPLEMENTATION_STATUS.md`.

After the FAQ contrast fix, the latest full run completed **50 passing cases and one infrastructure failure**: axe could not open its auxiliary page in the dark account-page context because that context had closed. Existing landing checks and the other new cases passed. An isolated retry failed at the CDP handshake after 10 seconds. Therefore a clean final 51/51 pass and completed final dark account-page axe matrix are **not** claimed. The completed final scenarios verify sixteen axe configurations with zero detected violations; the remaining dark-account coverage is an explicit gap. Both account matrices had passed before the FAQ-only CSS change, but that does not turn the final failed run into a pass. Captures still completed and representative current-source images were inspected.

**Artifact incident:** the conventional Playwright runner cleaned its default `test-results` directory before failing to spawn. This removed ignored historical prompt 02/03 image/measurement files and the first prompt 04 output. It did not delete source, database data, migrations or history documents. Configuration now scopes `outputDir` to `test-results/playwright`; do not restore the parent as its output directory. A repeat failed worker launch verified a phase marker and all 40 current screenshots survived cleanup. Current phase screenshots/results are regenerated, not passed off as historical screenshots. Previous verification counts and performance observations remain recorded in archived status documents, but lost historical raw image files are unavailable.

## Prior constraints and current dependency recovery

This environment starts with npm offline, a non-running Docker engine and restricted child processes. Do not bypass network controls. Local MySQL binaries and `db:init:windows` remain the verified database paths. Vitest and Prettier are still absent; targeted offline retrieval returned `ENOTCACHED`, so their gates remain incomplete. Playwright workers and Next dev still fail with `spawn EPERM`, while browser actions/axe now pass through the existing local CDP endpoint. The historical prompt 01 browser failures are preserved in `history/PROMPT01_STATUS.md`; current success must not overwrite those records. Local production build/start works. Never mark an unexecuted check as passing.

Prompt 03 retried dependency/lock recovery and targeted offline Prettier/Vitest retrieval once, with unchanged `ENOTCACHED` failures. Actual `format:check` and `npm test` could not find their commands. No lockfile was fabricated and no gate waived. The previous worker/dev subprocess failures remain historical constraints; the current successful runtime is build/start. Full prompt 02 results are archived in `history/PROMPT02_STATUS.md`.

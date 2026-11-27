# NovAir V1 final release qualification

Date: 2026-10-24. **CONDITIONALLY READY — DEPLOYMENT BLOCKED.**

The complete local product is functional and the final local business/security gates pass after two targeted repairs. Public deployment is **not authorized, performed or certified**. Mandatory account-lifecycle, installation, target-host, production-configuration, HTTPS/ingress and owner-policy prerequisites remain BLOCKED. A successful local production build does not close those gates.

## Exact baseline and recovery

There is no `.git` repository in this workspace; `git status` actually failed for that reason. No commit or clean Git status is invented. A non-overwriting recoverable source checkpoint was created at `.local-tools/prompt10-checkpoint` before substantive changes: src/scripts/tests/prisma/public/docs plus manifests, lock and configuration. `.env`, data directories and credentials are deliberately excluded. `test-results/prompt10/baseline.json` records initial runtime/tool versions, six released SQL hashes, and all 23 original model scalar/count hashes. Original source and historical evidence remain present.

The exact final Next BUILD_ID, source fingerprint, package/lock/config/schema/migration hashes and executed gate totals are in `test-results/prompt10/verification-summary.json`. `npm run release:check` checks those bindings and exits 2 while release blockers remain; a changed build/source or missing evidence also fails closed. This is an evidence consistency check, not a production-approval flag.

Current stack: Next 16.4.2, React/ReactDOM 19.3.1, TypeScript 5.9.3, Prisma CLI/client 6.19.3, Better Auth/official adapter 1.7.12, local native MySQL 9.5.0, Node 24.16.0, npm 10.2.5. No dependency was added/upgraded; package scripts changed only. Original six migration files/checksums are unchanged; no seventh migration was required. Local MySQL uses utf8mb4_unicode_ci, lower_case_table_names=1 and default REPEATABLE-READ; domain transactions retain their explicitly documented isolation/locking rules.

Restore the checkpoint only after stopping owned processes, reviewing later work and copying the selected files deliberately; never bulk-delete/reset the workspace or replace the live database. The checkpoint is source recovery, not an active-data backup. Actual disposable DB backup/restore qualification is described below.

## Delivered feature inventory

- Complete original Persian public landing, local Vazirmatn, original SVG identity, RTL, theme persistence, responsive navigation/FAQ, truthful empty portfolio and factual content.
- Maintained real authentication, versioned scrypt callbacks shared with controlled local bootstrap, seven-day opaque signed-cookie/database sessions, current enabled roles, safe returns, password rotation/revocation and honest unverified-email limitations.
- USER requests with strict contracts, server-derived owner, durable owner/key/hash replay, atomic initial history, own list/details/status tracking.
- ADMIN request review, decline explanation separated from private notes, accepted-request conversion with unique origin, legal project states, schedules/eligible assignment, version conflict handling and actual audit/history.
- Customer-owned read-only project DTOs/timeline/origin links and real personalized summaries; no private description, assignment contact, audit or fabricated progress.
- Real text support with owned optional project linking, replies, explicit close/reopen, shared-support versus personal-customer read watermarks, paginated messages, separate private notes and transactional retry/concurrency guarantees.
- Integrated ADMIN services/portfolio/FAQ/settings CMS: narrow public DTOs, private drafts/preview/audits, canonical category stability, safe static image catalog, explicit fallback policy, committed publish/unpublish freshness and operation recovery.

No upload/attachment pipeline, payment, blog, arbitrary HTML, automated email/notification or real-time chat was introduced. ADMIN user-editing remains an explicitly unavailable reserved tool, not a claimed delivered account-management console. No invented live customers/projects/portfolio/contacts were inserted.

## Defect register and remediation

| ID | Severity | Reproduced behavior | Resolution / evidence | Final outcome |
| --- | --- | --- | --- | --- |
| SEC-10-01 | P2 | Registration/bootstrap display names accepted C0/C1 controls and bidi overrides, unlike business text contracts | Shared NFC-normalized bounded name validator rejects controls/overrides, preserves ZWNJ; native unit + real HTTP/no-persistence/no-rate-side-effect + browser field-focus tests | PASS, fixed |
| REL-10-02 | P2 | A 320-character Persian URL became 1,820 characters after percent encoding and exceeded ProjectRequest.relevantUrl VARCHAR(1000) | Enforce canonicalized storage length as well as original length; HTTP 400 associated field error/no partial request/history, valid short Persian path persists | PASS, fixed |
| OPS-10-03 | P2 qualification tooling | SHOW CREATE TABLE prepared metadata returned f0/f1, .NET Framework lacked StandardInputEncoding, dump restated inherited charsets, raw database metadata used BigInt | Correct real metadata handling, write exact UTF-8 bytes through stdin, compare exact model hashes/source DDL plus narrowly normalized redundant charset spelling, safe JSON metadata serialization. Retained initial failures; full fresh backup qualifier and runtime measurement reran successfully | PASS, fixed |
| GATE-EMAIL | P1 release prerequisite | No verified sender/provider/test mailbox; address ownership and public recovery are absent | Option C selected; public launch blocked, no fake provider/endpoints. Operator action below | BLOCKED |
| GATE-HOST | P1 release prerequisite | No actual cPanel/runtime/TLS/private ingress evidence; local-only configuration cannot qualify remote deployment | Capability/runbook and production-policy acceptance requirements provided, safeguards retained | BLOCKED |
| GATE-INSTALL | P1 release prerequisite | Fresh npm advisory failed at approved proxy; normal lifecycle ci failed subprocess spawn | Isolated failures retained; exact-lock operator qualifier supplied; working dependencies unchanged | BLOCKED |
| CSP-NONCE | P3 documented improvement | Framework bootstrap/theme/style currently use deliberate inline CSP allowances; no untrusted HTML injection exists | Retain escaping/strict input/no-HTML boundary; consider nonce policy during the qualified production profile, with actual browser tests | NOT APPLICABLE to this targeted local repair; residual hardening item |

No open demonstrated local P0/P1 code/data-integrity defect was found in the executed scope. This is not an exhaustive security certification and does not waive the P1 release prerequisites.

## Fresh automated evidence

All following executions occurred during Prompt 10; Prompt 09 figures are not reused as final-stage passes.

| Executed suite | Passed |
| --- | --- |
| Native Node | 32 |
| Maintained auth/security | 20 |
| HTTP regressions | 12 |
| Customer requests | 21 |
| ADMIN request/project management | 29 |
| Customer projects | 17 |
| Support tickets | 38 |
| CMS | 45 |
| New final-release integration | 7 |
| **Total unique Node scenarios** | **221** |

Production build, strict TypeScript, ESLint with zero warnings, 23-model DB verification, real bootstrap/create+idempotent rerun, fresh six-migration replay with legacy/FK/unique/rollback and zero-pending live migration rerun passed. The seven new cases ran again after strengthening bundle scanning to include both fixture and actual build-environment private values; repetitions are not added to 221. Final fast checks and post-restart read-only HTTP smoke are separate artifacts.

Retained suites actively cover malformed/unknown/owner/role/status fields, forged/expired/revoked/disabled/current-role sessions, registration races, password/session rollback, source/identity rate concurrency, request retry/hash differences, two-ADMIN decisions/conversion/edits, assignment/date/state validation, request/project/ticket/customer isolation, real history/audit/operation/limiter storage failures, ticket close/reply/read-watermark races, changed committed payload conflicts, actual XSS escaping, draft/public and private canaries in JSON/HTML/genuine RSC, trusted images and snapshot publication correctness. The new end-to-end integration traverses request → review → accept → concurrent same-key conversion → customer project → execution update → owned support/read/close/reopen → draft/publish/unpublish → logout. It checks persisted invariants, not only response codes.

New HTTPS-cookie testing uses the actual maintained library/MySQL with an HTTPS canonical configuration: Secure, __Secure- prefix, HttpOnly, SameSite=Lax, Path=/, no Domain and unsafe-origin rejection passed. This is **configuration behavior**, not an actual TLS connection/ingress pass.

## Browser, visual and accessibility evidence

Authorized Chrome DevTools MCP ran **17 genuine functional groups** using real sessions/MySQL. Native account/request/review/accept/conversion/support/FAQ editor/password/logout controls were exercised; selected project-status/private-note/second-account checks used real same-origin browser APIs, explicitly not mocked UI or a Playwright-runner pass. The complete narrative and scope are in `browser-evidence.json`.

**350 qualified axe executions** cover 25 actual loaded views × seven widths × both themes, with RTL/reduced-motion and normal/200% root-text overflow checks. Every qualified row includes the real H1, actual width/theme and zero violations. A preliminary 84-row inspection lacked explicit loaded-view identity and is preserved as provisional, excluded from acceptance totals. Error-document replacement interrupted a separate error-state matrix by removing the injected test engine; those interrupted cases are unverified, not passed. Actual safe storage error, rendered capture and real native fresh-read retry after restoration did pass. No axe rule or assertion was disabled.

**Fourteen** fresh screenshots were actually returned and viewed; final exact file count/digests/inspection flags are in `screenshot-manifest.json`. They include mobile/desktop Light/Dark landing, real loading, project, empty dashboard, support overview and actual messages, CMS settings, safe storage error, 200% registration and actual password-result feedback. An initial capture caught a real transient loading screen; it is correctly named loading-mobile-light and was not substituted for project visual inspection. A subsequent actual project capture was inspected. No severe new visual defect was observed in these representative views; not every matrix configuration has a separate image.

Firefox and WebKit binaries are present, but each official launcher actually failed once with `spawn EPERM`; `cross-engine.json` records BLOCKED. No browser security policy was bypassed. The 95 preserved direct Playwright cases remain unexecuted through their unchanged blocked transport. Manual screen-reader, physical-device and complete cross-engine qualification were not executed. Automated zero findings do not certify WCAG conformance.

## Performance and stability evidence

Fresh Prompt 10 baseline Chrome navigation traces on the preserved public landing (public UI source is unchanged by the input fixes):

| Environment/method | LCP | CLS | TTFB |
| --- | --- | --- | --- |
| Desktop, loopback, 1× CPU, no network throttle, HTTP cache bypass | 106 ms | 0.00 | 14 ms |
| 375×812 mobile emulation, 4× CPU slowdown, Slow 4G, cache bypass | 2,037 ms | 0.02 | 14 ms |

No field CWV/CrUX, INP or Lighthouse performance score is claimed. The mobile trace estimated 540 ms possible CSS render-blocking savings; desktop estimated zero. No broad CSS/architecture rewrite was justified by this bounded lab observation. The small legacy-polyfill estimate is not treated as a release defect. Fonts/assets remained local.

An actual post-build Lighthouse **desktop navigation** reported Accessibility 100, Best Practices 100, SEO 66, Agentic Browsing 100: 52 passed/one failed audit. The failed audit is intentional local noindex. It excluded performance scoring. One preceding attempt overlapped the deliberate server stop/build and produced an interstitial; it is retained separately, not a site audit pass. The trace's requested workspace file export was denied; no policy bypass was attempted and tool-returned measurement evidence is retained.

Real warm sequential full-response timings (ten samples/route, loopback, actual maintained sessions and nonce-owned MySQL; not load/host-capacity certification): public p50/p95 12.15/19.59 ms, customer dashboard 18.78/19.84 ms, ADMIN dashboard 23.23/29.26 ms; bounded requests/projects/tickets/CMS APIs p95 5.46/5.44/5.86/6.15 ms. Method/server details are in runtime-measurements.json. The first metadata report encountered BigInt JSON serialization and was corrected/repeated; the failed log remains. A controlled local production-server restart and fresh HTTP checks passed without changing original data. Sustained load, process-leak/soak testing, actual host memory/connection limits and multiple-host capacity remain unverified.

## Dependency/advisory/install gate

The complete lock has **523 official npm registry entries with integrity**, exact direct installed versions and successfully imported maintained auth/adapter exports; dependency maps match. No package update, force/legacy-peer-deps, proxy/TLS change or dependency-tree replacement occurred.

A fresh npm production audit was actually attempted once using a command-scoped offline=false override and official registry. It failed `ECONNREFUSED 127.0.0.1:9`, the configured approved proxy. This is **not a clean audit**. An isolated lifecycle-enabled exact-lock offline npm ci actually reached lifecycle execution and failed spawn EPERM. This is **not a completed normal installation**. Working node_modules was never replaced. Earlier script-disabled installation remains historical evidence only.

Selective official source review on 2026-10-24 confirmed the [Better Auth OAuth/magic-link advisory](https://github.com/better-auth/better-auth/security/advisories/GHSA-965c-763c-88jm) affects versions below 1.7.7 (installed 1.7.12; those plugins not enabled), and [Next Server Actions DoS advisory](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r) is patched in 16.4.1 (installed 16.4.2). The [image-optimizer advisory](https://github.com/vercel/next.js/security/advisories/GHSA-cjq9-62q9-8jv4) explicitly excludes apps without remotePatterns; this application uses only its constrained local catalog. This limited review does not enumerate or certify all direct/transitive/dev advisories.

Operator action: use the supplied `npm run release:install:qualify` on an approved normal PowerShell environment. It performs fresh full audit, normal exact-lock install/lifecycle, Prisma generation, normal production build and isolated start/read-only smoke without promoting dependencies or altering global configuration. Review any findings by affected runtime exposure and maintained compatible patch; do not blindly audit-fix. Then rerun regression against any justified change and qualify on the actual target platform.

## Backup, maintenance and integrity

The full fresh native qualifier passed end to end: consistent InnoDB mysqldump → authenticated AES-256-GCM fixture backup → rejected tampering → new isolated MySQL restore → all 23 exact scalar/count hashes and semantic schema constraints/indexes/FKs/CHECKs → real restored production application ADMIN/USER login/project/ticket/CMS reads/logout → guarded destination/private-key/config/plaintext cleanup. Only redundant explicit inherited utf8mb4 charset spelling is normalized for DDL comparison; original source raw schema and all data hashes remained exact. Encrypted fixture-only evidence remains private; no active app data/secrets archive was created. Initial qualifier failures and exact empty-destination recovery are retained, not hidden. The final normal whole-command rerun exited 0.

The actual cleanup service test proves expired Session/Verification/RateLimit removal while active rows/users/passwords/business/committed ledgers remain. The actual CLI also executed on the isolated DB (zero expired sessions, 20 expired rate windows, zero expired verifications at that instant). No operation/history retention purge or external scheduler was added.

The application dataset's original **23-model scalar/count hashes and all six migration checksums** remain unchanged. Fixture/context ownership guards and exact-target cleanup passed; browser credential files and restore keys/config/plaintext were removed. Earlier artifacts/screenshots/migrations were never deleted. Target-specific encrypted off-host backup, separate key custody, restore scheduling, retention, RPO/RTO and rollback authorization remain operator/host gates.

## Email, privacy and production decisions

**Option C: keep public launch BLOCKED.** There is no supplied authorized verified sender, delivery provider credential or test mailbox. AccountEmailProvider is a preparation interface only; real email ownership verification and public password-recovery delivery are absent. Unsupported endpoints remain absent, registration creates unverified accounts and UI discloses the limitation. No fake queue/sender, invitation mode or administrator reset substitute was introduced.

To unblock: choose/authorize a maintained transactional provider, verify sender/domain/mailbox, implement documented library verification/recovery hooks and narrow endpoints, single-use bounded-expiry tokens, non-enumeration/rates/origin rules, delivery-failure retries and reset-session revocation, then execute real provider-backed verification/recovery/replay/expiry/rollback/delivery tests. Do not enable public registration merely by removing local host validation.

Before collecting genuine public customers, the operator must approve and publish accurate identity/contact/privacy information: stored account identity/credential/session metadata, project descriptions, support texts, administrator access, backups/log access, chosen retention, request/export/deletion handling and recovery/contact method. No approved privacy notice/retention/contact policy was supplied; these are BLOCKED owner decisions, not invented legal guarantees. Obtain consent and rights for actual portfolio disclosures/artwork; private managed project data never automatically becomes public. No GDPR or other legal certification is claimed.

## Mandatory remaining blockers and next actions

1. **Email account lifecycle:** authorized provider/sender/test mailbox plus executed verification/recovery suite; option C remains until then.
2. **Dependency reproducibility/security:** successful current full advisory review and normal exact-lock install/generate/build/start evidence on an approved normal host; review compatibility/security before any update.
3. **Actual cPanel/runtime/Prisma/MySQL:** provider must satisfy DEPLOYMENT_READINESS capability table, or choose compatible Node hosting/VPS; demonstrate actual platform operation and backup/restore.
4. **Production profile/origin/TLS/ingress:** current profile deliberately rejects remote origins and keeps noindex/loopback/shared-source limits. Implement/test the approved production profile, trusted source model, cookies/CSRF/Host/proxy and restart under real HTTPS. No actual domain or credentials were supplied.
5. **Operations/privacy:** operator approval of public notice/contact/retention/portfolio consent, separate secret/key storage, host backup/maintenance/monitoring/rollback procedures and protected production administrator provisioning.
6. **Broader qualification:** approved Firefox/WebKit runner, representative assistive-technology/device checks, host sustained-load/resource tests and post-deployment smoke in a separately authorized environment. Preserve the 95 unexecuted direct cases honestly.

Each gate and its PASS/FAIL/BLOCKED/NOT APPLICABLE outcome is enumerated in RELEASE_CHECKLIST.md and machine-readable verification-summary.json. These external/approval prerequisites prevent **READY FOR PRODUCTION DEPLOYMENT**. No critical unresolved local product defect requires selecting NOT READY in the executed scope, so the defensible final decision remains **CONDITIONALLY READY — DEPLOYMENT BLOCKED**.

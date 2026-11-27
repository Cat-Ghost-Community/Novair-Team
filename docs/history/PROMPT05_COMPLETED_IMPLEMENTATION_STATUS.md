# Implementation status

Current stage: **Prompt 05/10 — completed and accepted locally**, 2026-10-24. Customers can submit and securely track actual MySQL-backed requests. The repository is ready for **Prompt 06**. Administrator review/conversion, project execution, tickets, CMS and deployment were not implemented in this phase. This is not complete V1 production-release certification.

## Completed customer workflow

- Real Persian single-page request form at `/dashboard/requests/new`, with nine canonical service categories, required title/description and optional budget/timing/public HTTPS link. Preferences are explicitly not prices or delivery guarantees.
- Server-chosen owner/NEW status/ID, strict shared Zod contracts, bounded JSON/text, exact-origin checks, real session/USER authorization and sanitized failures. ADMIN remains in its separate authorized area.
- Persistent owner-scoped operation key plus normalized SHA-256 payload fingerprint. User-row locking, unique owner/key constraint and transaction enforce concurrent retries, changed-payload conflict, real new operations and atomic creation/history. No optimistic success or content-similarity dedupe.
- Recovery of committed results using the same operation URL after interrupted responses/reload; current inputs survive recoverable errors. Same-account reauthentication can occur in a separate tab without losing the open draft; explicit logout clears private draft access. Uncommitted draft text is intentionally not persisted in localStorage.
- Owned list at `/dashboard/requests` with status filter, ten-item deterministic pagination and useful empty states. Detail at `/dashboard/requests/[id]` displays real preferences/status/dates/safe link and persisted timeline with actor attribution. No cross-account read/mutation is permitted.
- User dashboard shows actual owned totals/status counts and three latest requests. Landing/header/footer/mobile CTAs now reach the real form, retaining safe login/registration return paths. No public landing redesign or authentication rewrite occurred.
- Reusable request form/list/status/timeline/confirmation/summary components and one original lightweight theme-aware `RequestSketch` SVG. Existing Persian RTL/Vazirmatn/palette/theme/security/content infrastructure is preserved.
- Database-backed creation budgets, real loading/error/rate-limit/expiration/network/recovery states and safe read-error retry. Complete isolated regression/security/browser tests and documentation.

## Database decisions

The additive **`202610240003_customer_requests`** migration adds nullable category/preferences/link/submission key/digest fields and separate `ProjectRequestStatusHistory`, bringing the schema to **15 models**. Existing request enum NEW/REVIEWING/ACCEPTED/DECLINED/CANCELLED is reused; managed-project execution states are not mixed in. Existing budget/deadline/service relationships remain compatible and legacy history is not invented.

Unique owner/key, owner/status/date/ID and history/date/ID indexes support consistency/queries. Request and initial event share one transaction; current role/disabled state is rechecked under owner lock. MySQL limiter allows five new operations/user and sixty/shared local-source per ten-minute window; committed retries/recovery do not consume new-creation budgets. Arbitrary forwarding headers are untrusted.

The migration was applied to the actual local ledger, validated against fresh isolated DDL, and rerun with zero pending migrations. Both earlier SQL hashes and all pre-phase live account/content/business counts remain unchanged. No active database reset or persistent test/fake request was introduced.

## Final executed verification

| Gate | Result |
| --- | --- |
| Production `build:local` | PASS, compilation/types/page generation/traces |
| Post-build TypeScript / ESLint | PASS / PASS, zero warnings |
| Native tests | **20/20 PASS** |
| Existing real auth/security | **20/20 PASS** |
| Existing HTTP negative/foundation | **12/12 PASS** |
| New real request integration | **21/21 PASS** |
| Existing shared CDP | **51/51 PASS** |
| Existing auth/dashboard CDP | **10/10 PASS** |
| New request CDP | **13/13 PASS** |
| Axe | **61 configurations**, zero detected violations |
| MySQL | 15 models, three real migrations, Persian/default/history/rollback checks PASS; five public-content groups PASS |
| Complete owned harness | PASS, genuine bootstrap/API/browser activity, server shutdown and marker/live-count verified cleanup |
| Responsive/themes | All seven requested widths, both themes, 200% root text and no-overflow checks PASS; actual representative screenshot inspection |

**147 unique native/HTTP/browser scenarios passed**, plus database groups. Current phase artifacts are `test-results/prompt05` (97 screenshots plus logs). Historical Prompt 04 artifacts remain unchanged. Actual security/ownership/concurrency/rollback/recovery tests use real maintained authentication and MySQL, not mock identities, in-memory data or simulated requests.

The read-error browser test found a cached failed-render retry; the button was fixed to fetch a new document and the storage-restoration scenario passed. A CDP reconnect timeout and the pre-fix failure remain recorded separately, not presented as successful runs. Full test execution and limits are detailed in [TESTING.md](TESTING.md).

## Remaining limitations

- Admin processing/approval/decline/project conversion is intentionally Prompt 06 work. No customer editing/cancellation workflow or unsupported status mutation is exposed. Projects/tickets/CMS/uploads remain in their later scopes.
- Uncommitted text is retained only in the current open form; closing/reloading loses that draft. The stable operation URL recovers a committed result. The UI explains this; no localStorage authoritative store is used.
- Lists bound page numbers to 1–1000; timelines display the latest 100 actual events with disclosure if truncated. Larger-scale navigation can be extended when needed.
- Email verification/recovery/delivery remains unavailable; new accounts stay unverified. Existing disclosed risks and absence of fake delivery are preserved.
- Optional Prettier/Vitest remain unavailable; native tests/ESLint/manual review are used without claiming those tools passed. Root dependency lock/previous script-disabled clean install remain intact; ordinary lifecycle-enabled online installation and fresh audit are release work. No dependency or registry retry was needed here.
- Standard Next/Playwright subprocess restrictions persist; supported production build/start and CDP are verified. CDP transport can intermittently time out. No manual screen-reader, other-engine, deployed TLS, penetration-test or Lighthouse certification is claimed.
- All work is local. No hosting, production service, default live administrator, fictional customer/project/testimonial or deployment was added.

## Documentation and continuation

[REQUESTS.md](REQUESTS.md) records model/statuses, validation, ownership, API routes, idempotency, rate limits and recovery. [ARCHITECTURE.md](ARCHITECTURE.md), [AUTHENTICATION.md](AUTHENTICATION.md), [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), [TESTING.md](TESTING.md) and [README.md](../README.md) are updated. Prior accepted Prompt 04 documents are preserved under `docs/history/PROMPT04_COMPLETED_*`; pre-change test sources are preserved as `.txt` snapshots in `tests/history/prompt04-completed`. Earlier historical records/artifact-loss disclosure remain intact.

Run existing local data with `npm run build:local` then `npm run start` (stop a running server before rebuild). Apply checked-in migrations using `npm run db:init:windows` when initializing another Windows checkout. Use `npm run test:requests:browser` for the complete owned verification workflow; no test data is seeded into the live application.

| Prompt | Remaining intended scope |
| --- | --- |
| 06 | ADMIN-authorized request review, explicit status transitions/history, conversion to separate managed projects |
| 07 | Expanded authorized project progress/dashboard/profile capabilities |
| 08 | Real support tickets/messages and secure attachments if requested |
| 09 | Admin services/portfolio/FAQ/settings management and validated assets |
| 10 | Full end-to-end hardening and local release verification, including remaining release/environment checks |

Prompt 06 must keep customer ownership predicates, validate ADMIN inside data/mutation boundaries, append attributed request history and current status atomically, preserve original submission/idempotency meaning and maintain separate project execution history. Do not rewrite released migrations, reset live data, fabricate progress or deploy while continuing.

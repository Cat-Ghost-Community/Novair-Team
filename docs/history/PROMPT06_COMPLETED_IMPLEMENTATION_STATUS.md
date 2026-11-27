# Implementation status

Current stage: **Prompt 06/10 — completed and accepted locally**, 2026-10-24. Administrative request review, secure conversion and managed projects are implemented and verified on the final production build. The complete regression harness, final screenshots, cleanup and independent original-data comparison passed. The repository is ready for **Prompt 07**. This is not complete V1 production-release certification.

## Prompt 06 implemented workflow

- Real `/admin/requests` list/detail with customer identity, canonical preferences, safe links, bounded search/status/unconverted filters and ten-item deterministic pagination. Only current enabled ADMIN sessions reach service reads or mutations.
- Explicit request state machine: NEW → REVIEWING or DECLINED; REVIEWING → ACCEPTED or DECLINED; ACCEPTED/DECLINED/CANCELLED are terminal. Direct NEW acceptance is rejected. Public decline explanation is required; private notes remain separate, attributed, bounded and append-only.
- Transactional decisions/version/history/actor attribution and durable actor-scoped operation results. Sorted User locks and target row locks under READ COMMITTED prevent stale snapshots and lost updates. Stale/illegal writes return conflicts; exact retries do not duplicate activity and changed committed payloads are rejected.
- Explicit ACCEPTED-to-PLANNED project conversion: owner/title/summary derive from the original request, with a genuine initial project event. Unique originating-request relationship and one transaction prevent duplicate/partial projects. Acceptance remains visibly separate from conversion; original submission/idempotency semantics stay intact.
- Real `/admin/projects` list/detail with status/active filtering, optional enabled-ADMIN assignment, valid optional calendar scheduling, execution transitions, metadata before/after audit and private notes. PLANNED → IN_PROGRESS/CANCELLED; IN_PROGRESS → ON_HOLD/COMPLETED/CANCELLED; ON_HOLD → IN_PROGRESS/CANCELLED. COMPLETED/CANCELLED are terminal and metadata is locked, while notes may still append.
- Real admin counts/recent activity and linked summaries. Responsive token-based RTL cards/forms, native fields, Radix confirmations, keyboard focus, committed-state feedback, rate limits, stale-state refresh, expiration and response-loss recovery. No dependency, fake record or landing redesign was introduced.
- Customer DTOs explicitly select owned permitted data. Only approved decline explanations and a minimal project-created boolean extend customer details. Private notes, internal audits, ledger and project records do not enter customer JSON/HTML/RSC. Expanded customer execution views remain Prompt 07 work.

## Prompt 06 database and preservation

Additive migration **202610240004_project_management** adds versions, public decline explanations, optional project dates and three models: AdminNote (exactly one target CHECK/FKs), AdminOperation (unique actor/key) and ProjectAuditEvent (real metadata changes). There are now **18 models and four migrations**. Existing unique Project.requestId is reused for conversion.

Fresh isolated MySQL DDL/constraints/rollback were verified before applying to the existing local migration ledger. Rerun reported zero pending migrations. Independent SHA-256 comparisons verified every original scalar value/count and the three released migration SQL files unchanged. No live reset or persistent test fixture was introduced.

New mutations use strict normalized Zod contracts, 32 KiB bounded JSON, exact-Origin/cross-site checks and the existing atomic MySQL limiter (30/admin, 120/shared local source per minute). Committed replay/recovery bypasses new-operation budgets; counter failure blocks new writes. No forwarded address is trusted. Errors are sanitized; private responses remain no-store.

## Prompt 06 executed verification

| Gate | Executed result |
| --- | --- |
| Production build / TypeScript / ESLint | PASS, including production type/page/trace stages; zero lint warnings |
| Native scenarios | **24/24 PASS** (20 preserved + 4 management contracts) |
| Existing auth/security | **20/20 PASS** |
| Existing HTTP negative/foundation | **12/12 PASS** |
| Existing customer-request integration | **21/21 PASS** |
| New real management integration | **29/29 PASS** |
| Shared / auth / customer-request CDP | **51/51 + 10/10 + 13/13 PASS** |
| New management CDP | **11/11 PASS** |
| Axe | **98 configurations**, zero detected violations |
| MySQL / public content | 18 models, four migrations, real Persian/default/history/rollback PASS; five public-content groups PASS |
| Preservation / cleanup | Original values/counts/migration hashes unchanged; owned database/server/credentials cleanup PASS |

**191 unique native/HTTP/browser scenarios**, with separate database groups; reruns do not increase this count. Management coverage includes genuine concurrent decisions/conversion/edits, illegal/terminal transitions, actor attribution, exact replay, ledger/history/note/audit failure rollback, assignment/date validation, fixed-window concurrent limiting, privacy canaries, role/disabled/session changes, CSRF, filtering/pagination, real confirmation/forms and lost-response recovery.

Seven widths (320/375/430/768/1024/1440/1920), both themes, RTL, 200% root text, small-landscape dialogs and keyboard/focus/overflow checks ran in real Chromium/CDP. Representative list/detail/dialog/scheduled-project/conflict/overview screenshots were opened and inspected, including the final date-only rendering and keyboard-focused landscape confirmation. Current artifacts are **test-results/prompt06** (147 screenshots and machine-checked verification-summary.json); Prompt 05's 97 screenshots remain present. Earlier phase artifacts/history remain untouched.

An initial fixed-window assertion straddled two legitimate budgets; its failed log is preserved and the test now starts away from the boundary without changing server limits. A browser helper incorrectly included an account ID in the strict login body; the server rejected it, and the helper was corrected to send credentials only. Failed logs and the pre-presentation complete run remain separately recorded, not relabelled as passes.

## Remaining limits and Prompt 07

- Prompt 07 should add strictly owner-scoped customer project views/progress and useful dashboard refinements. Preserve current ADMIN mutations, request ownership/idempotency, separate private notes and genuine history; do not fabricate progress percentages.
- Lists cap pages at 1000; details show the latest 100 notes/history/audits with disclosure and up to 100 eligible assignees (retaining the current assignment). No arbitrary reopening, owner reassignment, standalone project creation, note editing/deletion or long-detail pagination is exposed.
- Unsubmitted form text remains only in the open document; an operation URL recovers committed results, not draft text. No customer cancellation/edit workflow, tickets, CMS editor, uploads, payment, external notification or deployment was added.
- Existing email verification/recovery remains unavailable. Fresh online audit/lifecycle-enabled clean installation and ordinary worker runners remain release/environment work. Optional Prettier/Vitest are not required or claimed; installed native tests, strict TS, ESLint and manual/source formatting review are used. No unchanged network retry or package addition occurred.
- CDP is the supported browser path on this restricted Windows host; standard Next dev/Playwright subprocess restrictions remain. Automated axe is not certification; no manual screen-reader, alternate-engine, deployed TLS, penetration-test or Lighthouse claim is made.

See [PROJECT_MANAGEMENT.md](PROJECT_MANAGEMENT.md) for state maps, API/authorization, transaction/idempotency/assignment/privacy rules. ARCHITECTURE, REQUESTS, AUTHENTICATION, DESIGN_SYSTEM, TESTING and README are updated. Accepted Prompt 05 documents/test sources are preserved under `docs/history/PROMPT05_COMPLETED_*` and `tests/history/prompt05-completed`; Prompt 01–04 history remains intact.

Run locally: `npm run db:init:windows` when migrations are needed; stop an existing server, then `npm run build:local` and `npm run start`. Full verification: `npm run test:management:browser`. All servers/data remain local; this is not full V1 production-release certification. Remaining prompts are 07 customer projects/dashboard, 08 support conversations, 09 content administration, and 10 final hardening/local release verification.

Final runtime check: the production application started on `http://127.0.0.1:3000`; all 12 existing HTTP scenarios passed against its actual configured database, new management anonymous/forged read/write/page probes failed closed, and original persisted-value/migration hashes remained unchanged afterwards. No test fixture/server remains on port 3100.

---

## Historical Prompt 05 accepted report

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

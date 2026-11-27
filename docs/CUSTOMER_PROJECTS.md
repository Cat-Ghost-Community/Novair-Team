# Customer projects — Prompt 07

The customer portal reads actual managed projects created through the existing ADMIN conversion workflow. No dependency, table, migration, project mutation or invented activity is added. See IMPLEMENTATION_STATUS.md and TESTING.md for actual executed acceptance, rather than inferring acceptance from this contract.

## Routes

USER pages: `/dashboard`, `/dashboard/projects`, `/dashboard/projects/[id]`, existing `/dashboard/requests/[id]` and `/dashboard/profile`. The existing optional catch-all allowlist now recognizes projects and one detail segment. Nested navigation marks the owning section active. Ticket navigation is explicitly labelled upcoming and leads to its existing truthful unavailable page.

Read APIs: GET `/api/projects`, `/api/projects/[id]` and `/api/projects/summary`. Collection accepts strict `status` (ALL or an existing ProjectStatus), `active` (`true`/`false`) and `page` (1–1000). Ten-item pagination uses updatedAt DESC, id DESC. Active is a filter over PLANNED/IN_PROGRESS/ON_HOLD, not a persisted or invented status. Repeated/unknown/protected parameters are rejected. Details/summary accept no query parameters. POST/PUT/PATCH/DELETE return 405 without writes; management subroutes are absent. Read responses, including errors, are private/no-store. Unauthorized/forbidden/missing/invalid/storage outcomes use 401/403/404/400/503 respectively. Unsafe Origin/cross-site reads are rejected. No customer project mutation exists.

## Authorization and exact DTO allowlist

`src/server/projects/service.ts` validates the existing real Better Auth principal in **every** public method, including direct service calls. It requires current USER and rejects expired, revoked, forged or disabled accounts; ADMIN receives 403 on customer APIs. Ownership comes exclusively from this validated user. Lists, aggregates and detail lookup include `ownerId` in the database query. Known non-owned IDs, nonexistent IDs and malformed IDs share the same safe 404 response. Layout/Proxy/page guards supplement this data boundary.

The list selects and returns only:

- `id`, `title`, `status`.
- `createdAt`, `updatedAt` as UTC ISO timestamps.
- `plannedStart`, `targetCompletion` as nullable YYYY-MM-DD calendar dates.

Detail adds only `originRequestId`, `historyLimited`, and `history` entries with `id`, `fromStatus`, `toStatus`, `createdAt`. No Prisma object is spread across the customer boundary; explicit projection/serialization produces DTOs. No ADMIN project DTO or private relation is reused in Client Components.

Project.description is an ADMIN-editable internal field without a customer-publication contract. It is deliberately **not selected or returned**. No customer-facing summary field is guessed or manufactured. Customers can open the original owned request to read their own submitted needs. The admin detail clarifies this internal-description policy. Title is the customer-facing project identifier/title; updates do not alter the original submission.

Excluded fields/relations include owner/user identifiers and contact objects, assignee IDs/names/emails, version, raw request relation/requestId, ProjectStatusHistory actor/note, AdminNote, ProjectAuditEvent before/after payloads and AdminOperation keys/digests/results. Private values never enter customer server HTML, RSC, serialized props, API JSON or timelines. The account panel displays only the customer's own permitted identity.

## Request/project relationship

Conversion remains ADMIN-only, accepted-request-only and unique by Project.requestId; this phase creates no projects when navigating. Customer detail resolves an originating request using a nested `ownerId` predicate. Customer request detail separately filters its project relation by that same authenticated owner, returning only an explicit nullable `managedProjectId` alongside the existing `projectCreated` boolean. The raw Project relation and internal `projectId` field remain absent.

Both predicates are required even for inconsistent legacy records: an application relationship alone is not treated as authorization. A converted owned request links to its actual owned project. ACCEPTED without a linked owned project remains accepted-awaiting-creation, with no fake card/link or start claim. Declined requests preserve only their approved public explanation. Review states and execution states are unchanged.

## Status and timeline presentation

The shared customer presentation contract maps the existing enum to Persian labels:

| Stored value | Customer label |
| --- | --- |
| PLANNED | برنامه‌ریزی‌شده |
| IN_PROGRESS | در حال انجام |
| ON_HOLD | متوقف‌شده موقت |
| COMPLETED | تکمیل‌شده |
| CANCELLED | لغوشده |

Short factual stage descriptions pair labels with Lucide icons and existing semantic colors. Planned/held states do not imply current execution. There are no percentages, invented milestones, estimated hours or delivery promises. Optional schedule fields are clearly plans/targets, rendered with Persian calendar formatting and UTC date-only semantics; actual event timestamps retain the shared Tehran timestamp presentation.

History reads only ProjectStatusHistory's allowed four fields, takes the latest 101 ordered createdAt DESC/id DESC, returns the latest 100 in chronological order and discloses truncation. Only a persisted null→PLANNED event is labelled project creation. Legacy empty history displays an honest missing-history message; a partial noninitial sequence is disclosed. No creation event is synthesized from Project.createdAt and no private history note/actor is selected. ProjectAuditEvent is never queried by this service.

## Dashboard and account

Overview authorizes once and performs four bounded transactional operations: owned request groupBy, owned project groupBy, three latest owned requests, and three latest updated owned projects. Request totals, NEW+REVIEWING waiting count and ACCEPTED count remain separate from project totals, open-state count and COMPLETED count. All six summaries and both recent lists come from actual records; zero states are genuine empty results. The existing explicit request-list projection is reused without altering submission or idempotency behavior. There is no global dataset fetch or client-side ownership filtering.

Server Components render dashboard/list/detail/timeline/SVG. No new client data fetching, polling, animation library or client dataset store is added. Existing small navigation/theme/account/password islands remain. The account panel adds a truthful active-account status after the enabled-account guard; display name/email stay read-only. Better Auth password change, session rotation, logout and safe login returns are unchanged. Email verification/recovery delivery is still unavailable and remains clearly disclosed.

## Design, loading and recovery

The existing palette/font/RTL/logical layout is retained. ProjectSketch is original lightweight, theme-aware construction artwork used only for honest empty states, with aria-hidden/noninteractive SVG. Status chips have text plus distinct functional icons. Lists use wrapping mobile cards, narrow allowlists and bounded pagination; data-heavy views remain restrained. Technical IDs are LTR-isolated and long text wraps.

Dashboard loading announces real pending reads, including projects. Invalid filters offer a real list link; unknown/non-owned details use not-found. Expiration follows existing safe login routing and disabled accounts fail closed. Unexpected storage errors reach a localized safe boundary, with no SQL/stack disclosure. Its retry reloads the document for a fresh server read rather than replaying cached failure. Interrupted navigation can retry normally; stale data is not represented as a newly successful read. Existing no-store/session synchronization/back-navigation safeguards remain.

## Verification and continuation

Prompt 07 is accepted locally on 2026-10-24 under the user-approved equivalent-browser-evidence policy; the repository is ready for Prompt 08, which has not been started. Recovery executed 12 real authenticated Chrome MCP functional groups, 52 additional axe/layout checks (zero detected violations), and captured AND inspected 44 portal screenshots. The existing 125 unique Node scenarios/build/typecheck/lint remain passed on unchanged application source; recovery independently repeated the 17 project/MySQL integration tests (17 pass, zero failures/skips). Earlier six Chrome groups and 170 axe executions are preserved separately. The 85 preserved and 10 new direct Playwright cases remain unverified through that launcher; no equivalent check is counted as their execution. See the current top of TESTING.md and test-results/prompt07-recovery/verification-summary.json for precise evidence.

`npm run test:projects:browser` runs all prior unit-independent auth/HTTP/request/management and CDP suites plus new customer project integration/browser suites in the established nonce-owned MySQL harness. `npm test` covers all native scenarios separately. All four checked-in migrations are applied to a fresh fixture; no active database reset/reseed is performed. Cleanup verifies every model's live count and owned marker/name before deleting only its fixture. Independent pre-phase value/migration hashes and prior report/test snapshots preserve Prompt 01–06 history. New artifacts are under `test-results/prompt07`; previous screenshots are not overwritten. `-ProjectsOnly` is iteration, not the complete regression gate. Recovery added an optional validated `-ArtifactDirectory test-results/prompt07-recovery` for separate logs without altering tests or guards. The full 125-case backend run preceded recovery; the subset repeat is not presented as a second full run.

Security tests plant distinctive private description/note/history-note/audit/operation/assignee-contact canaries and inspect actual JSON, HTML, RSC and client-visible serialization. RSC testing follows only a same-origin/same-path framework cache-key redirect and asserts a real component response containing the permitted record, so an authorization redirect cannot masquerade as a privacy pass. Actual authorization, owner isolation, read-only endpoints, legal conversion/history, terminal states, schedule accuracy, bounded pagination, legacy/truncated history, storage failure/recovery, end-to-end ADMIN/customer workflow, themes/keyboard/axe and seven-width/200% text matrices are included. See TESTING.md for actual counts, failures corrected and screenshots inspected. Recovery additionally checked nine genuine JSON/HTML/RSC responses against six private-canary types, real table-read failure/retry, the native keyboard/account menu, persisted themes/sessions, logout and database-expired sessions. All 44 mobile/desktop/theme/200%-text/tablet/empty/error portal captures were viewed; their hashes and inspection metadata are in the recovery screenshot manifest. Original data values/counts and four migration SQL hashes match the pre-recovery baseline after guarded fixture cleanup. No application/schema/security change was needed.

Limits remain: ten items/page and max page 1000; latest 100 historical events with disclosure; no published project summary field or assignment exposure; no customer edits/cancellation; no email notifications/recovery; no browser-engine/assistive-technology certification. Prompt 08 should implement real owned support tickets/messages while preserving these project DTOs, ownership predicates, disabled/current-role checks, separate private notes, and existing admin transaction/state invariants. Ticket project selection must independently authorize the linked project; it must never trust client ownership hints. CMS, uploads, financial flows and deployment remain outside this phase.


## Prompt 08 continuation

Support tickets are now real, not upcoming. Navigation and project/request explanatory copy link to `/dashboard/tickets`/new while the existing project DTO, ownership, state and no-write rules remain unchanged. Optional ticket association uses a current owned project choice and rechecks persisted ownership under a transaction lock; subsequent ticket links independently owner-filter legacy relationships and expose only id/title. Internal description/assignee/audit/note data remain excluded. The earlier limits/Prompt 08 scope statements describe the preceding phase; SUPPORT_TICKETS.md and the current status govern the implemented support flow and Prompt 09 continuation.

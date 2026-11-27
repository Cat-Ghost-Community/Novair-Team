# Project management — Prompt 06

All workflows are local, backed by the existing MySQL database and maintained Better Auth sessions. There is no new dependency, customer project execution screen, notification service or enterprise planning system.

## Review and execution are separate

Request transitions are `NEW → REVIEWING`, `NEW → DECLINED`, `REVIEWING → ACCEPTED`, and `REVIEWING → DECLINED`. ACCEPTED, DECLINED and CANCELLED are terminal. Direct NEW acceptance is deliberately disallowed: review must happen first. Declining requires a customer-facing explanation of 10–2000 characters. An optional private note is stored separately. Acceptance does **not** create a project or claim that implementation has started.

Managed projects retain the existing PLANNED/IN_PROGRESS/ON_HOLD/COMPLETED/CANCELLED enum. Legal transitions are:

| Current | Next |
| --- | --- |
| PLANNED | IN_PROGRESS, CANCELLED |
| IN_PROGRESS | ON_HOLD, COMPLETED, CANCELLED |
| ON_HOLD | IN_PROGRESS, CANCELLED |
| COMPLETED / CANCELLED | None |

Closed projects cannot change metadata, assignment or scheduling. Private notes may still be appended. Each status change has an actual actor, previous/new status and timestamp. Assignment/title/summary/schedule changes use separate before/after audit events; identical metadata does not manufacture activity or increment the version.

## Routes and access

ADMIN pages are `/admin`, `/admin/requests`, `/admin/requests/[id]`, `/admin/projects` and `/admin/projects/[id]`. Lists support safe search (title, identifier, customer name/email), status filters, deterministic recent-first ordering and ten-item server pagination. Requests also filter unconverted records; projects can filter the three active states. Search is bounded to 100 characters and page numbers to 1–1000.

The catch-all `/api/admin/[...management]` serves GET collections/details, `/summary`, and actor-scoped `/operations/[operationKey]`. POST endpoints are request `/review`, `/convert`, `/notes` and project `/status`, `/update`, `/notes`. There is no arbitrary owner reassignment or standalone project creation endpoint. The older static `/api/admin/overview` account summary is preserved.

Every service read and mutation validates a real session, current ADMIN role and disabled-account status. Proxy/layout checks are additional boundaries, not the authorization implementation. Mutations also lock and recheck the actor inside the transaction. USER, anonymous, expired, revoked, forged and disabled identities cannot use these endpoints. Roles and actor identities never come from the body.

## Schema and conversion invariants

Additive migration `202610240004_project_management` adds request `reviewVersion`, public history explanation, project `version` and optional DATE-only scheduling, plus AdminNote, AdminOperation and ProjectAuditEvent. Existing migration files, submissions, enum values and customer idempotency remain unchanged.

Only ACCEPTED requests can convert. Project owner, title and summary derive from the locked persisted request. Conversion creates a PLANNED project and its initial attributed history in the same transaction. The existing unique `Project.requestId` guarantees one project per originating request, independently of UI state. The request review version increments but its original submission fields and status remain unchanged; no fictitious review event is inserted. Repeated/concurrent conversion returns the single existing project when one is already linked. A history/ledger/database failure rolls back the entire write and leaves the accepted request available for retry.

## Concurrency, idempotency and transactions

Consequential forms send a UUID operation key and expected integer version. AdminOperation has a durable unique `(actorId, operationKey)` invariant and a SHA-256 fingerprint of normalized action, target and payload. Matching committed retries return their recorded result; changed reuse returns 409. Operation recovery is restricted to its acting administrator and stores minimal identifiers/versions, not note contents. Different administrators cannot read each other's operation results. A new-key conversion of an already linked request safely acknowledges the existing project; it never creates another one.

Transactions lock actor and optional assignee User rows in sorted identifier order, then the request/project row. READ COMMITTED is intentional: operation lookup occurs before target locking, so a repeatable-read snapshot could conceal another administrator's just-committed target version after waiting. Under the target lock, stale versions and illegal transitions return 409. Decisions/status/history, conversion/history, metadata/audit, notes, rate counters and successful operation ledger insertion commit atomically. No disabled button or client snapshot is trusted for concurrency.

On network loss, the operation key remains in the current document URL with its form intent. The same form can retry or query the committed result; SSR also offers recovery after reload. A committed confirmation is loaded from the real operation record. Unsubmitted draft text remains only in the open form. Conflicts retain entered text and require fresh details; a failed response is never treated as proof that a write did not commit. Exact committed replays are checked before stale versions and current optional-assignee eligibility, while the actor must still be authorized.

## Notes, customer privacy and assignment

AdminNote is plain text, bounded to 3–4000 characters, append-only and attributed. A database CHECK requires exactly one request/project target. Foreign keys restrict accidental deletion of authors and business records. Notes have no public-history counterpart and are selected only by ADMIN DTOs. Customer list/detail queries use explicit ownership predicates and explicit allowed fields; admin notes, audit data, operation records and admin contact information do not enter customer HTML, RSC or JSON. Only `publicExplanation` on genuine decline history is customer-visible.

Customer request details distinguish accepted-but-unconverted requests from converted requests using a minimal boolean. No project record or execution route is exposed early. Expanded owned project views remain Prompt 07 work.

Assignment is optional and accepts only an existing, currently enabled ADMIN, checked under lock. No staff records are invented. The server does not accept an arbitrary project owner. Scheduling uses optional valid calendar dates between 2000 and 2100; target completion cannot precede planned start. Dates are preferences/plans, not delivery guarantees. Summary/title edits do not alter the original request.

## Request security and limits

Bodies are strict Zod objects; unknown/protected fields and invalid keys/statuses/dates are rejected. Shared normalization rejects unsafe control/bidi content. JSON is streamed with a 32 KiB ceiling; non-JSON, malformed bodies, unsafe origins and cross-site mutation attempts fail safely. Existing session cookies and CSRF behavior are preserved. Customer links remain subject to the existing public HTTPS policy, are opened safely and are never fetched/previewed by the server.

New admin mutations use the established atomic MySQL limiter: 30 per administrator and 120 per shared local source in a one-minute window. Forwarded addresses remain untrusted. Committed retries/recovery do not consume new-operation budgets; a new-key existing-conversion acknowledgment does. Rate-limit denials commit their counters and return 429 with Retry-After; unavailable counters fail closed. General failures expose no SQL, credentials or internal exception details. Private routes/responses remain no-store.

## Presentation and operational limits

The existing RTL font/tokens/shell are reused. Lists become compact cards on narrow screens; statuses pair text and color; controls have labels and error associations. Review/conversion/status confirmations use the installed Radix dialog with focus trapping, initial cancel focus, Escape and explicit trigger-focus restoration. Planned calendar dates render without a fabricated time of day. Notes/audits/history are bounded to the latest 100 entries with truncation disclosure; eligible assignee options are bounded to 100, with the current assignment retained as an explicit option if outside that bound. Pagination beyond these detail caps and note editing/deletion are not implemented.

The admin overview reads actual NEW/reviewing/unconverted-accepted counts, active/completed projects and bounded recent records. No percentages, default team members or fabricated activity appear. Public content, customer requests, authentication and historical migrations are preserved.

## Verification and continuation

`npm run test:management:browser` creates a nonce-owned isolated MySQL database, applies the checked-in DDL, bootstraps a real ADMIN, starts an owned loopback server and runs all earlier suites plus management integration/CDP tests. Cleanup verifies ownership and unchanged live counts before dropping only its fixture. `test:management` omits browsers; `-ManagementOnly` is for iteration, not the final regression gate. Artifacts go to `test-results/prompt06` and existing phase screenshots remain untouched.

See [TESTING.md](TESTING.md) and [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for actual executed counts and current acceptance; tests are not certified by this architectural description. Coverage includes authorization, private-note canaries, concurrent decisions/conversions/edits, legal/illegal state transitions, real FK/unique/CHECK constraints, history/audit failure rollback, exact replay, concurrent rate limits, CSRF and browser workflows. Prompt 07 should add owner-constrained customer project views while retaining these ADMIN-only mutation/notes boundaries. Tickets, CMS, uploads, payments, notifications and deployment remain outside this phase.

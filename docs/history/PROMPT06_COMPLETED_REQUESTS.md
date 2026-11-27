# Customer requests — Prompt 05

Local implementation using the existing Next/Prisma/MySQL/Better Auth stack. No new package or administrative review workflow is introduced. See current [implementation status](IMPLEMENTATION_STATUS.md) and [testing](TESTING.md) for actual final results.

## Domain and migration

`202610240003_customer_requests` is an additive migration. Existing users, accounts, sessions, services, requests, content and both released migration files remain untouched. Nullable additions on `ProjectRequest`: `category`, `budgetPreference`, `timelinePreference`, `relevantUrl`, `submissionKey`, `submissionHash`. Existing `budget`, `deadline` and nullable `serviceId` remain compatible with older records. New submissions use canonical customer preferences, not invented Service records or official studio pricing.

The existing request enum is retained: NEW (ثبت‌شده), REVIEWING (در حال بررسی), ACCEPTED (پذیرفته‌شده), DECLINED (ردشده), CANCELLED (لغوشده). Project execution states remain exclusively on Project. Clients cannot submit any status. Current customer APIs create NEW only and expose no update/delete/approval operation.

`ProjectRequestStatusHistory` records requestId, actorId, nullable fromStatus, toStatus, createdAt and stable ID. It is separate from `ProjectStatusHistory`, whose enum/entity describes execution. Request/user foreign keys use Restrict; no business owner/history is cascade-deleted. Each new request and its attributed NEW event are created in one MySQL transaction. Migration does not fabricate history for older requests; the UI explains an empty historical record. Detail returns at most the 100 most recent actual events, reordered chronologically and labelled if truncated.

Database invariants include unique `(ownerId, submissionKey)` (nullable for legacy rows), an owner/status/date/ID listing index, request/date/ID history index and actor index. Existing owner/date indexes remain. Migration application, zero-pending reruns, schema validation, real isolated DDL and live data/hash preservation are verified separately; no database reset or released-SQL rewrite is used.

## Canonical contracts

`src/shared/request-contracts.ts` is the shared client/server source for nine stable service-category IDs and Persian labels, request status labels and preferences. Categories cover website, web app, Discord/Telegram/TeamSpeak bots, dashboard, SEO, automation and other. Unpublished managed Service rows are not a public selection source. Prompt 09 must preserve these stable identifiers or introduce an explicit migration/mapping, not change existing meaning silently.

Title: 3–150 characters; description: 20–6000. Text normalizes NFC, line endings and outer whitespace; title whitespace collapses. Disallowed control/bidi-override characters are rejected while Persian ZWNJ remains supported. Optional budget/timing defaults mean undecided/advice. Budget ranges are explicitly customer preferences in toman, not NovAir prices; desired timing is not a delivery guarantee. No exact amount/deadline is required.

Optional links are length-bounded, normalized public HTTPS URLs through the established URL policy. Active schemes, credentials, literal IP/local/private preview addresses and malformed values are rejected. No remote URL is fetched, previewed or proxied. Rendering uses a safe recheck, bidi isolation, `noopener noreferrer nofollow` and ordinary escaped React text. Descriptions are never interpreted as HTML.

Zod strict objects reject all unknown fields, including ownerId, role, status, serviceId and request ID. The authenticated identity is the sole ownership source. Only explicitly mapped validated fields are written.

## Endpoints and authorization

| Endpoint | Method | Behavior |
| --- | --- | --- |
| `/api/requests` | POST | Authenticated USER submission; 201 new / 200 committed replay |
| `/api/requests` | GET | Owned, status-filtered, recent-first paginated list |
| `/api/requests/[id]` | GET | Owned request details and actual history; safe 404 otherwise |
| `/api/requests/operation/[key]` | GET | Recover only this user's committed operation; 404 if absent |

`createRequestsService` validates a real session inside every public data/mutation method, requires USER, then uses owner-constrained database queries. Route Proxy/layout/page checks remain additional boundaries. ADMIN stays in `/admin` and receives 403 from customer APIs. Forged, expired, disabled and revoked sessions fail. No client ownership hint, query override or cross-role return path is trusted. Other accounts' nonexistent/known IDs have the same safe 404 API behavior. Next may stream a not-found boundary for page rendering; API ownership results are authoritative HTTP 404 and contain no private record.

POST requires the exact canonical Origin, same-site fetch metadata and JSON. Streaming and declared body sizes are limited to 32 KiB. Unknown/repeated list parameters are rejected. Invalid inputs return 400, unsafe origin 403, media 415, size 413, committed-key conflict 409, exhausted budget 429/Retry-After and unavailable storage generic 503. All private API responses are no-store; raw errors, payloads and SQL are not logged. Existing CSRF/cookie/session mechanisms are preserved.

## Persistent idempotency and transaction boundaries

The server generates a cryptographically random operation UUID for each new form; the client retains it in that form's URL. The operation key is an idempotency identifier, not an authentication credential. It is always scoped to the validated owner. SHA-256 hashes the normalized payload's deterministic field order, excluding the operation key. The digest/key/owner remain internal, not public detail DTO fields.

Submission transaction:

1. Lock the authenticated User row with a parameterized `SELECT ... FOR UPDATE`, rechecking current USER/disabled status. This serializes competing submissions for that owner across application instances.
2. Read the unique owner/key entry. Same digest returns its genuine persisted ID/status; a changed digest returns 409. Committed retries do not consume new-creation budget.
3. Enforce the shared MySQL limiter in the same transaction. Denied counters are committed, then 429 is returned; there is no in-memory fallback.
4. Create the request and its attributed initial history event atomically, with server-chosen ID/owner/NEW status. Commit before acknowledging success.

The database unique key remains the durable invariant. Concurrent identical retries produce exactly one request/event. Distinct keys may create identical legitimate content; content similarity is never treated as duplication. Different owners may safely use the same operation key. Write failure rolls back request, history and uncommitted counters; an uncommitted key can retry. Recovery reads only actual persisted state, never assumes a timeout meant failure or reports success optimistically. The test suite forces a real MySQL CHECK violation on a new history insert to prove rollback.

## Rate limit policy

The existing parameterized MySQL upsert/read mechanism now exposes a transaction-compatible helper. Authentication retains its previous budgets and tests. Request creation uses five new operations per user per fixed ten-minute window and sixty per shared local-source window. Forwarding headers are not identity authorities; the existing explicit local ingress trust boundary is unchanged. Invalid fields do not consume creation budgets. Committed replays/recovery remain usable after budget exhaustion or counter-storage failure. Expired counter windows are removed by `auth:cleanup`; no permanent account lockout is introduced.

## Customer routes and recovery UX

- `/dashboard/requests/new`: single-page Persian form, server-issued operation key, pre-hydration disabled POST controls, inline validation, real pending state, duplicate-submit guard, exact server confirmation and identifier. The operation URL is retained; reload/return checks the owner's persisted result before enabling a fresh submission.
- `/dashboard/requests`: owned list with ten items/page, deterministic createdAt/ID descending order, validated status filter, explicit filtered/empty states and navigation. Page inputs are bounded to 1–1000 to bound offset work.
- `/dashboard/requests/[id]`: actual description/preferences/dates/status/link and history, with no simulated progress.
- `/dashboard`: actual owner-only total/status counts and three latest submissions, plus existing real identity/profile features.

Form text stays in the live DOM through validation, network/storage/rate-limit errors and expiration; it is not stored in localStorage or sent to a third party. Closing/reloading an uncommitted form loses draft text; the bookmarked operation URL can recover only a committed server result. The interface explains this. A retry uses the same key. A changed already-committed payload is rejected; explicit recovery can show the original result or a new form can create a separate operation.

Expiration feedback links to real login in a separate tab, preserving the existing draft. `AuthSync` validates a marked open draft rather than blindly reloading it on account-change/visibility events; a different authenticated identity/role still reloads. Explicit logout in another tab also reloads and clears private draft access, using only a UI event hint and fresh server validation. After reauthentication, result-check/retry uses the current validated server session. Draft handling never authorizes a read or write. Dashboard loading/error boundaries provide safe feedback; recovery and retry buttons call real server operations. Read-error retry deliberately reloads the document to perform a fresh Server Component request rather than replaying a cached failed render.

Landing/header/footer/mobile project CTAs now target the real form. Visitors retain that safe destination through both login and registration. USER reaches the form; ADMIN is redirected to its permitted area. Existing palette/font/SVG grammar remains; `RequestSketch` adds one original small theme-aware vector for empty lists. Form/status/timeline/list/confirmation components share existing semantic tokens and reduced-motion rules.

## Prompt 06 administrative review

The former Prompt 05 boundary is preserved in `history/PROMPT05_COMPLETED_REQUESTS.md`. Review/conversion now uses separate ADMIN-authorized services and `/api/admin` endpoints, documented in [PROJECT_MANAGEMENT.md](PROJECT_MANAGEMENT.md). NEW must enter REVIEWING before acceptance; NEW or REVIEWING can be declined with an approved customer-facing explanation. ACCEPTED/DECLINED/CANCELLED remain terminal. Requests and execution projects retain separate status models.

`reviewVersion` guards administrative decisions; the original customer operation key, payload fingerprint, submission fields and ownership rules are unchanged. Decisions append actual attributed history atomically. Customer history now selects only the optional public explanation; private notes live in a separate ADMIN-only entity. Explicit customer DTOs prevent accidental propagation of richer admin query fields into JSON/HTML/RSC.

Acceptance alone never claims project creation. The owned detail shows truthful accepted-awaiting-conversion copy, or a minimal `projectCreated` boolean after actual conversion. No project identifier, private note, metadata audit or administrative operation ledger is exposed to customers. Expanded owner-scoped execution views belong to Prompt 07. Email recovery, tickets, uploads and CMS remain deferred.

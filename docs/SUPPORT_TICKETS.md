# Support tickets — Prompt 08

This is a local, persistent plain-text support system using the existing Better Auth, Prisma/MySQL, RTL/font/theme and private response architecture. No external service, attachment, email delivery, rich HTML, chatbot or real-time transport is introduced. See IMPLEMENTATION_STATUS.md and TESTING.md for actual executed acceptance; this contract alone is not a test result.

## Model and migration

Additive migration `202610240005_support_tickets` extends the existing Ticket/TicketMessage models and creates TicketStatusHistory, TicketNote and TicketOperation. All four released migration files remain unchanged. There are now 21 models and five migrations.

Ticket adds canonical category, optimistic version, lastActivityAt and five monotonic message/read watermarks. Existing status/priority values remain valid. New tickets always have server-selected OPEN/NORMAL, current session ownership and a real first USER message plus initial attributed history in one transaction. Public priority selection/management is deliberately omitted: a small text inbox does not need an urgency/SLA system; the existing priority/assignment columns are preserved without customer exposure.

TicketMessage adds nullable authorRole and per-ticket sequence, unique together with ticketId. New messages always get actual authenticated role/author and the next locked sequence. Nullable legacy fields do not invent past authorship/order. Existing rows, bodies and timestamps are preserved. Legacy lastActivityAt is initialized from its actual updatedAt; no historical event is synthesized. Legacy WAITING retains its stored meaning/display; new actions use the explicit waiting states.

TicketNote is a dedicated ADMIN-only relation. The old AdminNote exactly-one-request/project CHECK is untouched. Every note has a real author, timestamp and bounded plain-text body. TicketOperation has durable unique actorId/operationKey, normalized payload SHA-256, kind and minimal committed result. It is separate from AdminOperation and never changes its semantics. Business/author foreign keys restrict deletion.

The generated incremental SQL was reviewed before application: Windows lower-case-table-name diff artifacts were normalized to schema-canonical names, redundant FK/index removal/recreation was removed, the original message index retained, and indexed activity ordering added. This review happened before releasing/applying migration 005; no old checksum was rewritten.

## Routes and APIs

USER pages: `/dashboard/tickets`, `/dashboard/tickets/new`, `/dashboard/tickets/[id]`.
ADMIN pages: `/admin/tickets`, `/admin/tickets/[id]`.
Both dashboards include actual support counts and three latest conversations; navigation is functional. Requests, managed projects and support remain separate entities/workflows.

The API bases are `/api/tickets` (USER) and `/api/admin/tickets` (ADMIN):

| Method/path below base | Contract |
| --- | --- |
| GET `/` | Bounded owner-scoped/customer or authorized ADMIN inbox |
| GET `/[id]?page=1` | Explicit permitted conversation DTO, newest message page |
| GET `/summary` | Real open/waiting/unread counts and three recent tickets |
| GET `/projects` (USER only) | Up to 100 actual owned project IDs/titles, with limit disclosure |
| GET `/operations/[key]` | Only the authenticated actor's committed result |
| POST `/` (USER only) | Ticket + first message + initial history + operation ledger |
| POST `/[id]/messages` | Append public reply; transactional implicit waiting-state change |
| POST `/[id]/status` | Versioned permitted close/reopen or ADMIN waiting-state change |
| POST `/[id]/notes` (ADMIN only) | Append private note; no public message/activity/history |
| POST `/[id]/read` | Explicit acknowledgement through a rendered message sequence |

Unsupported mutations do not write records. Private responses, including failures, are no-store. Safe outcomes use 400 validation, 401 invalid session, 403 role/origin, 404 missing/non-owned, 409 conflict/illegal transition, 413 oversized, 415 content type, 429 rate limit and 503 unavailable storage.

## Validation and authorization

Every public service method validates the real maintained session, current enabled account and exact required role. USER ownership comes exclusively from that principal and is constrained inside database queries. No client owner/author/role/priority is accepted. Strict Zod objects reject unknown/protected fields, repeated/unsupported query parameters and invalid identifiers. Mutation Origin must exactly equal the configured canonical origin; cross-site requests are rejected in both HTTP and service boundaries. Existing Better Auth cookies/CSRF/session protections are unchanged.

Text is NFC-normalized, CRLF normalized and trimmed; subject whitespace collapses. Subjects are 3–150 characters, messages 3–8000, private notes 3–4000; unsafe controls/bidi overrides are rejected. JSON has the existing streamed 32 KiB limit. Text renders as React text with preserved line breaks and plaintext bidi isolation, never trusted HTML. URLs in messages are not fetched/previewed. No contents, tokens or raw SQL exceptions are logged by support handlers.

Optional project association is checked under a Project row lock inside creation, against the persisted owner and current actor lock. Missing and non-owned choices share the same safe validation result. Later links independently compare the project's owner with the ticket owner, even for inconsistent legacy relationships. Only id/title cross this boundary, not internal project descriptions, assignments, audits or private notes.

## Exact customer DTO allowlists

Ticket list item: id, subject, category, status, version, createdAt, updatedAt, lastActivityAt, unread and nullable project `{id,title}`.

Detail adds messages `{id,body,authorRole,createdAt}`, page, pageSize, totalMessages, readThrough, historyLimited and history `{id,fromStatus,toStatus,actorRole,createdAt}`. Version is the ticket's explicit concurrency contract for permitted close/reopen actions. readThrough is an opaque displayed-sequence acknowledgement bound to that owned ticket.

Excluded: owner/author/assignee identifiers, other account contact objects, priority, raw receive/read watermarks, TicketNote, operation keys/digests/results and all internal project metadata. ADMIN detail separately selects necessary customer name/email and explicitly projects notes with author display name. It is never reused as a USER DTO or spread into a customer Client Component. Read result DTOs contain no whole Prisma model objects.

List filters are status, subject/identifier search (100 characters) and page 1–1000. Searches never inspect private notes or message bodies. Reflecting the caller's own search query is not publication of internal note data; tests separately assert zero matching result items and canary absence in ordinary JSON/HTML/genuine RSC responses.

## State policy

| Current | Permitted next state |
| --- | --- |
| OPEN / legacy WAITING | WAITING_CUSTOMER, WAITING_SUPPORT, CLOSED |
| WAITING_CUSTOMER | WAITING_SUPPORT, CLOSED |
| WAITING_SUPPORT | WAITING_CUSTOMER, CLOSED |
| CLOSED | WAITING_SUPPORT, through explicit reopen only |

Either authorized party may close; customers otherwise only reopen their own CLOSED ticket to WAITING_SUPPORT. ADMIN may choose the permitted waiting states. A public ADMIN reply moves an open ticket to WAITING_CUSTOMER; a customer reply moves it to WAITING_SUPPORT. CLOSED refuses both parties' replies until explicit reopening. Identical/illegal status requests are conflicts, not invented no-op history. Every real status change records previous/new status, authenticated actor/role and timestamp atomically with current state/message when applicable.

## Concurrency and retries

Writes use READ COMMITTED transactions, lock/recheck the acting User, then the optional Project (creation) or Ticket. Actor/key lookup happens under the actor lock before rate limiting or stale-version checks. The same committed digest returns the original real result without a new message, event or budget charge. Changed committed reuse is 409. Keys are actor-scoped and include role/action/target in the digest. Different legitimate keys/messages remain possible.

Replies append under the ticket lock and do not reject merely because an unrelated prior reply incremented version; two distinct replies can both commit exactly once. Explicit state changes require expectedVersion and reject stale state. A close/reply race either commits the close and rejects the reply, or commits the reply and rejects the stale close. MySQL deadlock/lock conflicts are sanitized 409 recovery outcomes; unexpected storage failures are 503. The transaction and durable result allow checking/retrying the same operation without guessing whether a lost response committed.

The open form keeps text on recoverable failures and freezes an attempted payload to its current key after ambiguous outcomes. Confirmed validation/rate failures permit correction; a committed conflicting key requires result review/new operation. Attempted key/intent are retained in the current URL, so reload can explicitly recover a committed result. Drafts are only in the current open form; no claim of cross-tab/reload draft persistence is made. Successful navigation follows an actual committed/recovered response. Consequential state controls use a Radix confirmation with Escape/focus restoration.

## Read/unread and pagination

Customer unread compares lastSupportSequence with customerReadSequence. ADMIN unread compares lastCustomerSequence with supportReadSequence, **shared across the studio inbox**, not per administrator. A support reply never generates unread work for its own side. Reads/status changes/notes do not invent messages. Private notes do not change public version, activity, unread or history.

GET and failed/unauthorized page requests do not mark read. After a successful conversation is rendered/hydrated, the small client island POSTs the maximum sequence actually displayed. The authorized transaction advances only that side's monotonic watermark, rejects future values, preserves updatedAt/version/activity and creates no history. A new response arriving after the rendered sequence remains unread. Failed acknowledgement has a truthful retry control. In-flight page closure may leave the acknowledgement uncommitted, so a later refresh safely retries.

Ticket lists take ten, ordered lastActivityAt DESC/id DESC; summaries take three. Conversation takes twenty, ordered createdAt DESC/sequence DESC/id DESC, then presents that page chronologically. Explicit older/newer links disclose total count; no infinite polling or silent message truncation. New threads stop at 20,000 messages and ask for a new ticket. Offset pages may move when new messages arrive; refresh returns the latest persisted state. Status history/private-note presentation discloses its latest-100 bound; legacy missing history is acknowledged honestly.

## Rate policy and failures

All enforcement uses the existing atomic MySQL RateLimit/HMAC architecture: create 10 per actor/10 minutes; replies 30/minute; state/note operations 40/minute each; advancing read receipts 120/minute. The shared direct-local source budgets are 300 per operation window and 1000/minute for read acknowledgements. Forwarding headers do not select identity. Exact committed retries and unchanged read acknowledgements do not consume new write budget. Denied counters commit; business failures roll back partial writes/counters. Limiter failure fails closed. A future deployment needs an explicitly configured trusted-ingress policy; no remote configuration is introduced here.

Safe Next error boundaries perform fresh retries after storage recovery. Empty/new/filtered/closed/reopened/loading/conflict/expired/no-permission states remain factual. Account-session synchronization is unchanged. Themes, logical CSS, semantic status text/icons and reduced-motion use the existing design system.

## Verification and continuation

Prompt 08 is accepted locally: 165 unique Node scenarios passed (28 native + 20 auth + 12 HTTP + 21 requests + 29 management + 17 projects + 38 support), with a separate final 38-test repeat. Final build/typecheck/lint passed. Twenty-one authorized Chrome workflow groups, 204 axe executions (zero detected violations), 78 actual captures and 38 inspected representative images provide browser/visual evidence. See current IMPLEMENTATION_STATUS.md/TESTING.md and test-results/prompt08/verification-summary.json for exact coverage and retained failures. The first main cleanup failed then passed through the same guarded direct command; the final UI fixture exited 0 and all original values/hashes remain intact. Earlier 95 direct Playwright cases retain their unverified transport status. The authorized Chrome path is permitted for equivalent critical coverage; actual rendered images must be inspected. Historical reports/images and all four original SQL checksums are preserved.

Prompt 09 may add public content management only after this stage is accepted. It must preserve these role/ownership/DTO boundaries, shared-inbox semantics, ticket idempotency, private-note separation and existing request/project state machines. Attachments, notifications, rich text, polling/chat and SLA/priority queues remain deferred and must not be advertised as implemented.

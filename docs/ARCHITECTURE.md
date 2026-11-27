# Architecture — Prompt 10 qualification

No domain architecture, state machine, auth library, DTO, publication cache, schema or released migration changed. Shared name validation now covers registration and bootstrap; post-normalization request URL bounds cover the actual VARCHAR storage contract. cleanupExpiredAuthentication is shared by the existing CLI and its real expired/active-record integration test; committed operations/business histories are excluded.

The production deployment boundary remains explicit: only local HTTP origin/credentialed loopback MySQL, noindex, local-only bootstrap and shared untrusted-ingress source policy. There is no verified email provider or operational reset/verification API; release option C keeps public launch blocked. DEPLOYMENT_READINESS.md defines the required future reviewed profile and actual cPanel/HTTPS/native-engine/backup/ingress evidence rather than introducing an unverified remote switch.

New release tooling creates a recoverable source/hash checkpoint without secrets; aggregates final suites through the existing nonce-owned harness; verifies an authenticated encrypted native MySQL restore and restored application in a separate fixture; performs read-only source/build-bound gate checking and warm local timing. It does not deploy, change global npm, replace node_modules, add a scheduler or reset data. All 23 original model hashes/six SQL hashes and historical tests are preserved. FINAL_V1_RELEASE_REPORT.md records 221 fresh Node scenarios/17 Chrome groups/350 qualified axe checks/14 inspected images and the externally blocked release gates.

---

## Historical preceding-stage record

The following text preserves earlier stage decisions/results; its pending/continuation wording is historical. The Prompt 10 release report and checklist above govern the current decision.

# Architecture

## Prompt 09 current content architecture

The CMS is now implemented; earlier descriptions of editorial-only services/uncontrolled FAQ restoration/deferred CMS below are historical. src/server/content/service.ts provides independently authorized ADMIN editor reads/writes; http.ts/runtime.ts expose a dedicated more-specific /api/admin/content/[[...content]] route. Existing admin optional-catch-all dispatches the CMS overview/list/new/editor/saved-preview/settings inside the same shell and preserves all operational navigation/summaries. Only editor interaction is a client island. No second framework, CMS package or auth implementation exists.

Migration 006 adds minimal editorial metadata/versions plus separate ContentOperation and ContentAudit (23 models/six migrations), preserving all five old files/checksums and original business/identity/content records. Fixed public.studio.v1 settings are separate from all operational keys. CMS actor row lock then cms.control.v1 mutex, expected versions, exact actor/key/digest recovery and atomic content/audit/limiter/operation transactions handle retries and concurrent edits. Earlier management/support ledgers and state maps are unchanged.

The dynamic public landing/footer use request-scoped React cache around one repeatable-read published-only snapshot. No cross-request content cache or restart is required. Public services/portfolio/FAQ/settings are narrow explicit DTOs; no working body, audit, secret, user, private project/request/ticket or operation is selected. Publication atomically retires the respective fallback; explicit settings can restore it. Storage failure does not resurrect unpublished service/FAQ content. Existing private route no-store, session, role and ownership protections remain.

Trusted local PNG catalog membership plus exact content hash, PNG signature/IHDR, bounded dimensions/bytes, realpath containment and non-symlink regular files replaces arbitrary image paths. Static public onboarding is deliberate; no uploader or remote fetch exists. Next Image sizes now match one/two/three-plus portfolio-card layouts. Preserved plain-text line breaks use CSS, not HTML injection. Public email is URI-encoded, profile hosts constrained and post-normalization project URL length checked.

See CONTENT_MANAGEMENT.md for DTOs/keys/routes/state/asset rules and TESTING.md for 212 actual Node cases, 24 Chrome groups, 300 axe executions and 33 inspected captures. All four completed fixtures used guarded cleanup; original 21 model hashes/five SQL hashes remain intact. Prompt 10 is final release validation, not automatic deployment.

## Earlier foundation and phase-specific architecture

These notes preserve earlier design decisions and phase histories; the current CMS section above supersedes their now-completed content scope.


## Application

One Next.js App Router application; React Server Components by default. Strict TypeScript, Tailwind CSS 4, small native UI primitives, Radix Dialog for keyboard/focus management, and Lucide for functional icons. No animation framework, external font service, API simulator, or separate backend. The theme toggle, mobile navigation, studio dialog, FAQ, account forms/menu/session synchronization, dashboard navigation and error recovery are small client boundaries.

```text
src/app/                       Route groups, metadata, boundaries, global tokens
  (public)/                    Public shell and complete studio landing
  (auth)/login, register        Real branded login/registration, dynamically rendered
  (user)/dashboard/             User layout and reserved route allowlist
  (admin)/admin/                Admin layout and reserved route allowlist
src/components/ui/             Small reusable controls and feedback
src/components/layout/         Server header/footer and a small client mobile-navigation dialog
src/components/theme/          Pre-paint theme script and accessible toggle
src/components/art/            Original, theme-aware decorative SVG components
src/components/home/           Server-rendered landing sections
src/components/auth/           Shared account presentation, validated forms, identity menu and session synchronization
src/content/                   Centralized factual services/process and editorial FAQ fallback
src/server/content/            Published-only public queries, DTOs and asset/link policy
src/components/requests/       Customer form, owned list/detail/summary, timeline and empty SVG
src/server/requests/           Authorized transactional service, strict HTTP wrapper and runtime
src/features/                  Future feature modules
src/server/auth/               Better Auth service, fresh-session/role guards, bootstrap and authorized account access
src/server/db/                 Local-only configuration and lazy pooled client
src/server/security/           Origin validation and enforced atomic MySQL credential rate limits
src/server/uploads/            Policy only; no upload endpoint
src/shared/                    Shared validation contracts
src/config/                    Validated local origin, metadata defaults and honest shared navigation
prisma/                        Schema and versioned MySQL migrations
public/fonts/                  Local variable WOFF2 fonts and OFL license
scripts/                       Local setup, migrations verification, admin bootstrap
tests/                         Security scenarios and browser smoke tests
```

## Routes and access

| Boundary | Paths | Current behavior |
| --- | --- | --- |
| Public | `/` | Complete landing; `home`, `capabilities`, `work`, `studio`, `process`, `faq`, `start` anchors |
| Auth | `/login`, `/register` | Persian registration/login; role-aware redirect for existing sessions, explicit reauthentication |
| USER | `/dashboard`, `/dashboard/requests`, `/dashboard/projects`, `/dashboard/tickets`, `/dashboard/profile` | Validated USER session required; otherwise login or authorized role home |
| ADMIN | `/admin`, `/admin/requests`, `/admin/projects`, `/admin/tickets`, `/admin/users`, `/admin/content` | Validated ADMIN session required; otherwise login or authorized role home |

Optional catch-all pages reserve only the listed sections; unsupported paths invoke `notFound`. Both protected layouts and pages call a server-only guard. Layout protection alone must never be used to protect future queries or actions. Route groups do not alter URLs. There are no private records in HTML, RSC responses or client state. Guards validate signed database sessions and the current role/disabled state; React cache is request-scoped only.

`src/proxy.ts` performs early authoritative session/role checks and applies private/no-store responses. Server layouts/pages repeat the guard; account data functions enforce authorization independently. USER and ADMIN have separate areas. Private APIs return 401/403 rather than login HTML. Role-aware internal return paths prevent open redirects.

## Landing and interaction architecture

The homepage is a Server Component with `dynamic = "force-dynamic"`. Hero, services and every section shell/anchor render without waiting for MySQL. Local Suspense boundaries stream only the portfolio items and FAQ controls after two parallel public-content reads, with real inline loading statuses while pending. Keeping anchor shells outside those boundaries preserves cross-route hash navigation before content resolves. The global loading screen no longer blocks the Hero on these reads. Services and process copy are factual editorial content, not database seed records. `src/config/navigation.ts` holds four concise implemented anchors and the project-access destination. Header, mobile navigation and footer reuse it. Account links use the validated session; project links reach the protected reserved request area through real login. No request submission is simulated.

`src/server/content/home.ts` uses React `cache()` only for request-scoped deduplication. There is no cross-request Next/Prisma content cache: a fresh HTTP request reads current publication state without a rebuild. A page already open in a browser must reload to see changes; publishing in prompt 09 should also refresh any relevant client router state. Response privacy/no-store behavior is checked over HTTP.

`queries.ts` explicitly filters `published: true`, orders deterministically and selects only public DTO fields. Portfolio reads are capped at six, ordered by `sortOrder`, newest `createdAt`, then ID. FAQs are capped at twelve, ordered by `sortOrder` and ID. Drafts, project requests, owners, portfolio body/internal metadata and private relations are never selected. Valid managed FAQs replace the entire editorial set; when none exist, six maintained answers from `src/content/home.ts` render without writing any FAQ records. The live portfolio has no seeded work and displays an honest illustrated empty state. Independent read failures are contained with `Promise.allSettled`; portfolio unavailability has distinct Persian copy and FAQ falls back to editorial content. Logs contain a fixed diagnostic string, never exception objects or credentials.

Portfolio links allow absolute public HTTPS URLs without credentials, whitespace, IP literals or local hostnames; nothing is fetched from those URLs. React escapes all copy. Optional `imageKey` supports only generated ASCII raster filenames directly under `public/portfolio/`; realpath/lstat checks reject missing files, symlinks and escapes. Remote images and SVG content are not accepted. Next's image optimizer is limited to `/portfolio/**` with no query string. These read-only presentation rules are not an upload system: prompt 09 must explicitly publish validated, authorized public assets without exposing private attachments. No CMS editor is implemented.

The small FAQ client island uses native buttons, labelled panels, `aria-expanded`/`aria-controls`, one expanded answer, Enter/Space and optional Arrow/Home/End focus navigation. Server-rendered triggers remain disabled until their real handlers are attached; a delayed-JavaScript browser regression verifies this boundary. All answer text is present in server HTML. No accordion dependency was added.

`HeroWorkshop` and `HandDrawnLine` are original inline decorative SVG components. They consume dedicated semantic artwork variables, have deterministic markup, explicit geometry and no filters, assets, IDs or runtime drawing code. The illustration represents digital construction, not a working product dashboard. Hero copy and normal text provide the meaning; decorative SVGs are hidden from assistive technology. One brief CSS star entrance and small hover translations respect reduced motion; no timers or scroll listeners are added.

The mobile menu reuses Radix Dialog and has a compact scrollable surface rather than an oversized full-screen drawer. Its own client state controls open/close. Radix supplies Escape, focus trapping/restoration and backdrop dismissal; `Dialog.Close` wraps each navigation link. A single media-query listener closes it when the desktop navigation becomes available. Header navigation stays in document flow, avoiding sticky overlap and large backdrop-filter surfaces. The server footer computes its Persian-calendar year with the Tehran timezone; static routes refresh it on the next build/render, with no manually edited year.

The theme pre-paint script remains synchronous and defaults to light. The toggle subscribes to local and storage events; it also rereads the persisted preference at subscription time, covering a change that arrives between head-script execution and hydration. Real browser checks cover blocked storage, reload/navigation persistence, cross-tab changes and deliberately delayed JavaScript hydration. No theme provider wraps the server-rendered page.

## Database

MySQL with Prisma ORM 6.19.3 was selected because matching client/CLI and the Windows engine were available locally, unlike Drizzle dependencies. Preserve this stack for the current continuation; the selected authentication release explicitly supports Prisma 6 peers, so do not couple auth progress to an unnecessary ORM rewrite. ORM maintenance/security and any justified upgrade remain release-hardening decisions requiring migration/regression verification. Prisma's v6 pooling configuration is documented by [Prisma](https://www.prisma.io/docs/orm/v6/prisma-client/setup-and-configuration/databases-connections).

Through Prompt 07 the schema contained 18 models: the original User, Account, Session, Verification, Service, ProjectRequest, Project, ProjectStatusHistory, Ticket, TicketMessage, PortfolioItem, Faq, SiteSetting and RateLimit, plus ProjectRequestStatusHistory, AdminNote, AdminOperation and ProjectAuditEvent from the additive request/management phases. All ownership relations use foreign keys. Most identities are application-generated CUIDs with indexed foreign keys. Database timestamps use millisecond precision; store and interpret them as UTC. Money is an integer decimal intended for Iranian toman; customer preferences are not studio prices. Do not convert monetary values to floating point.

Deletion of business owners and audit actors is restricted; disable accounts instead. Sessions/accounts cascade with a user; optional assignment/content links become null. Requests have at most one project. Status history is append-only by application policy, not enforced by a database trigger; future project mutations must write the current status and its history in one transaction. Ticket mutations must enforce project ownership in server code. Generic settings must have per-key Zod schemas and a public allowlist before use; never store secrets there.

Connections are lazy and reused through one process-global Prisma client. The app uses a five-connection pool with bounded connection/pool timeouts; scripts disconnect in `finally`. No request-path connect/disconnect cycle. SQL uses Prisma parameters; the limiter's MySQL upsert uses a tagged parameterized query. Schema changes use checked-in migration SQL and `migrate deploy`; do not use `db push` as migration history. MySQL DDL is not transactional: back up real data before future destructive changes. No seed data is manufactured.

The current Windows sandbox cannot spawn Prisma's native engine from Node. `scripts/prisma-local.ps1` uses supported local engine-path environment variables for generation, then starts the installed matching engine as a hidden native process and sends its real migration protocol. Initial SQL was generated by that engine; application and rerun were verified against its own `_prisma_migrations` ledger. `db:init:windows` is the verified fallback. Keep this helper pinned to the matching Prisma release and prefer the standard CLI outside this constrained environment. Native scripts use Node's built-in environment-file loading and TypeScript stripping, avoiding an additional transpiler process.

Prompt 03 adds only nullable `PortfolioItem.category` (100 characters) through `202610240002_portfolio_category`. The helper now accepts a validated new migration name and `-FromDatabase` for engine-generated incremental diffs, refusing to overwrite SQL. Migration application, rerun (zero pending) and an independently created fresh MySQL schema were verified. Portability correction: the Windows database's `lower_case_table_names=1` caused its engine diff to use `portfolioitem`. This newly created, unreleased migration was normalized to schema-canonical `PortfolioItem` after initial local application, and only its new local ledger checksum was synchronized after verifying the original checksum, applied row, server mode and actual column. This is recorded explicitly; no prompt 01/02 migration or historical ledger row was modified. Do not edit released migrations this way.

`test:content-db` creates a strictly named random local database with local root credentials, applies the real checked-in DDL, tests publication/fallback/freshness, and drops only that database in cleanup. It does not manufacture a Prisma ledger or insert fixtures into the configured app database. The public server always uses the existing bounded application client, never these test credentials.

## Authentication and account boundaries

Better Auth 1.7.12 with its matching official Prisma adapter uses the existing User/Account/Session/Verification tables, MySQL provider and explicit transactions. No schema migration was necessary. The service factory is server-only, instantiated lazily with the canonical origin/private secret. Its narrow HTTP wrapper validates strict shared Zod inputs, exact origins, bounded JSON bodies and atomic database rate limits before calling actual library operations. Raw library endpoints are not mounted publicly. User creation independently forces USER/unverified email. Session tokens remain in HttpOnly cookies and database records, never public DTOs.

The established versioned scrypt format is wired through documented callbacks and shared by controlled bootstrap. Signed opaque sessions expire after seven days; password changes require current credentials and a server-enforced one-hour freshness check. The library transaction revokes old sessions, updates the credential and creates a replacement atomically. Fault-injection tests verify rollback. Logout revokes the active session. Current disabled status/role is re-read, with no cookie session cache.

Account forms provide Persian validation, password visibility and real pending/error states. Inputs are disabled until hydration and forms explicitly use POST, preventing credentials in GET URLs before JavaScript attaches. Account transitions discard stale router state; other tabs and persisted pages revalidate. Dashboard shells show actual identity/counts and honest reserved-feature states. Customer requests, ADMIN project management and customer execution visibility operate through separate authorized services. Prompt 08 adds real support submission/conversations through a separate authorized service; content editors remain deferred.

Configuration is AUTH_ENABLED, BETTER_AUTH_SECRET and existing SITE_URL/DATABASE_URL. The inactive flag remains fail-closed. No email provider/reset/verification UX claims operational delivery. The provider contract is preparation only. See [AUTHENTICATION.md](AUTHENTICATION.md) for cookie/CSRF policy, rate windows, trusted-ingress limits, bootstrap and security verification.

## Security and environment

`.env` and local data are ignored. Configuration rejects remote database/site origins. Dev and production-build servers bind to loopback. All responses carry noindex headers and metadata; robots disallows all crawling and sitemap is empty. Deploying requires a deliberate later environment/indexing policy, never just setting a production-looking URL.

Headers include frame denial, nosniff, limited permissions, referrer policy and a same-origin CSP. CSP permits inline Next bootstrap/theme scripts and style attributes; it is a baseline, not strict nonce-based XSS protection. Dev additionally permits eval and local HMR websockets. HSTS is omitted for local HTTP. React escaping is the content boundary; do not render untrusted HTML. The inline theme script contains only a static string.

`assertSameOrigin` is a reusable future mutation check. The credential limiter is attached to registration/login/password changes and uses atomic shared MySQL counters; concurrent requests and unavailable storage are tested. `auth:cleanup` removes expired authentication records only. No client-supplied forwarding header should define an identity without a trusted proxy configuration. Upload policy is architecture only: future endpoints must authorize, bound streaming sizes, inspect signatures, reject SVG, use random keys outside public/, and scan files. There are no uploads now.

## Operational limits

All work is local. No production URL, contact details, hosting configuration or deployment is invented. npm's registry connection is restricted in the implementation environment. Only dependency files and licensed font assets were reused from local installations; no other application's source, database or configuration was imported. Local staging/backups are ignored. The reviewed complete registry lock passed isolated script-disabled offline npm ci; matching local Prisma engines were provisioned and client generation verified. A fresh online audit and ordinary lifecycle-enabled install remain release checks.

Prompt 02 recovered browser testing through the already available local Chromium debugging endpoint. The test-only CDP runner creates and closes its own isolated contexts and disconnects afterwards. It validates loopback endpoints and does not require changes to application headers, auth guards, production configuration or user tabs. Standard worker spawning and Next dev are still constrained; the verified product runtime remains local build/start. See `TESTING.md` and `IMPLEMENTATION_STATUS.md` for actual results and outstanding tooling gates.

## Verification isolation and local build

`scripts/verify-auth.ps1` creates a random owned MySQL database from existing migrations, bootstraps a real test administrator, starts its own loopback server on port 3100, runs real HTTP/CDP security suites and removes only that owned database in finally. A nonce marker and unchanged live counts prevent destructive cleanup against application data. Browser contexts are isolated; existing user tabs are not used. `build:local` selects supported Next in-process webpack/TypeScript API compilation and worker threads for this subprocess-restricted host; it skips no checks and changes no permissions. Standard build remains available on normal hosts.

## Prompt 05 customer request workflow

See [REQUESTS.md](REQUESTS.md) for exact contracts, transaction/ownership invariants and Prompt 06 continuation. The existing optional dashboard catch-all now resolves /dashboard/requests, /dashboard/requests/new and /dashboard/requests/[id], retaining profile/ticket boundaries. Form recovery and new request APIs are Node dynamic/no-store routes. All service methods authorize a real USER internally; list/detail/summary use database owner constraints. ADMIN retains its separate area and no customer mutation permission.

The additive 202610240003_customer_requests migration retains existing RequestStatus values and legacy fields, adds nullable canonical category/preferences/link/idempotency fields, and creates the separate ProjectRequestStatusHistory entity (15 models total). No managed-project execution status is reused. Unique owner/key plus owner-row locking serializes submissions across instances; normalized-payload SHA-256 rejects conflicting reuse. Creation/rate budget/initial attributed history share one transaction. Committed replay/recovery is separate from new-operation budgeting. Forwarding headers remain untrusted.

Customer form recovery keeps only an operation identifier in its URL, with no authoritative localStorage/draft database. Actual committed results are checked after reload; recoverable errors retain live form inputs. Marked open drafts can reauthenticate in a separate tab without being discarded by AuthSync; all server authorization remains fresh. Safe destination handling now spans registration as well as login. Server list/detail/summary stay React Server Components; only form submission/recovery is a new client island. Query/body bounds, non-HTML text, public HTTPS links, filtered/paginated DTOs and sanitized errors are enforced.

scripts/verify-requests.ps1 reuses the owned MySQL/loopback/CDP workflow and runs all prior auth/HTTP/browser suites plus real request tests. Its artifacts live under test-results/prompt05; previous phase artifacts remain untouched. RequestsOnly is a targeted iteration option; the accepted full run includes all suites. Cleanup also verifies unchanged live request/history/project counts. At Prompt 05 completion, review/conversion was intentionally unavailable; Prompt 06 implements it separately below.

## Prompt 06 administrative processing

[PROJECT_MANAGEMENT.md](PROJECT_MANAGEMENT.md) describes the management contract. `src/shared/management-contracts.ts` defines strict schemas/state maps; `src/server/management/service.ts` owns ADMIN-authorized queries and transactional mutations; `http.ts` applies origin/body/response handling; `runtime.ts` wires existing Prisma/auth/config. `/api/admin/[...management]` exposes bounded reads and six mutation actions. Existing account overview and customer handlers remain independent.

Admin request/project pages use the existing optional catch-all boundary and shared server page loaders/views. A small client form island handles validation, confirmation, real loading/errors, stable operation keys and interrupted-response recovery. The installed Radix dialog supplies modal behavior; no dependency or animation system is added.

The fourth additive migration adds versions, scheduling, public decline explanations and separate private notes, operation ledger and metadata audit. Conversion enforces the existing unique originating-request relationship. Sorted actor/assignee row locks, target locks, explicit versions and READ COMMITTED transactions prevent stale writes. Status/history, metadata/audit and conversion/initial history commit atomically with rate counters and operation acknowledgments. See the management document for the isolation-level rationale and retry/assignment rules.

At Prompt 06 completion, private notes were absent from customer selects and only approved decline explanations/a minimal converted boolean extended owned requests. Prompt 07 below adds separate permitted execution routes and an owner-verified reference without exposing ADMIN DTOs. The management harness extends earlier isolated suites and live-count-verified cleanup, with artifacts under `test-results/prompt06`. Accepted historical results remain in `docs/history/PROMPT05_COMPLETED_*` and earlier files.

## Prompt 07 customer visibility

`src/server/projects` implements separate current-USER reads and HTTP contracts; `src/shared/customer-project-contracts.ts` holds bounded filters/customer labels; `src/components/projects` renders server-only list/detail/status/timeline/dashboard and original empty SVG. `/api/projects`, `/api/projects/[id]` and `/api/projects/summary` are read-only and no-store. The dashboard catch-all adds projects without changing ADMIN workflows or state maps.

Explicit owner predicates and narrow projections exclude internal description, assignee/contact, notes/audits/operations, versions and history note/actor. Related request/project links have independent owner predicates. The owned request adds only managedProjectId navigation, not a raw project relation. Dashboard groups and three-item recent lists share four authorized transactional queries, with no client dataset fetch/polling. Existing indexed owner relationships suffice; schema/migrations/dependencies are unchanged. CUSTOMER_PROJECTS.md records the exact DTO and behavior.

The new harness executes all backend regressions and customer-project tests in a fresh marker-owned database and checks every model's live count on cleanup. CDP outputs honor the new artifact prefix. Approved Chrome MCP inspection is separately documented and does not replace a claimed run of preserved Playwright suites: current acceptance is pending the endpoint/screenshot limitations in TESTING.md.


## Prompt 08 support architecture

`src/server/tickets` provides separately authorized USER/ADMIN reads, strict HTTP dispatch, transactional writes and explicit DTOs; `src/shared/ticket-contracts.ts` holds canonical categories/states/validation. Specific optional-catch-all `/api/tickets/[[...support]]` and `/api/admin/tickets/[[...support]]` precede the existing management catch-all without changing its routes. Existing dashboard page allowlists dispatch tickets/new/detail to Server Components; only validated forms/read receipts are client islands. Actual support summary components supplement existing project/request/account queries.

Additive migration 005 extends Ticket/TicketMessage and adds TicketStatusHistory, TicketNote and TicketOperation: 21 models/five migrations. It preserves all four old SQL files, original fields/records, enum values and AdminNote exactly-one-target CHECK. No backfilled fictional messages, roles or events exist. Separate private notes and actor/key/digest operation results never enter customer selections. Related project id/title requires an independent persisted owner match.

Actor then target row locking under READ COMMITTED serializes append/status operations; explicit expectedVersion protects decisions, while distinct replies can append without unrelated-version loss. Message/status/history/limiter/result commit together. Same-key recovery precedes quota/version checking; deadlock conflicts return 409 and storage failures 503 without raw exceptions. Persisted sequence watermarks implement personal customer and shared-support inbox unread state. An explicit successful-render POST acknowledges only displayed messages, with monotonic/no-activity side effects. Indexed bounded lists, twenty-message pages/older links and three-item summaries avoid unbounded client datasets/polling.

SUPPORT_TICKETS.md contains exact routes, DTOs, state/read/retry/rate boundaries. The current TESTING.md records all executed checks and genuine screenshot review; earlier Prompt 07 pending-browser statements above were superseded by its accepted recovery report. No dependency/remote service or custom auth is introduced. CMS remains Prompt 09; attachments/notifications/realtime remain deferred.

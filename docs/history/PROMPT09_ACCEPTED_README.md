# NovAir V1 — local development

Persian RTL digital studio application using Next.js App Router, React, strict TypeScript, Tailwind, Prisma and local MySQL. The public landing is preserved; Prompt 04 adds real Better Auth registration, sessions, USER/ADMIN authorization and account dashboards. Prompt 05 adds customer requests/tracking. Prompt 06 adds transactional ADMIN management. Prompt 07 adds read-only owned project visibility, genuine timelines and the personalized customer dashboard. Prompt 08 adds real secure support tickets, replies, shared unread tracking and separate private notes. Prompt 09 adds the integrated secure content editors, publication and focused public settings. Nothing is deployed.

## Manage public content locally

Prompt 09 is accepted locally; Prompt 10 has not started. Apply the sixth additive migration with npm run db:init:windows on this host (or db:init on a normal host), build:local and start. Existing data/five old migrations are preserved. Log in with a real bootstrapped ADMIN and open /admin/content. Services, portfolio and FAQ support private drafts, saved preview, publish/unpublish and numeric ordering; standalone FAQ/portfolio drafts can be deleted after confirmation. Services remain archived to protect historical requests and canonical categories.

/admin/content/settings edits only public introduction/footer/contact fields and explicit editorial fallback choices. Blank contacts are omitted; no secrets/roles/security/hosting option is editable. First publish/republish retires a section's fallback so unpublishing everything cannot unexpectedly restore defaults. Fresh public navigation/reload reads one consistent current snapshot without rebuild/restart. The compact landing intentionally shows summaries, not private editorial working bodies.

Portfolio imagery uses a verified local static catalog, not an upload feature. The original studio illustration is available as a cover; real customer work still requires authorized factual copy/appropriate artwork. No fake portfolio or contact was added to the application's database. See [CONTENT_MANAGEMENT.md](docs/CONTENT_MANAGEMENT.md) for assets, DTOs, roles, operations, cache behavior and limitations.

Run npm run test:content for full owned-MySQL backend regression, or npm run test:content:browser-tools to keep its nonce-owned fixture for the authorized Chrome workflow. Current evidence: 212 unique Node scenarios, 24 browser groups, 300 axe executions with zero detected violations, 33 actual inspected screenshots. Latest build/typecheck/lint/MySQL and main-application HTTP checks pass. The 95 retained direct Playwright cases remain unverified, and no full V1 production-release certification is claimed. [Testing evidence](docs/TESTING.md) and [implementation status](docs/IMPLEMENTATION_STATUS.md) retain earlier phases and actual limitations.


Read [implementation status](docs/IMPLEMENTATION_STATUS.md) for acceptance/results, [authentication](docs/AUTHENTICATION.md) for security decisions, [architecture](docs/ARCHITECTURE.md), [design system](docs/DESIGN_SYSTEM.md), and [testing](docs/TESTING.md). Historical reports remain under `docs/history`.

## Run the existing application

From this repository in local PowerShell:

```powershell
npm run db:check
npm run build:local
npm run start
```

Open **http://127.0.0.1:3000**, exactly matching `SITE_URL`. Local `.env` and database records are preserved. Stop a running application before rebuilding so it cannot reference stale asset hashes. `build:local` uses supported Next in-process webpack/TypeScript API compilation and worker threads because this execution host rejects child workers. It does not skip checks or alter permissions. Ordinary `npm run build` / `npm run dev` remain available on normal hosts; both standard worker/dev launch paths encounter `spawn EPERM` here. All servers bind to loopback.

## First setup on a normal machine

Requires Node 22.12–24.x, npm, and Docker or an existing local MySQL. Use the checked-in complete lockfile:

```powershell
npm ci
node scripts/setup-local.mjs
npm run db:up
npm run db:init
npm run dev
```

Setup generates random local credentials and auth secret, never overwriting `.env`. Do not use blank `.env.example` credentials. Compose uses MySQL 8.4 LTS. Existing native Windows MySQL can instead use `powershell -NoProfile -File scripts/start-local-mysql.ps1` and `npm run db:init:windows`. The helper binds 127.0.0.1:3307, keeps data under `.data`, verifies ownership and installs no Windows service. Existing local installations may supply their own credentialed `DATABASE_URL`; scripts reject remote databases. URL-encode database credentials.

The restricted host's dependency recovery passed an isolated offline `npm ci --ignore-scripts` using reviewed cached registry packages. Matching Prisma native engines were retained and generation verified separately. A normal lifecycle-enabled install and fresh online advisory audit remain release checks, not claimed passes. No npm/proxy policy was bypassed. [Local dependency recovery](docs/LOCAL_AUTH_SETUP.md) records the precise promotion and limits. Prettier/Vitest are optional and currently absent; no repeated downloads are needed to work on this phase.

## Account access

Use `/register` to create a real unverified USER, `/login` to authenticate and `/dashboard/profile` to change the password. Logout revokes the active session. Password changes require current credentials and recent login, rotate the session and invalidate previous sessions. Public role selection/promotion is impossible. ADMIN routes and USER routes have separate server-validated permissions.

Email verification/recovery is unavailable; no message delivery is claimed. Keep the password securely. Project CTAs now open the real customer form, preserving the destination through login/registration. ADMIN stays in its own permitted area.

Local configuration requires `AUTH_ENABLED=true` and a strong private `BETTER_AUTH_SECRET`; `node scripts/configure-local-auth.mjs --enable` initializes missing values without printing secrets. Never commit `.env` or copy credentials into docs.

## Administrator bootstrap

Set `ADMIN_EMAIL`, `ADMIN_NAME`, and a strong unique `ADMIN_PASSWORD` privately in `.env` or the PowerShell process, then:

```powershell
npm run admin:bootstrap
```

Remove the temporary password entry afterwards. Login with those credentials at `/login` to reach `/admin`. No default administrator was created in the live database. Bootstrap refuses production/remote use, existing USER promotion and silent password replacement; repeated matching ADMIN input is unchanged. The actual CLI and administrator login were tested in isolated MySQL. Counts are real; unfinished management tools are explicitly labelled.

## Checks and maintenance

| Command | Purpose |
| --- | --- |
| `npm run build:local` | Verified constrained-host compilation/typecheck/prerendering |
| `npm run build` | Standard production build on unrestricted local hosts |
| `npm run typecheck` | Strict post-build TypeScript validation |
| `npm run lint` | ESLint, zero warnings |
| `npm test` | Native Node unit/security/workflow suite |
| `npm run test:projects` | All backend security/request/management/customer-project suites in owned MySQL |
| `npm run test:projects:browser` | Full preserved/new CDP suites; currently needs an approved usable endpoint |
| `npm run test:requests:browser` | Complete owned MySQL request/auth/HTTP/CDP regression verification |
| `npm run test:requests` | Same backend suites without CDP |
| `npm run test:auth` | Owned MySQL setup, real bootstrap, security/HTTP suites, cleanup |
| `npm run test:auth:browser` | Same, plus real CDP landing/account/dashboard browser tests |
| `npm run test:http` | Existing HTTP regressions against running port 3000 |
| `npm run test:auth-closed` | Unsupported auth operations/forged access negative HTTP tests |
| `npm run test:smoke:cdp` | Shared landing/account browser regressions via local Chromium |
| `npm run test:smoke` | Conventional Playwright worker runner; restricted here |
| `npm run db:check` / `db:verify` | Connectivity, all models, migrations, Persian storage, rollback |
| `npm run test:content-db` | Isolated real publication/fallback queries |
| `npm run db:init:windows` | Matching Prisma native-engine Windows fallback |
| `npm run auth:cleanup` | Delete only expired session/rate-limit/verification rows |
| `npm run auth:inspect` | Read-only package inventory; never certifies auth by itself |
| `npm run format:check` / `test:vitest` | Optional tools; unavailable in this installation |

Run build/typecheck sequentially: Next regenerates `.next/types`. Auth verification needs private local `MYSQL_ROOT_PASSWORD`, unused port 3100 and an existing completed build. It creates a random database with an ownership nonce, applies actual migrations, and checks live counts before dropping only its own test data. It never resets the application. Do not run auth suites concurrently against the same fixture context.

For browser tests, use an approved already-enabled local Chromium CDP endpoint (`NOVAIR_CDP_URL`, or the existing Windows `DevToolsActivePort`). Tests create/close temporary isolated contexts, use `noDefaults: true` to avoid overriding existing browser context settings, and disconnect afterwards. They do not navigate user tabs or launch/download a browser. Output is `test-results/prompt04-auth`; conventional Playwright cleanup is scoped to `test-results/playwright` and must stay there. Exact results/limitations and screenshot review are in [TESTING.md](docs/TESTING.md).

## Public content and release boundary

Only published portfolio/FAQ content is queried; six maintained editorial FAQs appear when no managed records exist. The portfolio remains honestly empty without real published work. Updates appear on the next server request without rebuilding. No fictional projects, testimonials or contacts were added. Existing schema/migrations/content remain intact.

This is local V1 work, not production release certification. Robots/noindex, local-only URL validation, security headers and no-store private boundaries remain enabled. Before remote use, deliberately review origin/HTTPS/proxy policy, email ownership/recovery, trusted-ingress rate limits, fresh audit/install and remaining release hardening. Do not deploy as part of this workflow.

## Submit and track a project request

Apply checked-in migrations first (npm run db:init:windows on this restricted Windows host), then build:local/start. Open /register or /login and choose شروع پروژه. /dashboard/requests/new accepts title, one of nine real service categories, description and optional budget/timing/public HTTPS link. Confirmation contains the actual persistent identifier; /dashboard/requests lists only the current user's records with status filter/pagination, and each detail page shows actual status/history. The dashboard summary uses real owned counts/recent requests.

If a submission response is lost, retain/bookmark that form's operation URL and retry/check the same operation. A reload recovers a committed result; it does not store unsubmitted draft text. Recoverable failures retain current inputs. Expired sessions can reauthenticate in a new tab and retry without discarding that open draft. Requests are not automatically accepted or converted into managed projects. No email notification/recovery service is claimed.

See [REQUESTS.md](docs/REQUESTS.md) for schema/statuses, idempotency/ownership/rate limits and Prompt 06 boundaries. New artifacts are under test-results/prompt05; previous phase artifacts/results remain separate. Full test:requests:browser is the release gate for this phase; -RequestsOnly is an optional targeted iteration switch, not a replacement for regression verification.

## Review requests and manage projects locally

After applying the fourth additive migration (`npm run db:init:windows`), rebuild with `npm run build:local`, then run `npm run start`. Use the existing controlled `npm run admin:bootstrap` procedure with private local environment credentials; no default administrator is created. Log in as ADMIN and open `/admin/requests`.

Review a real request before accepting it, or decline with an approved customer-facing explanation. Private notes are explicitly separate. Accepted requests can then convert into one PLANNED project; acceptance itself does not start implementation. `/admin/projects` supports status changes, optional existing-ADMIN assignment, scheduling, real history and private notes. USER accounts cannot use these management pages/APIs. Customers read only their permitted project information through separate owner-scoped views.

`npm run test:management:browser` is the complete owned MySQL/auth/customer/admin/CDP regression workflow for Prompt 06. `npm run test:management` omits browser suites; `powershell -NoProfile -File scripts/verify-management.ps1 -Browser -ManagementOnly` targets management during iteration. Neither targeted mode replaces the full gate. New artifacts go to `test-results/prompt06`, preserving prior phases. See [PROJECT_MANAGEMENT.md](docs/PROJECT_MANAGEMENT.md) for state maps, transaction/idempotency/privacy rules and [TESTING.md](docs/TESTING.md) for actual results and limitations.

## View customer projects

USER accounts can open `/dashboard/projects`, filter/paginate their own managed projects and view real execution status, plans and persisted timeline. Converted request details link to the owned project; accepted requests awaiting conversion remain distinct. `/dashboard` shows actual owned request/project totals and recent records. `/dashboard/profile` preserves truthful account information/password management. Tickets remain upcoming. Internal descriptions/assignments/notes/audits are excluded; no customer project write API exists. No fifth migration or dependency was needed.

See [CUSTOMER_PROJECTS.md](docs/CUSTOMER_PROJECTS.md). **Prompt 07 is accepted locally after acceptance recovery**, using the user-approved equivalent Chrome-tool evidence and actual visual inspection. Recovery passed 12 real functional groups, 52 fresh axe checks and 17 repeated project/MySQL tests; 44 portal screenshots were captured and inspected. Prior 125 unique Node tests/build/typecheck/lint remain preserved on unchanged application source. All 95 direct Playwright cases remain unverified through that transport; no fresh authorized reusable CDP endpoint was available and no stale endpoint/policy bypass was attempted. Exact evidence/limitations are in TESTING.md and test-results/prompt07-recovery/verification-summary.json. Prompt 08 may begin; it has not been implemented.


## Prompt 08 support

Prompt 08 is accepted locally. Customers use `/dashboard/tickets`, `/dashboard/tickets/new` and owned details; administrators use `/admin/tickets` and details. Replies are text-only, closed tickets require explicit reopen, and new replies appear on ordinary refresh. No email/attachments/realtime capability is advertised. See [SUPPORT_TICKETS.md](docs/SUPPORT_TICKETS.md) for exact role, DTO, state, unread, retry and quota rules.

Migration `202610240005_support_tickets` is additive; 21 models/five migrations preserve the existing database. Stop the owned app before Prisma regeneration; use the existing `npm run db:init:windows` helper when needed, without reset/reseed. No dependency was added and the lock maps remain consistent.

Checks: `npm run build:local`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run db:verify`, `npm run test:content-db`, `npm run test:support`. The supported separate Chrome fixture is `npm run test:support:browser-tools`; it is not a Playwright pass. `-TicketsOnly` is an iteration subset, not a full regression. Exact executed results: 165 unique Node passes, final 38-repeat, 21 Chrome groups, 204 axe runs/zero detected violations and 78 captures/38 actual visual inspections. The 95 retained direct Playwright cases remain unverified through their unavailable transport. Cleanup/recovered failures and image hashes are documented in TESTING.md/test-results/prompt08.

The configured production application was restarted locally at http://127.0.0.1:3000 and passed all 12 read-only HTTP checks again. All original values/counts and released migration hashes are preserved. The repository is ready for Prompt 09; no Prompt 09 feature or deployment was started.

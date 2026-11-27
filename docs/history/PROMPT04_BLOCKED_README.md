# NovAir V1

A local-only Persian digital studio application. This repository is independent of every other NovAir project. Prompt 01 supplies the infrastructure; prompt 02 establishes the signature SVG Hero and themes; prompt 03 completes services, published portfolio, studio approach, collaboration process, FAQ and final CTA. Authentication, request submission and dashboard features are not enabled.

**Prompt 04 is incomplete:** no reviewed maintained auth library/adapter is installed. Account-access pages are visually prepared but collect no credentials. Do not treat this as working authentication or start Prompt 05 on that assumption. Prettier/Vitest are optional; the root lockfile/reproducible install remain release requirements. See [authentication review](docs/AUTHENTICATION.md) for exact evidence and resume requirements.

The concrete compatible installation target is Better Auth and its Prisma adapter **1.7.12**, with upstream peer compatibility verified for the existing stack. In normal local PowerShell with approved registry access, run `powershell -NoProfile -File .\scripts\prepare-auth-dependencies.ps1 -SkipOptionalTools` from the project directory. It stages packages without touching the working dependency tree, secrets or database; it does not activate auth. [Local setup handoff](docs/LOCAL_AUTH_SETUP.md) describes the exact packages, reviewed sources, optional flags and continuation. No repeated sandbox registry probe is required.

Recovery identified process-injected `NPM_CONFIG_OFFLINE=true` plus inherited proxies at `127.0.0.1:9`. An authorized command-scoped `--offline=false` registry ping still failed at that proxy (`ECONNREFUSED`). The execution-environment provider must configure an approved working registry HTTPS route/proxy, or supply a complete trusted offline dependency source. No global npm or proxy policy was bypassed. See [dependency recovery](docs/DEPENDENCY_RECOVERY.md) for the exact diagnostic and minimum unblock action.

## Requirements

- Node.js 22.12–24.x and npm.
- Docker with a running engine, or a local MySQL installation. Compose uses MySQL 8.4 LTS. The Windows fallback can create an isolated data directory with an already installed MySQL server binary.
- A package registry connection for a clean dependency installation. See `docs/IMPLEMENTATION_STATUS.md` for this environment's limitations and actual verification results.

## Local setup

```sh
npm install
node scripts/setup-local.mjs
npm run db:up
npm run db:init
npm run dev
```

Open <http://127.0.0.1:3000>. The application binds to loopback. Setup creates random local database passwords in ignored `.env`; it refuses to overwrite an existing file. Do not copy the empty credentials from `.env.example` and expect database access to work.

In the current restricted environment, Next's development child process is blocked (`spawn EPERM`). The verified way to run the app is `npm run build` followed by `npm run start`. A production build here is still entirely local; nothing is deployed.

If Docker is unavailable on Windows but MySQL is installed, replace `npm run db:up` with:

```powershell
powershell -NoProfile -File scripts/start-local-mysql.ps1
```

This helper keeps all data/configuration under `.data/`, binds to `127.0.0.1:3307`, verifies the active data directory before changing accounts, and does not register a Windows service. For an existing local database, create a dedicated database/account and set `DATABASE_URL` in `.env` instead; then run `npm run db:init`. MySQL credentials must be URL-encoded in connection strings. Never point these scripts at a remote database.

For the current Windows sandbox, run `npm run db:init:windows` instead of `npm run db:init`. This sets supported Prisma engine paths for generation and uses the installed engine's actual migration protocol through a hidden native process because Node cannot spawn that executable here. It was verified to apply the initial migration and then apply zero migrations on rerun. The normal cross-platform Prisma commands remain available outside this sandbox. The fallback is pinned to Prisma 6.19.3 and must be revisited when upgrading Prisma.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local Next.js development server |
| `npm run build` | Production compilation, locally only |
| `npm run start` | Serve the local production build |
| `npm run typecheck` | Strict TypeScript checks |
| `npm run lint` | ESLint with zero warnings allowed |
| `npm run format:check` | Prettier formatting check |
| `npm test` | Vitest unit suite |
| `npm run test:node` | Same security scenarios using Node's native test runner |
| `npm run test:smoke` | Playwright against a local production build |
| `npm run test:smoke:cdp` | Same browser scenarios through an available local Chromium connection |
| `npm run test:http` | Native HTTP checks against the running local build |
| `npm run test:auth-closed` | Confirm unavailable auth endpoints/private entry points remain closed |
| `npm run auth:inspect` | Read-only dependency inventory; currently BLOCKED / exit 1 |
| `npm run test:content-db` | Published-content integration tests in a temporary isolated local MySQL database |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:migrate` | Apply checked-in migrations |
| `npm run db:check` | Verify real MySQL connectivity |
| `npm run db:verify` | Verify all models, migrations, Persian storage and rollback |
| `npm run db:init:windows` | Verified Windows sandbox initialization fallback |

The Node fallback uses `--test-isolation=none` because this restricted environment rejects test-runner child processes. Browser tests require an installed Chromium: `npx playwright install chromium` on a network-enabled machine. Do not run browser setup downloads if an existing compatible browser is available.

In this sandbox, the verified browser workflow is:

```sh
npm run build
npm run start
# In another terminal, after the local server is ready:
npm run test:smoke:cdp
```

The CDP runner connects to an already available, explicitly enabled local Chromium debugging endpoint. On this Windows machine it reads `DevToolsActivePort`; alternatively set `NOVAIR_CDP_URL` to the local browser's WebSocket endpoint. It creates temporary isolated contexts, never uses existing tabs, and disconnects after testing. It does not launch or change the browser. Current screenshots are under ignored `test-results/prompt04`; historical prompt 03's 46 passing checks remain documented. A standard-runner cleanup incident removed earlier ignored artifacts; it is recorded in the status/testing documents. Playwright now uses `test-results/playwright` for its own disposable output, separate from phase captures. CDP startup can intermittently time out; see testing documentation for the verified recovery and actual results. The standard Playwright worker runner is still blocked by `spawn EPERM`.

Run type checking **after** the build rather than concurrently: Next regenerates `.next/types` during compilation. Full root lockfile/clean-install verification remains release debt. Prettier and Vitest remain optional and unexecuted here; native Node tests, ESLint/manual formatting review and actual HTTP/CDP/database checks provide documented alternatives. Missing optional tools do not block auth development, but missing security tests still block acceptance.

## Public content

The homepage reads only published portfolio/FAQ records on each fresh server request; changes do not require rebuilding. Hero and services do not wait for those reads. There are no invented portfolio records: the live empty state is intentional. Valid published FAQs replace the six editorial answers maintained in `src/content/home.ts`; otherwise that fallback renders without seeding the database. Safe optional project links and existing local raster images are supported. Admin editing and asset publication belong to prompt 09, not an enabled upload workflow today.

The new nullable portfolio category uses a versioned migration. Apply both migrations with the existing initialization commands; see the status/architecture portability note for this Windows database. `npm run test:content-db` additionally needs local `MYSQL_ROOT_PASSWORD`, creates a strictly named random test database, applies actual migration SQL, tests real queries and deletes only its own database. It checks that application content counts remain unchanged; do not point it at remote MySQL. These credentials are never used by the public application server.

## Controlled local administrator bootstrap

Set `ADMIN_EMAIL`, `ADMIN_NAME`, and a strong 12–128 character `ADMIN_PASSWORD` in ignored `.env`, then run:

```sh
npm run admin:bootstrap
```

The command creates a real ADMIN and credential account transactionally. It refuses to modify an existing account, use a remote database, or run with `NODE_ENV=production`. Remove the bootstrap password from `.env` afterwards. No default administrator is seeded. Creating this account does not enable login. Prompt 04 remains blocked: integration with a selected library, its hash callbacks and legitimate administrator login has not been verified; no administrator was created during this phase. The trusted local bootstrap verification flag is not an email verification service. No new authentication secrets or environment variables were added.

## Continuity

Start subsequent work by reading [implementation status](docs/IMPLEMENTATION_STATUS.md), [architecture](docs/ARCHITECTURE.md), [design system](docs/DESIGN_SYSTEM.md), and [testing](docs/TESTING.md). Keep their claims aligned with executed checks. No deployment or production-service connection is authorized.

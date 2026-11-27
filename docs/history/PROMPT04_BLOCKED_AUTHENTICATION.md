# Authentication dependency review — Prompt 04

Review date: 2026-10-24. **Authentication is not implemented or enabled. Prompt 04 is not accepted.** This report distinguishes existing security utilities from an actual authentication integration.

## Current workflow policy — supersedes earlier tooling gates

The user's simplified workflow is authoritative: do not retry unchanged network failures or impossible clean installs every prompt. Better Auth is preferred, not mandatory. Prettier/Vitest are optional; existing native Node security tests, real HTTP/database checks and functional browser tests are valid execution paths, with explicit coverage/results. Formatting is reviewed with ESLint/manual inspection when Prettier is unavailable; this is not a claimed Prettier-equivalent formatter pass. TypeScript, ESLint, production build, essential security/database tests and real browser verification remain mandatory before authentication acceptance.

The complete lockfile and reproducible installation remain required before V1 release, but are no longer standalone blockers to development. An available maintained library, verified integration and security tests remain required to enable authentication. `auth:inspect` now distinguishes missing runtime/auth prerequisites from optional tool warnings and release debt, with no automatic network/install attempts or activation.

Selected user-installation target: **`better-auth@1.7.12` + `@better-auth/prisma-adapter@1.7.12`**, based on their official stable release/tagged manifests. Declared peers cover this project's Next 16, React 19 and Prisma 6. This is upstream peer-level compatibility, not a passed installed-runtime/security certification. Actual installed types, MySQL/session behavior and the resolved dependency audit still need review. [LOCAL_AUTH_SETUP.md](LOCAL_AUTH_SETUP.md) contains primary references and the normal-PowerShell procedure. The helper stages dependencies without replacing the working app, running lifecycle hooks, copying secrets or touching data. It has been parsed and exercised in `-PlanOnly` mode; its online installation branch has not run in the sandbox. No repeat registry probe was made for this policy update.

## Recovery follow-up: actual offline/network cause

The recovery investigation went beyond the earlier offline-only attempts. `npm config list` attributes offline mode to `NPM_CONFIG_OFFLINE=true` in the process environment; the configured project/user/global npmrc files are absent. Inherited `HTTP_PROXY`, `HTTPS_PROXY` and `ALL_PROXY` point to `http://127.0.0.1:9`. A single authorized `npm.cmd ping --offline=false` against the official HTTPS registry, preserving proxies and strict TLS, failed with `ECONNREFUSED 127.0.0.1:9`. The override removed npm's offline-cache restriction for that command but could not reach the environment-provided proxy.

No proxy/network controls were removed or bypassed and no further package-install workaround was attempted. Authentication remains disabled. The environment provider must supply an approved working proxy/HTTPS route to `registry.npmjs.org:443` in the execution session, or a complete trusted offline dependency source. Changing global npm offline configuration alone is insufficient. Exact command, sanitized sources, failure and resume procedure are in [DEPENDENCY_RECOVERY.md](DEPENDENCY_RECOVERY.md). Existing dependency, database and test-artifact state was preserved.

## Dependency decision

Latest recheck (2026-10-24 01:23 UTC) after the reported dependency-access repair still failed at the inherited `127.0.0.1:9` proxy using command-scoped `--offline=false`. Process offline/proxy settings remain unchanged and no persistent User/Machine replacement was found. No package was installed or authentication endpoint enabled. The permitted network configuration must be made available to the actual tool process/session; the existing gate and resume checklist remain in force. Detailed evidence is appended to `DEPENDENCY_RECOVERY.md`.

The earlier review had no selected/installed version. The current user-installation target is now pinned in the handoff above, while no authentication library is installed in the working tree. The previously inspected workspace, staging tree, known package-source locations and npm cache did not supply Better Auth or Auth.js. Other application source or account data was not imported.

Existing installed versions: Node 24.16.0, npm 10.2.5, Next 16.4.2, React/React DOM 19.3.1, Prisma CLI/client 6.19.3 and TypeScript 5.9.3; native local MySQL 9.5 remains the runtime. Next's installed peers allow React 19 and its Node engine allows the current runtime; installed Prisma client peers allow the current TypeScript and paired CLI. These facts validate only the existing framework inventory, not an absent authentication library or its adapter.

`npm config get offline` returned `true`; the registry is `https://registry.npmjs.org/`. No global npm setting was changed. A clean-resolution attempt copied this application's manifest into ignored `.local-tools/prompt04-install`, then ran:

```powershell
npm.cmd install --prefix .local-tools/prompt04-install --package-lock-only --ignore-scripts --offline --cache .npm-cache
```

It failed with `ENOTCACHED` fetching `@prisma/client` metadata. This isolated attempt did not replace working `node_modules` or fabricate a root lockfile. Offline metadata resolution for `better-auth` and `next-auth` also failed with `ENOTCACHED`. Targeted Prettier/Vitest retrievals failed the same way. A partial staging lockfile is not a valid lockfile for the complete application's manifest, so it was not copied to the root. `npm ci` cannot validate this unlocked application and was not claimed as passed.

The read-only `npm run auth:inspect` records installed versions, selected package engine/peer declarations, missing declared packages and root lockfile presence. Its current result remains **BLOCKED**, exit 1, because the library/integration is absent. Optional tools and release debt are now separate fields and do not cause that development block. It never installs packages, reads secrets, enables routes or certifies security. A future `PREREQUISITES_PRESENT_REVIEW_REQUIRED` result requests further installed-type/compatibility/advisory/security verification; release reproducibility must still be completed before V1 ships.

## Official reference review and limits

- [Better Auth installation](https://better-auth.com/docs/installation): package, secret/base-URL configuration and handler mounting requirements were reviewed. No secret or handler was added while the dependency gate failed.
- [Prisma adapter](https://better-auth.com/docs/adapters/prisma): current documentation describes the Prisma adapter and notes existing Prisma 6 clients can remain without a required driver adapter. This does not establish compatibility of an unavailable exact library version. Keep MySQL; do not copy the PostgreSQL example or replace the datasource.
- [Next.js integration](https://better-auth.com/docs/integrations/next): real API handler and server session lookup patterns were reviewed. Proxy alone is not sufficient authorization.
- [Official security advisories](https://github.com/better-auth/better-auth/security/advisories): the advisory index was reachable and contains published issues. This was not a complete version-specific audit; there is no installed candidate against which to resolve affected/fixed ranges. Do not claim any candidate is vulnerability-free. No OAuth/SSO or other provider is enabled or requested.
- npm's `better-auth/latest` metadata could not be read through the web connector either. A remotely viewed documentation page cannot supply verified installed types or an integrity-checked dependency tree. No tarball/manual-source workaround was used to evade the offline installation boundary.

## Actual application boundary

- No `/api/auth/*` handler, registration/login/password-change mutation, session issuance/lookup, signed token or authentication client was added.
- Existing proxy plus page/layout guards continue to deny all dashboard/admin access. Forged cookies/identity headers never establish a principal. This is denial of access, **not working session validation or role-based authentication**.
- Database role default, credential/session models, versioned scrypt utility, origin helper and database limiter remain foundations. The limiter is not activated on any endpoint. It has not been certified as authentication abuse protection.
- `/login` and `/register` render polished server-only unavailable states, no form/input, no credential request and no reset-email claim. Links lead to implemented public content or the alternate unavailable page. Project submission remains unavailable. No authenticated dashboard or fake identity is rendered.
- Existing administrator bootstrap remains a controlled local command; it was not run to create a live administrator in this blocked phase. Library hash-callback/adapter compatibility and legitimate administrator login are unverified. Its trusted local `emailVerified` assignment is not an email-delivery verification workflow and must not be reused for public registration.
- No schema change/migration, business seed, email provider, auth secret or production setting was added in prompt 04.

## Required resume work before acceptance

1. Make the selected maintained library/adapter available using the approved user-side installation procedure or a trusted local source. Inspect the actual installed types/exports/peers and applicable advisories. Do not repeat unchanged sandbox failures. Generate/verify the full root lockfile and reproducible installation when feasible and before V1 release, without treating optional tooling as an auth-development blocker.
2. Compare the actual library schema with User/Account/Session/Verification and incremental migrations. Preserve existing content and historical migrations. Wire and test the existing password encoding only through documented library callbacks, or explicitly migrate it; never silently assume default hashes match.
3. Implement public USER-only registration with server validation, normalized unique email, race handling and unverified email state. Implement login/logout/password change, real library sessions, expiry/revocation, disabled-account rejection and session invalidation after password changes. Do not add public administrator registration.
4. Establish trusted same-origin handling, CSRF protection, HttpOnly/SameSite cookies and environment-appropriate Secure flags without weakening HTTPS production policy. Bound body/password/hash work and activate atomic database-backed limits. Do not trust forwarding headers on this direct loopback server; a future proxy requires explicit trust configuration. No rate-limit identity may come solely from attacker-supplied headers.
5. Replace deny-all guards deliberately with session-backed authorization at route **and** data/mutation boundaries. Read IDs from the validated session; constrain owner queries server-side. Define explicit USER/ADMIN navigation and safe internal return routing, avoiding stale principal caches after logout.
6. Implement the branded functional forms, password visibility, field validation/focus/loading states and authenticated account/dashboard/password-change screens. Keep project/ticket features truthful. No recovery or verification success may be shown without a working provider; provider-backed recovery remains unimplemented.
7. Test real registration, duplicates/concurrency/escalation, credential errors/enumeration, sessions across reload, logout/revocation/expiry, password changes, CSRF, rate-limit concurrency, ownership, protected mutations and a real bootstrapped administrator in isolated MySQL. Add actual browser form and dashboard checks at all requested widths/themes. Existing blocked-boundary tests do not satisfy those acceptance criteria.

Do not advance to Prompt 05 as though these security requirements were complete. See `IMPLEMENTATION_STATUS.md` for actual current checks and tooling limitations.

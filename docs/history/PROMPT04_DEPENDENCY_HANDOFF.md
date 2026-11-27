# Local authentication dependency handoff

Current development policy: do not repeat unchanged sandbox networking failures. Prettier and Vitest are optional; native Node tests and actual browser/security/database checks remain required. A complete root lockfile and reproducible installation are V1 release requirements, not reasons to repeat an impossible clean installation every prompt. No authentication endpoint may be enabled until the library integration and essential security tests actually work.

## Selected installation target

Use **`better-auth@1.7.12`** and **`@better-auth/prisma-adapter@1.7.12`**, pinned together. Better Auth is the selected preferred candidate, not a requirement to keep it if a better maintained compatible solution becomes available. Neither package is installed or runtime-verified in this workspace yet.

Primary references reviewed on 2026-10-24:

- [Official stable release v1.7.12](https://github.com/better-auth/better-auth/releases/tag/v1.7.12), published October 20.
- [Tagged Better Auth manifest](https://raw.githubusercontent.com/better-auth/better-auth/v1.7.12/packages/better-auth/package.json): peers include Next 14/15/16, React/React DOM 18/19 and Prisma/client 5/6/7. It exposes `better-auth/next-js` and `better-auth/adapters/prisma` and depends on the official Prisma adapter.
- [Tagged adapter manifest](https://raw.githubusercontent.com/better-auth/better-auth/v1.7.12/packages/prisma-adapter/package.json): adapter version 1.7.12, Prisma/client peers 5/6/7.
- [Official Prisma adapter documentation](https://better-auth.com/docs/adapters/prisma): retain the existing Prisma 6 client/datasource; do not copy PostgreSQL example configuration over MySQL.
- [Official advisory GHSA-965c-763c-88jm](https://github.com/better-auth/better-auth/security/advisories/GHSA-965c-763c-88jm): the documented Magic Link/OAuth issue affects versions below 1.7.7 and is patched in 1.7.7. Version 1.7.12 is outside that affected range. NovAir does not enable those providers/plugins. The release also includes later security-related fixes. This is a specific advisory review, not a complete dependency audit or a vulnerability-free certification.

| Existing package | Version | Declared upstream compatibility |
| --- | --- | --- |
| Next.js | 16.4.2 | `^16.0.0` |
| React / React DOM | 19.3.1 | `^19.0.0` |
| Prisma CLI / client | 6.19.3 | `^6.0.0` |
| Node.js | 24.16.0 | Retained; verify installed transitive engine requirements during npm resolution |

These peer declarations justify this exact installation target. Actual installed exports/types, transitive engines, MySQL behavior, password callback compatibility and the full resolved dependency audit remain to be checked. A source manifest containing workspace/catalog references is not an npm lockfile; install published registry packages, not GitHub source archives.

## Run once in normal local PowerShell

Use a normal local PowerShell session whose registry/proxy configuration is already approved and working. The helper keeps inherited proxies and TLS validation. It cannot fix a session still configured with an unavailable policy proxy. It never changes global npm configuration, uses `--force`/`--legacy-peer-deps`, clears proxy settings or disables TLS verification.

```powershell
Set-Location -LiteralPath 'D:\WorkSapace\NOV'
powershell -NoProfile -File .\scripts\prepare-auth-dependencies.ps1
```

The helper:

1. Copies only the existing package manifest into a new unique directory beneath `.local-tools/`, adding the two exact authentication dependencies to that copy.
2. Runs official-registry npm installation there with command-scoped `--offline=false`, no automatic fetch retries and the workspace's ignored `.npm-cache`. It generates a **staged** lockfile. It does not replace root `package.json`, `package-lock.json` or `node_modules`.
3. Uses `--ignore-scripts` so package lifecycle hooks cannot mutate the application or start engine downloads before review. It does not copy `.env`, run Prisma migrations or create accounts.
4. Verifies the staged direct dependency graph and both installed package versions, then writes `.local-tools/auth-dependencies-ready.json` containing the exact stage location and explicit unverified audit/clean-install flags.
5. Stops on failure with the working application and existing artifacts untouched. Keep the reported error; do not repeatedly retry an unchanged cause.

Optional tooling may be omitted from the **staged copy** if needed:

```powershell
powershell -NoProfile -File .\scripts\prepare-auth-dependencies.ps1 -SkipOptionalTools
```

This does not remove tools from the working manifest or existing tests. A stage created with this switch cannot be copied to the root as a matching complete release lockfile without a deliberate manifest decision and verification later.

To inspect the plan without installation or network access:

```powershell
powershell -NoProfile -File .\scripts\prepare-auth-dependencies.ps1 -PlanOnly
```

## Continue after staging succeeds

Return to the agent after the script reports successful staging. It will read the receipt, inspect the actual installed library/types/adapter, review an audit produced through an approved connected environment, and transfer the reviewed dependency setup into the application with a recoverable backup of working dependencies. It must not blindly copy staged modules, run `npm ci` against the live tree, copy an incompatible lockfile, or change schema/history before review.

Then resume the existing Prompt 04 implementation checklist: real registration/login/logout/sessions/password change, origin/cookie/CSRF handling, database-backed limits, USER/ADMIN authorization, bootstrap and personalized dashboards. Authentication is still disabled until the integration is complete and verified. No application redesign, database reset or Prompt 05 work is needed.

The isolated user-side installation is dependency preparation, **not** a completed clean-install, security audit, authentication implementation or release certification. Review/permit only the necessary lifecycle steps later, including Prisma client generation using the verified local workflow. Full lockfile/clean-install evidence must be collected once access permits and before V1 release; it is not retried automatically in every prompt.

# Local authentication dependency integration

The user-prepared staging receipt `.local-tools/auth-dependencies-ready.json` has been reviewed and integrated locally. The former handoff remains in [history/PROMPT04_DEPENDENCY_HANDOFF.md](history/PROMPT04_DEPENDENCY_HANDOFF.md); do not run its staging procedure again merely because an old report said the package was absent.

## Actual recovery

1. Inspected staged package manifests, public exports and declarations: Better Auth and the official Prisma adapter are both **1.7.12**; core/adapter versions agree and peers include the current Next 16/React 19/Prisma 6 stack.
2. Verified MySQL provider and adapter transaction support. Enabled `transaction: true`; verified actual database sessions, concurrent uniqueness, password/session atomicity and role boundaries in real tests (see current status).
3. Found the staged manifest's unwanted `novair: file:../..` self-reference. Removed it and its two local lock entries only from a separate reviewed copy. No global dependency or source project was imported.
4. Verified all 523 retained lock entries resolve to the official HTTPS npm registry with integrity. Root dependencies exactly match the complete version-3 lock.
5. Performed an isolated clean offline installation: `npm.cmd ci --prefix .local-tools/auth-clean-verified --offline --ignore-scripts --no-audit --no-fund --cache .npm-cache`. It installed **449 packages successfully**. Checked actual installed versions and engine ranges, plus runtime imports.
6. Retained the old dependency tree in a workspace-local backup before promoting the reviewed clean tree. Preserved only matching-version Prisma native engines and ran real client generation. Existing source, data and migrations were preserved.
7. Offline npm audit returned exit 0 with zero reported vulnerabilities. No fresh online advisory database was fetched; this must not be described as a current online security audit. No repeated unavailable registry access, TLS weakening, proxy clearing or global npm edit occurred.

The original stage/receipt still truthfully contain `CleanInstallVerified: false` and `SecurityAuditVerified: false`, because that receipt describes the user's earlier preparation. Do not rewrite it to imply it certified later work. The isolated verification above is separate evidence. Local review files/backups are ignored, not release artifacts; the root lockfile is the versioned dependency artifact.

## Normal installation and limitations

On an approved connected local machine, use `npm ci` from the root. The checked-in manifest/lock retain exact application dependencies plus the two auth packages. Prettier/Vitest were intentionally omitted from this optional-tool-skipped installation; their configs/tests remain and native Node tests are active. Do not use `--force`, `--legacy-peer-deps`, untrusted mirrors or disable TLS.

The successful clean installation here used `--ignore-scripts`, followed by explicit matching local Prisma engine provisioning/generation. A fresh ordinary lifecycle-enabled installation and online audit remain V1 release checks. The execution session still has inherited offline/unavailable-proxy settings; staged cached packages resolved this task without bypassing them. Do not repeatedly retry the unchanged network route.

For this subprocess-restricted host, run `npm run build:local`, then `npm run start`. See [README.md](../README.md) for setup/account/bootstrap and [AUTHENTICATION.md](AUTHENTICATION.md) for exact integration/security decisions. Real verification uses `npm run test:auth:browser` with the owned isolated MySQL/CDP workflow described in [TESTING.md](TESTING.md).

# Deployment readiness — local qualification, 2026-10-24

**Actual deployment was not performed. The current application is intentionally local-only. Do not expose port 3000 or put this directory under a public document root.** See FINAL_V1_RELEASE_REPORT.md and RELEASE_CHECKLIST.md for the release decision and open gates.

## Host capability contract

| Capability | Local evidence | Required target evidence |
| --- | --- | --- |
| Node | 24.16.0, package engine >=22.12 <25 | Exact supported Node 22.12+ or 24.x, patched LTS, persistent environment and restart support |
| Application runner | Real long-running Next 16.4.2 production server on loopback | Demonstrate `next start` or a reviewed compatible runner; a cPanel PHP/static-only plan is insufficient |
| cPanel/Passenger | No account or credentials supplied | Provider must confirm supported Node, application root/start command, port binding, streaming, process lifetime and restart; Passenger's reverse port binding is not assumed compatible with this unmodified CLI |
| MySQL | Native local MySQL 9.5; six actual migrations and InnoDB transactions tested | MySQL 8.4 LTS is the Compose target but was NOT executed here; replay on the actual host version, verify CHECK/FK/utf8mb4/collation/UTC/locking and permissions |
| Prisma | CLI/client 6.19.3, native Windows engine | Generate on the target OS/architecture; verify Linux libc/OpenSSL/zlib/libgcc and exact native engine; never copy Windows node_modules to Linux |
| Resources | Local build/start succeeds | Measure available build memory/CPU, sustained runtime, pool/process connection budget and storage; no guessed minimum RAM is certified |
| Network/TLS | Loopback HTTP only | Valid domain/certificate, canonical redirect, original Host/Origin policy, private backend listener, controlled ingress, request-size/time limits |
| Backup/maintenance | Disposable encrypted native MySQL restore and real restored app verified | Off-host encrypted storage, separate key custody, scheduler, restore drill, retention/RPO/RTO and log rotation on actual plan |
| Assets | Reviewed immutable public raster catalog | Deploy exact `public/portfolio` files and font/license inventory, non-executable static location; no uploads/persistence service exists |

If the plan cannot satisfy this contract, use a compatible managed Node plan or VPS. Do not substitute static export, PHP, a different database or disabled authorization.

Reference review: [cPanel Node applications](https://docs.cpanel.net/knowledge-base/web-services/how-to-install-a-node.js-application/), [Next self-hosting](https://nextjs.org/docs/app/guides/self-hosting), [Prisma platform requirements](https://docs.prisma.io/docs/orm/v6/reference/system-requirements). These describe capabilities, not evidence for an actual account.

## Production configuration — blocked until qualification

The current SITE_URL validator deliberately permits **only canonical loopback HTTP**, DATABASE_URL permits credentialed local MySQL, bootstrap rejects NODE_ENV=production, robots/sitemap/global metadata remain noindex. Setting a domain in `.env` alone must fail. Do not bypass these checks.

Before remote launch, implement and test a deliberately reviewed production configuration profile, rather than weakening local validation. Required decisions include email ownership/recovery (release option C currently selected), exact approved HTTPS origin, database transport/least privilege, ingress source policy, public indexing and administrator provisioning. No invented environment flag certifies infrastructure approval.

Minimal proposed operator template (placeholders only; **not executable with the current local-only profile**):

```dotenv
NODE_ENV=production
SITE_URL=https://<verified-canonical-domain>
DATABASE_URL=mysql://<runtime-user>:<url-encoded-password>@<approved-private-db-host>:3306/<database>?connection_limit=5&pool_timeout=10&connect_timeout=5
AUTH_ENABLED=true
BETTER_AUTH_SECRET=<independently-generated-random-secret-at-least-32-characters>
# Provider-specific sender/credentials are deliberately absent until a real provider is selected.
# Never put ADMIN_PASSWORD or MYSQL_ROOT_PASSWORD in the long-running server environment.
```

Keep secrets in the host's protected environment/secret store outside document roots, backups and source checkpoints. Server configuration is never editable through CMS. Use a separately authorized migration credential for DDL; the future runtime credential should have only necessary SELECT/INSERT/UPDATE/DELETE permissions. The local setup account currently includes DDL for development; do not copy that privilege policy blindly.

## HTTPS and trusted ingress qualification

- Confirm the proxy overwrites, rather than appends untrusted Host/client-IP headers and prevents direct access to the backend. Allow only the canonical hostname; reject unknown hosts at ingress.
- Retain exact canonical Origin checks, SameSite=Lax, HttpOnly, host-only cookies and the library's HTTPS Secure/__Secure- behavior. Local library HTTPS-cookie tests are not TLS/proxy qualification.
- Current rate limits deliberately share one source bucket and ignore forwarded addresses. Until the actual trusted hop/address scheme is implemented and tested, global contention remains a release blocker. Do not read arbitrary X-Forwarded-For.
- Verify body-size/connection/request-rate/time limits at ingress as well as existing per-identity MySQL limits. Test forged forwarding headers, CSRF, session refresh/revocation and safe redirects over actual HTTPS.
- Apply/verify TLS-only HSTS after the domain and TLS policy are confirmed; HSTS is intentionally absent on local HTTP. Verify CSP, frame denial, nosniff, referrer/permissions policy and all private no-store responses.
- CSP currently allows framework inline scripts/styles; React escaping is the text boundary. No arbitrary HTML, SVG, iframe or rich-text editor is permitted. A nonce policy is a documented improvement, not a claimed existing guarantee.
- Keep server/build paths, private configuration, `.local-tools`, `.data`, tests, dumps, source maps and secret files unreachable from the web server.

## Build/start and migration procedure

Local review commands (no deployment):

```powershell
npm run db:check
npm run build:local
npm run typecheck
npm run lint
npm test
npm run start
```

On an approved normal local PowerShell host, `npm run release:install:qualify` creates a **new** candidate directory, uses the exact lock with normal lifecycle scripts, generates Prisma, builds and smoke-starts on 3200. It changes no global npm/proxy config, never promotes node_modules, and refuses occupied ports. Review fresh production AND development dependency advisory findings before any justified update. A failed audit stops the helper. Retain evidence; do not use force/legacy-peer-deps/TLS bypass.

Future host procedure requires separate deployment authorization: build on a matching target environment; retain previous reviewed release and verified backup; stop/drain incompatible writers; use `prisma migrate deploy` with migration credentials; check checksums/zero pending; start under the qualified process manager; perform the smoke checklist; switch traffic only after acceptance. Do not run `db push`, reset, reseed or edit six released migrations. MySQL DDL is not transactionally reversible.

Local Windows fallback: `npm run db:init:windows` uses the pinned real Prisma engine. Standard CLI/normal lifecycle installation on a normal host remains an independently required qualification; the fallback does not certify Linux/cPanel.

## Administrator provisioning

The existing `npm run admin:bootstrap` is **local operator-only**, idempotent for matching credentials, refuses USER promotion or silent replacement and refuses production execution. Supply ADMIN_EMAIL/ADMIN_NAME/a unique strong ADMIN_PASSWORD privately for the one-time command, then remove the password. There is no public administrator registration. Real bootstrap and login are tested. A host-specific protected one-time provisioning procedure still needs review/verification; do not remove the production guard merely to make hosting convenient.

## Backup, restoration and rollback

The executed qualifier is `powershell -NoProfile -File scripts/qualify-backup.ps1` while a nonce-owned verification fixture/server is active. It accepts only that marker-verified local fixture, never the active app database. Native mysqldump uses single-transaction/quick/hex-blob/no-tablespaces/GTID-off; DDL writers must remain paused. AES-256-GCM authenticates the fixture dump, tampering is rejected, and mysql restores it into a new separately named database. All 23 scalar/count hashes and semantic DDL match; only redundant explicit utf8mb4 column spelling is normalized. Restored real ADMIN/USER logins, project/ticket/CMS reads and revocation run on 3101. The restore database/key/config/plaintext are removed by exact context/marker guards. Encrypted fixture-only evidence remains private under `.local-tools`.

This is NOT a general production backup utility or evidence for cPanel restore. Establish an actual provider/native backup job with no concurrent DDL, private destination, authenticated encryption, separate restricted key vault, tested credentials and off-host copies. Secrets/configuration require a separate protected recovery record, not the same source archive. Retain reviewed manifests/lock/migrations/source/build artifact identity, font licenses and exact raster catalog hashes. Source checkpoint contains no `.env`.

Operator must select and document retention, backup frequency, RPO/RTO, incident owner and test schedule before launch. Suggested starting policy for approval: daily encrypted DB backup, retained daily/weekly generations, monthly disposable restore; this is a proposal, not a configured promise. Restrict backup readers, audit access and periodically verify recovery-key retrieval. Never store backups/keys under `public` or a hosted document root.

Rollback: restore a compatible prior application artifact only when its schema remains compatible. Otherwise place service in maintenance, restore the verified database to a NEW private destination, verify schema/data/auth/business reads, then deliberately switch connection/traffic. Reverting schema by editing migrations or restoring over live data is forbidden. A restore loses writes after the chosen backup; communicate/approve that recovery point. Secret rotation may invalidate all cookies; DB session revocation and email-provider keys must be handled separately.

## Maintenance and monitoring

Run `npm run auth:cleanup` under a qualified OS/cPanel scheduler with the correct working directory and protected environment. It deletes only expired Session/Verification/RateLimit rows in one transaction. Fresh and expired records and preservation of users/accounts/business/operation ledgers are tested. No committed operation, history, note or conversation is automatically purged. No scheduler was configured here.

Monitor process uptime/restarts, safe HTTP readiness, database connection/pool timeouts, 5xx/409/429 rates, backup freshness/restore success, disk space and sanitized log volume. Protect detailed health checks internally; there is no new public diagnostics endpoint exposing configuration. Rotate logs with restricted access; do not enable request-body/token/SQL logging. Document recovery for DB outage and network timeouts using stable operation keys.

## Post-deployment smoke checklist (future authorized host only)

Check canonical HTTPS, headers/cookies, registration/verification/recovery delivery, USER/ADMIN login/reload/logout/password rotation, denied old sessions, request submission/retry, two-admin review/conversion, owned project status/history, linked support replies/read/close/reopen, private-canary exclusion in JSON/HTML/RSC, CMS draft/publish/unpublish/freshness, reviewed images, both themes/mobile keyboard, service restart and fresh DB read recovery. Validate backup restore on isolated data, never genuine customers. Keep public indexing disabled until all release gates have passed and the operator explicitly approves public launch.

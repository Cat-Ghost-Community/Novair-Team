# NovAir V1 release checklist

2026-10-24. Current decision: **CONDITIONALLY READY — DEPLOYMENT BLOCKED**. No deployment authorized or performed. PASS means actually executed; BLOCKED requires new evidence. Local acceptance is not public-release certification.

| Requirement | Outcome | Evidence / next action |
| --- | --- | --- |
| Recoverable source/data baseline | PASS | `.local-tools/prompt10-checkpoint`, private source snapshot; public hash/count baseline |
| Build / strict TypeScript / ESLint | PASS | Fresh Prompt 10 logs; no warnings or checks disabled |
| Native regression | PASS | 32 executed cases, including two reproduced input fixes |
| Real backend business/security regression | PASS | 182 retained + 7 final release cases, isolated MySQL; repeats counted separately |
| Registration/login/session/password/roles | PASS | Real maintained Better Auth tests, bootstrap and business lifecycle |
| Ownership/private draft/note/operation exclusion | PASS | Real API/HTML/RSC canaries and current-role/disabled/revoked tests |
| Mutation validation/origin/CSRF/rate limits | PASS | Existing real negative/concurrency/fault-injection suites + release tests |
| Request/project/ticket/CMS transactions | PASS | State, history, idempotency, recovery, stale/concurrent writes verified |
| Six migrations / legacy/data preservation | PASS | Fresh replay, actual ledger/zero-pending, all original 23 model scalar/count hashes |
| Local native encrypted backup/restore | PASS | Actual mysqldump/mysql, AES-GCM/tampering, restored app logins/business reads, guarded cleanup |
| Host backup scheduling/key custody/RPO/RTO | BLOCKED | Operator/provider must approve retention, protected off-host storage, separate keys, scheduler and host restore drill |
| Real email verification | BLOCKED | Supply authorized provider/sender/test mailbox; implement/verify library token/delivery/retry/replay flow |
| Real password recovery delivery | BLOCKED | Same provider; prove single-use expiry, non-enumeration, rate limits, credential/session revocation |
| Invitation/manual lifecycle alternative | NOT APPLICABLE | Not implemented or selected; do not represent local bootstrap as public recovery |
| Public registration release gate | BLOCKED | Option C selected: no public launch until complete verified account lifecycle; local unverified registration remains truthful |
| Manifest/lock/direct packages/exports | PASS | 523 official registry integrity entries and exact installed versions; no new packages |
| Fresh complete dependency advisory audit | BLOCKED | One npm audit failed at approved proxy 127.0.0.1:9; normal operator helper supplied; selective official advisory review is not a complete transitive audit |
| Normal lifecycle-enabled exact-lock installation | BLOCKED | Isolated attempt failed at subprocess EPERM; working tree untouched; run reviewed qualifier on approved normal PowerShell |
| Actual cPanel Node/process/runtime | BLOCKED | No host evidence supplied; qualify capability contract or choose compatible Node/VPS |
| Target MySQL/Prisma native compatibility | BLOCKED | Local native 9.5/Windows differs from prospective 8.4/Linux; execute actual target replay/generation/start |
| Reviewed production configuration profile | BLOCKED | Current SITE_URL/DB/bootstrap/indexing deliberately local-only; implement/test approved production policy before any exposure |
| Actual TLS/canonical Host/proxy/source strategy | BLOCKED | Local HTTPS-cookie configuration test passes; no actual HTTPS ingress supplied; verify trusted proxy and per-source budgets |
| Public indexing/canonical domain | BLOCKED | Local noindex/robots/empty sitemap remain intentional; approve domain and policy only after other gates pass |
| Chrome functional/responsive/visual/axe | PASS | Fresh Prompt 10 approved-tool evidence and actually viewed captures; detailed scope in final report |
| Direct retained 95 Playwright cases | BLOCKED | Unchanged unauthorized CDP transport not retried or relabelled; equivalent Chrome evidence is separate |
| Firefox/WebKit functional qualification | BLOCKED | Installed engines; each official launcher attempted once and failed spawn EPERM; obtain approved normal runner |
| Manual screen-reader/device qualification | BLOCKED | Not executed; arrange actual assistive technology and representative physical devices |
| Local lab performance | PASS | Actual desktop/mobile traces and resource measurements; no field CWV/INP or Lighthouse performance score claimed |
| Host sustained load/memory/restart/capacity | BLOCKED | Run on actual qualified target; no local number certifies shared-host limits |
| Public privacy/contact/retention decisions | BLOCKED | Operator must approve actual identity/contact, use/retention/access/export/deletion/recovery policy and publish truthful notice; no fabricated legal compliance |
| Portfolio permission and factual public copy | BLOCKED | Operator must approve real work/media/consent/contact before publication; live portfolio remains honestly empty |
| Uploads/payments/blog/email notifications | NOT APPLICABLE | Outside delivered V1 scope; no dead uploader or fake delivery claim |
| Deployment | NOT APPLICABLE | Explicitly prohibited in this task; no remote connection made |

Before future release, replace each mandatory BLOCKED row with dated appropriate evidence and the responsible operator/reviewer. Do not flip statuses merely because a command was documented. Preserve failed attempts and earlier prompt reports. Review FINAL_V1_RELEASE_REPORT.md for severity and exact execution scope.

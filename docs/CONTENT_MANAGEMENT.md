# Content management — Prompt 09

Local editorial tools reuse Next App Router, maintained Better Auth sessions, Prisma/MySQL and the existing Persian design system. No new package, upload service, page builder, external notifier or public draft endpoint is introduced. Acceptance evidence is recorded in IMPLEMENTATION_STATUS.md and TESTING.md after execution; this contract is not itself a test result.

## Models and preservation

Migration `202610240006_content_management` is additive. Service keeps its original ID/slug/title/summary/body/publication/order/request relationship and adds nullable canonical category/highlights plus version. PortfolioItem adds technologies/version. Faq and SiteSetting add version. Legacy records receive version zero, preserve their publication/timestamps/values, and receive no fabricated audit events. There are 23 models and six migrations; five previously applied SQL files remain unchanged.

ContentOperation is a separate CMS actor/key/digest/minimal-result ledger, not AdminOperation or TicketOperation. ContentAudit records real actor, kind, target, action, committed version and timestamp. It does not copy text/contact payloads. User foreign keys restrict deletion; historical audit targets deliberately remain scalar IDs after an allowed draft deletion. Existing AdminNote CHECK and all project/request/ticket invariants remain unchanged.

Services are archived through unpublication, never physically deleted by the CMS. An established non-null service category cannot change. Referenced legacy null categories remain null and are labelled honestly; editing copy does not reinterpret old requests. New services require one of the nine immutable request-category IDs in request-contracts.ts. The independent request form continues to work even with zero published cards. Unreferenced legacy null categories may receive an explicit initial mapping. FAQ/portfolio physical deletion requires an unpublished current version, confirmation and an attributed audit; published deletion is rejected.

## Routes and private endpoints

`/admin/content` is the overview; `/admin/content/services`, `/portfolio`, `/faq`, `/settings` are relative sections. Each record section has `/new`, `/[id]`, `/[id]/preview`. All previews authorize ADMIN independently, are private/no-store, use actual saved values and reuse escaped public card/accordion components. A preview is never a public or published URL. Unsaved text is not represented as saved preview content.

Base `/api/admin/content`:

| Method/path | Purpose |
| --- | --- |
| GET `/` | Six genuine published/draft counts |
| GET `/services`, `/portfolio`, `/faq` | Bounded publication-filtered admin lists |
| GET `/[kind]/[id]` | Explicit editor fields, version, references and latest audit |
| GET `/settings` | Only fixed public settings, version and latest settings audit |
| GET `/assets` | Only verified existing catalog assets |
| GET `/operations/[key]` | Current actor's committed operation result |
| POST `/[kind]` | Create an explicit draft or confirmed publication |
| POST `/[kind]/[id]` | Versioned edit/publication/unpublication/order |
| POST `/faq/[id]/delete`, `/portfolio/[id]/delete` | Versioned unpublished-draft deletion |
| POST `/settings` | Fixed public-settings update |

Unsupported methods/targets never mutate business records. Private successes/failures use no-store. Lists take ten with bounded page 1–1000, order sortOrder ASC/id ASC; identical numeric ordering has a stable tie-breaker. Numeric order controls are labelled native keyboard inputs. Latest twenty audit events are disclosed when bounded.

## Authorization and validation

Every service method independently validates the real current enabled ADMIN principal. Mutations recheck the actor under an authoritative User row lock. USER/anonymous/forged/expired/revoked/disabled/role-changed authority fails closed. Mutations require exact canonical Origin, reject cross-site fetch metadata and require bounded JSON (32 KiB streaming limit). Strict Zod envelopes/content reject client actor/role/owner/slug/version relations, arbitrary security keys and unrecognized fields. Text normalizes NFC/newlines/trim, rejects controls/bidi overrides and preserves Persian ZWNJ. React renders plain escaped text; no HTML/SVG/iframe editor, remote fetch or dangerous inner HTML exists.

Public DTOs are separate from editor objects. Service exposes only id/style category mapping/title/summary/highlights. Portfolio exposes id/title/summary/display category/validated image/public URL/technology tags. Faq exposes id/question/answer. Portfolio/Service body is an editorial reference field: the compact landing deliberately does not serialize it. Public settings expose only the typed allowlist below. Internal audits, operation keys/digests/results, user/contact/ownership records and private projects/requests/tickets are never queried for public content.

## Public settings and fallback policy

Only SiteSetting key `public.studio.v1` is editable: introduction (10–350), footerText (3–150), optional email/phone and direct Telegram/GitHub/Instagram/Aparat profile links, plus explicit servicesFallback/faqFallback booleans. Blank contact fields omit links. Mailto addresses are URI-encoded so valid local-part punctuation cannot become mail-client parameters; normalized portfolio URLs are bounded again after percent encoding. Social hosts/path shapes are constrained; active schemes, credentials, local/IP hosts, known shorteners and redirect query keys are rejected. No arbitrary SiteSetting key, environment variable, credential, role, cookie, limiter or hosting option is exposed. Existing unknown/private settings remain untouched.

Before any managed publication, the factual editorial service/FAQ defaults remain available; they are never seeded as database records. A real service/FAQ publish transition automatically disables that section's fallback in the same transaction and audits the settings version. Thus unpublishing every managed item results in an intentional empty section rather than surprising resurrection. An administrator can explicitly restore the fallback in settings. A settings editor opened before a publication-induced policy change conflicts by version instead of reverting newer state. Published records always replace that section's fallback as a whole. Storage failure does not resurrect unpublished service/FAQ content.

## Freshness and consistency

The homepage retains force-dynamic rendering. React cache deduplicates only within one server request; there is no cross-request publication cache. One repeatable-read MySQL transaction reads the typed public settings and published lists from a consistent snapshot. Next request/reload sees committed edit/publish/unpublish without rebuild/restart. Existing open documents need refresh; successful admin writes navigate to a fresh saved view. Metadata/sitemap do not advertise draft records and no additional public detail pages are introduced.

Portfolio remains bounded at six, FAQs/services twelve, deterministic ordering. The honest portfolio empty state remains when no real published work exists. No private managed project is automatically imported or published, and creating an editorial item does not constitute customer consent. An administrator must enter only truthful authorized public content.

## Assets: constrained catalog, no uploader

`src/content/assets.ts` contains reviewed immutable raster keys/dimensions/byte count/SHA-256. The included original geometric NovAir workshop PNG is an abstract brand illustration, not client work or a customer screenshot. It does not create a portfolio record. No upload control, arbitrary path, hotlink, SVG injection or remote image fetch exists.

Runtime asset selection checks exact catalog membership, canonical local public/portfolio containment, regular non-symlink file, exact bounded byte count (maximum 2 MiB), reviewed digest, actual PNG signature/IHDR and declared bounded dimensions (maximum 2400×1600). A missing/tampered asset is rejected on save and omitted safely from public cards. Next Image uses fixed dimensions/responsive sizes/lazy loading. The digest binds genuine decoded onboarding output to the served source, rather than trusting extensions.

Controlled onboarding is a code-reviewed local task: obtain authorized artwork, decode/re-encode it using the already installed Next image dependency, verify raster format/dimensions/size and absence of metadata/private data, write a generated safe filename directly under public/portfolio, add its exact catalog hash/dimensions/bytes, and test the asset/public fallback. Rebuild to change the catalog; ordinary editorial publication never requires rebuilding. No claim is made that arbitrary disk additions or user uploads are supported. Never place private customer uploads in public.

## Transactions, conflicts and retries

CMS writes use READ COMMITTED, lock current User then the fixed `cms.control.v1` SiteSetting mutex. This lightweight domain-specific lock serializes edits/reorders/fallback settings across two administrators without affecting earlier management/support ledgers. Each record/settings update checks expectedVersion. New server IDs/slugs are chosen internally. The actor/key/digest lookup precedes stale-version/rate checks; identical committed retries return the original result, changed reuse is 409, different legitimate keys remain possible. Saved operation URLs and actor-only recovery endpoints resolve lost responses without duplicate creates. Expected version is part of the digest.

Material changes/publication/state/audit/limiter/operation commit together. An audit or persistence failure rolls everything back. No-op saves create no invented material audit/version/timestamp. Every successful material save increments version; stale peers refresh/compare instead of silently overwriting. Deadlock/lock conflicts are sanitized 409; storage errors 503. Rate limits are existing atomic HMAC/MySQL budgets: sixty mutations/minute/actor, shared direct-local source 300/minute. Forged forwarding headers do not change identity. Denied counters commit; exact committed replays consume no fresh quota; unavailable limiter fails closed.

## Editor behavior and scope

Native labelled Persian fields, associated inline errors/focus, disabled pre-hydration controls, actual busy feedback and retained text follow the established design. Publication/unpublication/deletion use the installed Radix confirmation, initial safe Cancel focus and Escape restoration. Result navigation occurs after actual commit/recovery. A beforeunload warning and visible unsaved notice protect open drafts; there is no claim of persistent drafts after tab closure or reload. A saved-state comparison opens an authenticated separate tab. Long copy/URLs wrap and technical values are LTR-isolated. Both existing themes and reduced-motion rules remain.

## Verification and Prompt 10

Prompt 09 is accepted locally. Build/typecheck/zero-warning lint pass; 212 unique Node scenarios passed (30 native, 20 auth, 12 HTTP, 21 requests, 29 management, 17 customer projects, 38 support, 45 CMS). Final rebuilt iterations repeat all 45 CMS scenarios rather than adding them to the unique count. Five standalone public-content groups, fresh migration/legacy/FK/unique/rollback, exact six-entry migration ledger, zero-pending rerun and original 21-model/five-SQL-hash preservation pass. Twenty-four authorized Chrome workflow groups, 300 axe executions with zero detected violations and 33 actually captured/viewed screenshots provide browser evidence. Two earlier image variants are preserved as superseded. See test-results/prompt09/verification-summary.json, browser-tools-final.json, screenshot-manifest.json and current TESTING.md for exact scope/failure history. All four completed fixture cleanups passed; private test credentials are removed. The 95 retained direct Playwright scenarios remain unverified through that launcher. No new package or deployment occurred. Historical phase reports/artifacts and migration hashes are preserved. Prompt 10 must perform final V1 release validation, fresh dependency/security review and deployment-specific persistence/origin/TLS/ingress decisions without deploying automatically. Email delivery/recovery, uploads, rich text, blog, automatic private-project publishing and analytics remain absent.

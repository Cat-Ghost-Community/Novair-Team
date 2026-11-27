import { readFile, writeFile, readdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { sourceFingerprint } from './release-readiness.mjs';

const root = 'test-results/prompt10';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const textFile = async file => {
  const bytes = await readFile(file);
  return bytes[0] === 0xff && bytes[1] === 0xfe ? bytes.subarray(2).toString('utf16le') : bytes.toString('utf8');
};
const report = {};
for (const [name, count] of Object.entries({ 'native-final.tap': 32, 'security-http.tap': 20, 'http-regression.tap': 12, 'requests-integration.tap': 21, 'management-integration.tap': 29, 'customer-projects-integration.tap': 17, 'support-integration.tap': 38, 'content-integration.tap': 45, 'release-integration.tap': 7, 'release-final-repeat.tap': 7, 'main-full-http-after-restart.tap': 12 })) {
  const content = await textFile(`${root}/${name}`);
  const match = key => [...content.matchAll(new RegExp(`(?:ℹ|#)\\s*${key}\\s+(\\d+)`, 'g'))].at(-1)?.[1];
  assert.equal(Number(match('tests')), count, name); assert.equal(Number(match('pass')), count, name);
  assert.equal(Number(match('fail')), 0, name); assert.equal(Number(match('skipped')), 0, name);
  report[name] = count;
}
for (const file of ['lint-final.log', 'typecheck-final.log']) assert(!/\berror TS\d|\berror\s|\bwarning\s/i.test(await textFile(`${root}/${file}`)), file);
const build = await textFile(`${root}/build.log`); assert(build.includes('Compiled successfully') && build.includes('Route (app)'));
assert((await textFile(`${root}/migration-rerun.log`)).includes('applied migrations: 0'));
for (const file of ['original-data-final.log', 'database-cleanup.log', 'backup-full-final.log', 'fresh-migration-legacy.log']) assert((await textFile(`${root}/${file}`)).includes('PASS:'), file);

const browser = JSON.parse(await readFile(`${root}/browser-evidence.json`, 'utf8'));
assert.equal(browser.functionalGroups.length, 17); assert(browser.functionalGroups.every(g => g.status === 'PASS'));
assert.equal(browser.matrix.length, 350);
const views = [...new Set(browser.matrix.map(r => r.view))]; assert.equal(views.length, 25);
for (const view of views) for (const width of [320, 375, 430, 768, 1024, 1440, 1920]) for (const theme of ['light', 'dark']) {
  const matches = browser.matrix.filter(r => r.view === view && r.width === width && r.theme === theme);
  assert.equal(matches.length, 1, view);
  const row = matches[0]; assert(row.heading && row.rtl === 'rtl' && row.reducedMotion && row.noOverflow && row.text200NoOverflow && row.violations.length === 0);
}
const images = [];
for (const name of (await readdir(`${root}/screenshots`)).sort()) {
  assert.match(name, /^[a-z0-9-]+\.jpeg$/);
  const file = `${root}/screenshots/${name}`, bytes = await readFile(file), metadata = await sharp(bytes).metadata();
  assert.equal(metadata.format, 'jpeg'); assert(metadata.width >= 320 && metadata.height >= 600);
  images.push({ file, sha256: hash(bytes), bytes: bytes.length, width: metadata.width, height: metadata.height, actuallyInspected: true, note: name === 'loading-mobile-light.jpeg' ? 'Actual transient loading capture, not a project-detail visual pass.' : name === 'support-thread-mobile-dark.jpeg' ? 'Ticket overview; actual conversation separately inspected in support-messages-mobile-dark.' : undefined });
}
assert.equal(images.length, 14);
await writeFile(`${root}/screenshot-manifest.json`, JSON.stringify(images, null, 2));
for (const file of ['.local-tools/auth-test-context.json', '.local-tools/auth-test.env', '.local-tools/release-browser.json', '.local-tools/release-native-user.json', '.local-tools/release-backup/snapshot.key', '.local-tools/release-backup/restore.env', '.local-tools/release-backup/dump.sql', '.local-tools/release-backup/restore.sql']) {
  let exists = false; try { await access(file); exists = true; } catch { /* Expected private cleanup. */ }
  assert.equal(exists, false, file);
}
const baseline = JSON.parse(await readFile('.local-tools/prompt10-checkpoint/baseline.json', 'utf8'));
for (const [file, expected] of Object.entries(baseline.files.tests)) assert.equal(hash(await readFile('tests/' + file)), expected, `Preserved historical test ${file}`);
for (const [name, expected] of Object.entries(baseline.migrations)) assert.equal(hash(await readFile(`prisma/migrations/${name}/migration.sql`)), expected, name);
const manifest = JSON.parse(await readFile('package.json', 'utf8')), lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
assert.deepEqual(manifest.dependencies, lock.packages[''].dependencies); assert.deepEqual(manifest.devDependencies, lock.packages[''].devDependencies);
const checkpointManifest = JSON.parse(await readFile('.local-tools/prompt10-checkpoint/package.json', 'utf8'));
assert.deepEqual(manifest.dependencies, checkpointManifest.dependencies); assert.deepEqual(manifest.devDependencies, checkpointManifest.devDependencies);
const files = {};
for (const file of ['package.json', 'package-lock.json', 'next.config.ts', '.env.example', 'prisma/schema.prisma', ...Object.keys(baseline.migrations).map(n => `prisma/migrations/${n}/migration.sql`)]) files[file] = hash(await readFile(file));
const gates = [
  { id: 'LOCAL_PRODUCT_SECURITY', status: 'PASS', nextAction: 'Retain dated executed Node/Chrome/MySQL regression and current source/build binding.' },
  { id: 'LOCAL_BACKUP_RESTORE', status: 'PASS', nextAction: 'Retain actual encrypted fixture restore and restored application evidence; this is not a host backup job.' },
  { id: 'EMAIL_OWNERSHIP_RECOVERY', status: 'BLOCKED', nextAction: 'Option C: authorize verified sender/provider/test mailbox and implement/test actual verification and recovery before public registration.' },
  { id: 'FULL_ADVISORY_NORMAL_INSTALL', status: 'BLOCKED', nextAction: 'Run npm run release:install:qualify on approved normal PowerShell; review current complete advisory and lifecycle install/generate/build/start evidence.' },
  { id: 'TARGET_CPANEL_NODE_MYSQL_PRISMA', status: 'BLOCKED', nextAction: 'Provider must qualify actual Node runner, OS/native engines, target MySQL migration/transaction behavior, persistence and resources; otherwise choose compatible Node/VPS.' },
  { id: 'PRODUCTION_CONFIGURATION', status: 'BLOCKED', nextAction: 'Review/test explicit production origin/database/indexing/bootstrap profile. Current profile intentionally remains loopback/local/noindex.' },
  { id: 'ACTUAL_HTTPS_TRUSTED_INGRESS', status: 'BLOCKED', nextAction: 'Supply approved target/TLS ingress and verify canonical Host/Origin/cookies, trusted source limits, proxy sanitation and backend isolation.' },
  { id: 'HOST_OPERATIONS_RESTORE_CAPACITY', status: 'BLOCKED', nextAction: 'Approve protected key/secret storage, off-host backups, retention/RPO/RTO, host restore, scheduler, monitoring, rollback and sustained resource tests.' },
  { id: 'OWNER_PRIVACY_CONTACT_CONSENT', status: 'BLOCKED', nextAction: 'Approve/publish factual privacy/contact/retention/recovery decisions and real portfolio permissions; no legal certification is claimed.' },
  { id: 'BROADER_BROWSER_ASSISTIVE_REVIEW', status: 'BLOCKED', nextAction: 'Use an approved Firefox/WebKit runner and actual assistive technology/devices; preserve 95 unexecuted direct Playwright cases.' },
  { id: 'UPLOAD_PAYMENT_BLOG_REALTIME', status: 'NOT APPLICABLE', nextAction: 'Outside delivered V1 scope; no placeholder or delivery promise.' },
  { id: 'DEPLOYMENT', status: 'NOT APPLICABLE', nextAction: 'No deployment performed or authorized.' },
];
const summary = {
  date: '2026-10-24', releaseDecision: 'CONDITIONALLY READY — DEPLOYMENT BLOCKED', deployed: false,
  baseline: { buildId: (await readFile('.next/BUILD_ID', 'utf8')).trim(), node: process.version, sourceFingerprint: await sourceFingerprint(), files, git: 'No Git metadata present; recoverable local source checkpoint preserved.' },
  tests: { executed: report, uniqueNodeScenarios: 221, repeatedSuitesNotAdded: ['release-final-repeat.tap', 'main-full-http-after-restart.tap'], build: 'PASS', typecheck: 'PASS', lint: 'PASS', newIntegrationCases: 7, newNativeCases: 2 },
  browser: { tool: 'Authorized Chrome DevTools MCP', functionalGroups: 17, qualifiedAxeExecutions: 350, violations: 0, views: 25, widths: [320, 375, 430, 768, 1024, 1440, 1920], themes: ['light', 'dark'], text200Overflow: 'PASS', screenshotsCaptured: images.length, screenshotsActuallyInspected: images.length, directPlaywrightExecuted: false, retainedDirectCasesUnverified: 95, firefox: 'BLOCKED: spawn EPERM', webkit: 'BLOCKED: spawn EPERM', manualScreenReader: 'UNEXECUTED', interruptedErrorMatrix: 'UNVERIFIED, actual safe error/retry/visual executed separately' },
  integrity: { originalModelScalarCountHashesPreserved: 23, releasedMigrationHashesPreserved: 6, newMigrations: 0, oldTestsPreserved: true, exactLedgerAndZeroPending: 'PASS', guardedFixtureCleanup: 'PASS', currentPrivateFixtureCredentialsRemoved: true, backupRestore: 'PASS: full native qualifier exit 0, 23 models/schema and restored runtime', maintenance: 'PASS: isolated service and CLI' },
  dependencies: { changed: false, officialRegistryLockEntries: 523, exactVersionsExports: 'PASS', freshNpmAudit: 'BLOCKED: approved proxy ECONNREFUSED 127.0.0.1:9', normalLifecycleCleanInstall: 'BLOCKED: isolated spawn EPERM; working tree untouched', optionalPrettierVitest: 'NOT APPLICABLE' },
  fixedDefects: ['P2 display-name control/bidi validation', 'P2 canonicalized project URL storage length', 'P2 qualification-tool MySQL/.NET/JSON interoperability'], gates,
};
await writeFile(`${root}/verification-summary.json`, JSON.stringify(summary, null, 2));
console.log(`PASS: independently checked 221 unique Node cases, ${browser.functionalGroups.length} Chrome groups, 350 qualified axe rows, ${images.length} real image files, original tests/six SQL hashes and guarded private cleanup. Production remains BLOCKED.`);

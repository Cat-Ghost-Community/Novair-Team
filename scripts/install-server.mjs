#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { access, lstat, mkdir, open, readFile, realpath, rmdir, unlink, writeFile } from "node:fs/promises";
import { homedir, userInfo } from "node:os";
import { dirname, isAbsolute, join, relative, sep } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { parseArgs, parseEnv } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { resolveSiteProfile } from "../src/config/site-profile.ts";
import { parsePort, proxyReservations, selectPort } from "./server-install-network.mjs";
import { activateRelease, isReadyHomepage, replacePrivateFile, requireAppliedMigrations, requireSameSchema, schemaManifest } from "./server-release.mjs";
import { buildMemoryMiB } from "./server-build-budget.mjs";

const source = fileURLToPath(new URL("../", import.meta.url));
const service = "novair.service";
const candidateService = "novair-candidate.service";
const sha256 = value => createHash("sha256").update(value).digest("hex");
const usage = `NovAir shared Linux server installer

  node --experimental-strip-types scripts/install-server.mjs --plan --domain studio.example.org
  node --experimental-strip-types scripts/install-server.mjs --domain studio.example.org --database-env /private/novair-db.env
  node --experimental-strip-types scripts/install-server.mjs --update
  node --experimental-strip-types scripts/install-server.mjs --messaging

Run as a dedicated non-root NovAir user from a fresh, private deployment checkout.
The account needs a running systemd user manager with lingering enabled. Install
Node.js 22.12–24.x for that account, and provision a dedicated, empty novair_*
database on loopback MySQL 8.4. In an owner-only file provide DATABASE_URL
(runtime account) and MIGRATION_DATABASE_URL (separate schema migration account).
Percent-encode MySQL usernames and passwords in the URLs.
Shared-server builds require delegated cgroup v2 memory and CPU controllers
and at least 3 GiB of available memory at preflight.

Optional flags:
  --port NUMBER              Preferred backend port (default 3400)
  --reserve-port NUMBER      Exclude a port reserved for another service (repeatable)
  --proxy-config FILE        Also inspect an expanded/site proxy config (repeatable)
  --plan                    Check a candidate port without writing anything
  --update                  Build from a new checkout and update only NovAir
  --messaging               Open the private Gmail and sms.ir configuration wizard

The installer starts a localhost staging service with accounts and indexing closed.
It generates proxy configuration fragments. It leaves the live proxy, TLS, DNS,
firewall, other services and existing databases under operator control.
Updates retain the live port, reject schema changes and verify a candidate on
a temporary loopback port before restarting NovAir. Expect a brief NovAir restart.`;

function run(command, args, { env = process.env, quiet = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: source, env, encoding: "utf8", stdio: quiet ? "pipe" : "inherit",
    timeout: quiet ? 15_000 : 15 * 60_000,
  });
  if (result.error || result.status !== 0) throw new Error(`${command} ${args.slice(0, 2).join(" ")} failed.`);
  return result.stdout?.trim() ?? "";
}

function systemctl(args, quiet = true) {
  return run("systemctl", ["--user", ...args], { quiet });
}

async function occupiedPorts(extraFiles) {
  const ports = await proxyReservations(extraFiles);
  if (process.platform === "linux") {
    const listeners = run("ss", ["-H", "-ltn"], { quiet: true });
    for (const line of listeners.split("\n").filter(Boolean)) {
      const address = line.trim().split(/\s+/)[3];
      const port = address?.match(/:(\d+)$/)?.[1];
      if (!port) throw new Error("Could not read the local TCP listener inventory.");
      ports.add(Number(port));
    }
  }
  return ports;
}

async function exists(path) {
  try { await lstat(path); return true; }
  catch (error) { if (error.code === "ENOENT") return false; throw error; }
}

function requireUnusedUnit(name) {
  const result = spawnSync("systemctl", ["--user", "show", "--property=LoadState", "--value", name], { encoding: "utf8", timeout: 15_000 });
  if (result.stdout?.trim() !== "not-found") throw new Error(`${name} already exists or the systemd user manager is unavailable.`);
}

function requireLoadedUnit(name, path) {
  if (systemctl(["show", "--property=FragmentPath", "--value", name]) !== path ||
    systemctl(["show", "--property=DropInPaths", "--value", name])) {
    throw new Error(`systemd did not load the expected NovAir unit, or it has overrides: ${name}.`);
  }
}

function databaseUrl(value, runtime = false) {
  if (!value || /[\u0000-\u0020\u007f"'\\]/.test(value) || !URL.canParse(value)) {
    throw new Error("Both database URLs must be valid, percent-encoded MySQL URLs.");
  }
  const url = new URL(value);
  if (url.protocol !== "mysql:" || !["127.0.0.1", "[::1]"].includes(url.hostname) ||
    !url.username || !url.password || !/^\/novair_[a-z0-9_]{1,48}$/.test(url.pathname) ||
    url.hash || (url.search && !(runtime && url.search === "?connection_limit=3")) ||
    ["root", ""].includes(decodeURIComponent(url.username).toLowerCase())) {
    throw new Error("Use a dedicated novair_* schema with non-root accounts and numeric loopback MySQL URLs.");
  }
  return url;
}

async function readPrivate(path) {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const info = await file.stat();
    if (!info.isFile() || info.uid !== process.getuid() || (info.mode & 0o077) || info.size > 8192) {
      throw new Error("NovAir private files must be regular files owned by the NovAir user with mode 0600 or stricter.");
    }
    return await file.readFile("utf8");
  } finally { await file.close(); }
}

async function credentials(path) {
  const values = parseEnv(await readPrivate(path));
  const runtime = databaseUrl(values.DATABASE_URL);
  const migration = databaseUrl(values.MIGRATION_DATABASE_URL);
  if (runtime.pathname !== migration.pathname || runtime.hostname !== migration.hostname ||
    (runtime.port || "3306") !== (migration.port || "3306") ||
    decodeURIComponent(runtime.username) === decodeURIComponent(migration.username)) {
    throw new Error("Use separate runtime and migration users for the same dedicated database.");
  }
  runtime.searchParams.set("connection_limit", "3");
  return { runtime: runtime.href, migration: migration.href };
}

async function verifyDatabase(PrismaClient, url, { fresh = false, schema } = {}) {
  const db = new PrismaClient({ datasources: { db: { url } } });
  try {
    const [server] = await db.$queryRaw`SELECT VERSION() AS version`;
    if (!/^8\.4\./.test(server.version) || /mariadb/i.test(server.version)) {
      throw new Error("The selected database server must run MySQL 8.4.");
    }
    if (fresh) {
      const [schema] = await db.$queryRaw`
        SELECT (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE())
             + (SELECT COUNT(*) FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE())
             + (SELECT COUNT(*) FROM information_schema.EVENTS WHERE EVENT_SCHEMA = DATABASE()) AS entries`;
      if (Number(schema.entries) !== 0) throw new Error("The selected schema contains existing objects. Use a new dedicated NovAir database.");
    } else {
      await db.siteSetting.findFirst({ select: { key: true } });
      if (schema) {
        const rows = await db.$queryRaw`SELECT migration_name, checksum, finished_at, rolled_back_at
          FROM _prisma_migrations ORDER BY migration_name, id`;
        requireAppliedMigrations(schema, rows);
      }
    }
  } catch (error) {
    if (error instanceof Error && error.constructor === Error) throw error;
    throw new Error("MySQL verification failed. Check the selected accounts, TCP port, privileges and schema.");
  } finally { await db.$disconnect(); }
}

function unitQuote(value) {
  // systemd expands percent specifiers and dollar expressions in command lines.
  if (/["\\$\r\n]/.test(value)) throw new Error("Use an installation path without quotes, backslashes, dollar signs or line breaks.");
  return `"${value.replace(/%/g, "%%")}"`;
}

function unitFile(checkout, node, environment, port, background = false) {
  return `[Unit]
Description=NovAir staging website

[Service]
Type=exec
WorkingDirectory=${unitQuote(checkout)}
EnvironmentFile=${unitQuote(environment)}
UnsetEnvironment=NODE_OPTIONS
ExecStart=${unitQuote(node)} ${unitQuote(join(checkout, "node_modules/next/dist/bin/next"))} start --hostname 127.0.0.1 --port ${port}
Restart=${background ? "no" : "on-failure"}
RestartSec=5s
MemoryMax=768M
CPUQuota=100%
NoNewPrivileges=true
UMask=0077

[Install]
WantedBy=default.target
`;
}

function nginxFragment(domain, port) {
  return `# Include inside the dedicated HTTPS server block for ${domain}.
# Restrict staging access at that server block before enabling it.
location / {
    proxy_pass http://127.0.0.1:${port};
    proxy_http_version 1.1;
    proxy_set_header Host ${domain};
    proxy_set_header X-Forwarded-Host ${domain};
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_cache off;
}
`;
}

function apacheFragment(domain, port) {
  return `# Include inside the dedicated HTTPS VirtualHost for ${domain}.
# Requires mod_proxy, mod_proxy_http and mod_headers. Restrict staging access before enabling it.
ProxyRequests Off
ProxyPreserveHost On
RequestHeader set X-Forwarded-Host "${domain}"
RequestHeader set X-Forwarded-Proto "https"
ProxyPass / http://127.0.0.1:${port}/
ProxyPassReverse / http://127.0.0.1:${port}/
`;
}

async function verifyListener(port, domain, unit = service) {
  for (let attempt = 0; attempt < 25; attempt++) {
    const pid = systemctl(["show", "--property=MainPID", "--value", unit]);
    if (/^[1-9]\d*$/.test(pid)) {
      const sockets = run("ss", ["-H", "-ltnp", `sport = :${port}`], { quiet: true });
      const listeners = sockets.split(/\r?\n/).filter(Boolean);
      if (listeners.length === 1 && new RegExp(`\\b127\\.0\\.0\\.1:${port}\\s`).test(listeners[0]) &&
        listeners[0].includes(`pid=${pid},`)) {
        try {
          const page = await fetch(`http://127.0.0.1:${port}/`, {
            headers: { Host: domain }, signal: AbortSignal.timeout(2000), redirect: "manual",
          });
          if (isReadyHomepage(page.status, page.headers, await page.text())) return;
        } catch { /* Wait for Next.js to finish starting. */ }
      }
    }
    await delay(1000);
  }
  throw new Error("NovAir could not prove ownership and readiness on the selected port.");
}

function toolingEnvironment(node) {
  const env = { ...process.env, PATH: `${dirname(node)}:${process.env.PATH ?? "/usr/bin:/bin"}` };
  for (const key of ["DATABASE_URL", "MIGRATION_DATABASE_URL", "DIRECT_URL", "BETTER_AUTH_SECRET", "NODE_OPTIONS", "NODE_ENV", "PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK"]) {
    delete env[key];
  }
  return env;
}

function boundedBuild(node, toolingEnv, command = []) {
  run("systemd-run", [
    "--user", "--scope", "--quiet", `--property=MemoryMax=${buildMemoryMiB}M`,
    "--property=CPUQuota=100%", "--",
    node, "scripts/server-build-budget.mjs", ...command,
  ], { env: toolingEnv });
}

function prepareCheckout(checkout, node, toolingEnv) {
  console.log("Installing locked dependencies and generating the Linux Prisma client...");
  boundedBuild(node, toolingEnv, ["nice", "-n", "10", "npm", "ci", "--include=dev", "--no-fund"]);
  const prisma = join(checkout, "node_modules/prisma/build/index.js");
  boundedBuild(node, toolingEnv, [node, prisma, "generate"]);
  return prisma;
}

function buildCheckout(node, toolingEnv, appEnv) {
  console.log("Building the NovAir staging site...");
  boundedBuild(node, { ...toolingEnv, ...appEnv }, ["nice", "-n", "10", node, "scripts/build-local.mjs"]);
}

async function update({ state, checkout, configHome, userUnit, node, runtimeFile, options, schema }) {
  const lock = join(state, "update.lock");
  const installedFile = join(state, "installed.json");
  const candidateUnit = join(configHome, "systemd/user", candidateService);
  const info = await lstat(state);
  if (!info.isDirectory() || info.uid !== process.getuid() || (info.mode & 0o077)) {
    throw new Error("The NovAir installation state must be owned by the NovAir user and private.");
  }
  if (!await exists(installedFile)) throw new Error("The installation has no verified release record. Inspect the earlier installation before attempting a guarded update.");
  await mkdir(lock, { mode: 0o700 });
  try {
    const installed = JSON.parse(await readPrivate(installedFile));
    requireSameSchema(installed.schema, schema);
    const active = await realpath(installed.checkout);
    const contains = (parent, child) => {
      const path = relative(parent, child);
      return !isAbsolute(path) && path !== ".." && !path.startsWith(`..${sep}`);
    };
    if (contains(active, checkout) || contains(checkout, active)) {
      throw new Error("Place the new release in a separate checkout outside the active NovAir release.");
    }
    const port = parsePort(installed.port);
    const runtimeContents = await readPrivate(runtimeFile);
    if (sha256(runtimeContents) !== installed.runtimeHash) throw new Error("The installed runtime settings changed. Review the existing NovAir configuration before updating.");
    const stored = parseEnv(runtimeContents);
    const runtime = databaseUrl(stored.DATABASE_URL, true).href;
    const appEnv = {
      NODE_ENV: "production", SITE_URL: stored.SITE_URL,
      NOVAIR_SITE_PROFILE: "production", NOVAIR_INDEX_PUBLIC: "false", AUTH_ENABLED: "false",
    };
    const profile = resolveSiteProfile(appEnv);
    if (profile.url.origin !== installed.origin || Object.keys(stored).length !== Object.keys(appEnv).length + 1 ||
      Object.entries(appEnv).some(([key, value]) => stored[key] !== value)) {
      throw new Error("The installed runtime profile changed. Review the staging configuration before updating.");
    }
    requireLoadedUnit(service, userUnit);
    const originalUnit = await readPrivate(userUnit);
    if (sha256(originalUnit) !== installed.unitHash) throw new Error("The NovAir service file differs from the installed release. Check it before updating.");
    await verifyListener(port, profile.url.hostname);
    if (await exists(candidateUnit)) throw new Error("A NovAir candidate unit already exists. Check the previous update before retrying.");
    requireUnusedUnit(candidateService);
    const env = toolingEnvironment(node);
    prepareCheckout(checkout, node, env);
    const { PrismaClient } = await import("@prisma/client");
    await verifyDatabase(PrismaClient, runtime, { schema });
    buildCheckout(node, env, appEnv);
    requireSameSchema(schema, await schemaManifest(checkout));

    const reserved = await occupiedPorts(options["proxy-config"]);
    reserved.add(port);
    for (const value of options["reserve-port"] ?? []) reserved.add(parsePort(value));
    const testPort = await selectPort({ preferred: options.port, reserved });
    if (await readPrivate(runtimeFile) !== runtimeContents) throw new Error("The runtime settings changed during candidate build.");
    await writeFile(candidateUnit, unitFile(checkout, node, runtimeFile, testPort, true), { flag: "wx", mode: 0o600 });
    let candidateStarted = false;
    try {
      systemctl(["daemon-reload"]);
      requireLoadedUnit(candidateService, candidateUnit);
      candidateStarted = true;
      systemctl(["start", candidateService]);
      await verifyListener(testPort, profile.url.hostname, candidateService);
    } finally {
      if (candidateStarted) systemctl(["stop", candidateService]);
      await unlink(candidateUnit);
      systemctl(["daemon-reload"]);
    }

    requireLoadedUnit(service, userUnit);
    if (await readFile(userUnit, "utf8") !== originalUnit || await readPrivate(runtimeFile) !== runtimeContents) {
      throw new Error("The live configuration changed while the candidate was being verified.");
    }
    await verifyDatabase(PrismaClient, runtime, { schema });
    await replacePrivateFile(join(state, "previous.unit"), originalUnit);
    const newUnit = unitFile(checkout, node, runtimeFile, port);
    await activateRelease({
      oldUnit: originalUnit, newUnit,
      replaceUnit: value => replacePrivateFile(userUnit, value),
      restartAndVerify: async () => {
        systemctl(["daemon-reload"]);
        requireLoadedUnit(service, userUnit);
        systemctl(["restart", service]);
        await verifyListener(port, profile.url.hostname);
      },
      commit: () => replacePrivateFile(installedFile, JSON.stringify({
        checkout, origin: profile.url.origin, port, schema, runtimeHash: installed.runtimeHash, unitHash: sha256(newUnit),
      })),
    });
    console.log(`Updated NovAir on its existing loopback port ${port}. The previous release and its unit have been retained.`);
  } finally { await rmdir(lock); }
}

async function main() {
  const { values: options } = parseArgs({ options: {
    help: { type: "boolean" }, plan: { type: "boolean" }, update: { type: "boolean" }, messaging: { type: "boolean" }, domain: { type: "string" },
    "database-env": { type: "string" }, port: { type: "string" },
    "reserve-port": { type: "string", multiple: true }, "proxy-config": { type: "string", multiple: true },
  } });
  if (options.help) { console.log(usage); return; }
  if (options.messaging) {
    if (Object.keys(options).length !== 1) throw new Error("Run --messaging separately from installation or update.");
    const { messagingWizard } = await import("./messaging-wizard.mjs");
    return messagingWizard();
  }
  let domain = options.domain;
  let dbInput = options["database-env"];
  if (options.update && (options.plan || domain || dbInput)) throw new Error("An update uses the installed hostname and database settings.");
  if (!options.update && process.stdin.isTTY && (!domain || (!options.plan && !dbInput))) {
    const prompt = createInterface({ input: process.stdin, output: process.stdout });
    try {
      domain ||= (await prompt.question("NovAir staging DNS name: ")).trim();
      if (!options.plan) dbInput ||= (await prompt.question("Path to your private database input file: ")).trim();
    } finally { prompt.close(); }
  }
  if (!options.update && (!domain || domain !== domain.trim() || !/^[a-z0-9.-]+$/i.test(domain))) throw new Error("Supply a DNS hostname using --domain.");
  const appEnv = {
    NODE_ENV: "production", SITE_URL: domain ? `https://${domain.toLowerCase()}` : undefined,
    NOVAIR_SITE_PROFILE: "production", NOVAIR_INDEX_PUBLIC: "false", AUTH_ENABLED: "false",
  };
  const profile = options.update ? null : resolveSiteProfile(appEnv);
  const reserved = await occupiedPorts(options["proxy-config"]);
  for (const port of options["reserve-port"] ?? []) reserved.add(parsePort(port));
  const portOptions = { preferred: options.port, reserved };
  const candidate = await selectPort(portOptions);
  if (options.plan) { console.log(`Preview ${profile.url.origin} -> 127.0.0.1:${candidate} (port will be checked again at installation).`); return; }

  if (process.platform !== "linux" || process.getuid() === 0) throw new Error("Install from Linux as a dedicated non-root NovAir user.");
  if (!options.update && !dbInput) throw new Error("Supply --database-env pointing to your private database input file.");
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 22 || major > 24 || (major === 22 && minor < 12)) throw new Error("Use a supported Node.js version (22.12–24.x).");
  const checkout = await realpath(source);
  const configHome = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  if (!isAbsolute(configHome)) throw new Error("XDG_CONFIG_HOME must be an absolute path.");
  const state = join(configHome, "novair");
  const userUnit = join(configHome, "systemd/user", service);
  if (!options.update && (await exists(state) || await exists(userUnit))) throw new Error("A NovAir installation already exists for this user. Use --update from a separate checkout.");
  for (const file of [".env", ".env.local", ".env.production", ".env.production.local", ".next", "node_modules"]) {
    if (await exists(join(checkout, file))) throw new Error("Use a clean deployment checkout without local environment files, builds or dependencies.");
  }
  const rootInfo = await lstat(checkout);
  if (rootInfo.uid !== process.getuid() || (rootInfo.mode & 0o022)) throw new Error("The checkout must be owned by the dedicated user with no group/other write access.");
  await access(checkout, constants.W_OK);
  run("ss", ["-H", "-ltnp"], { quiet: true });
  systemctl(["is-active", "default.target"]);
  // A systemd user service must survive logout on this shared server.
  if (run("loginctl", ["show-user", userInfo().username, "--property=Linger", "--value"], { quiet: true }) !== "yes") {
    throw new Error("Enable systemd lingering for the dedicated NovAir user before installation.");
  }
  const node = await realpath(process.execPath);
  const runtimeFile = join(state, "runtime.env");
  // Validate these paths before changing files or applying migrations.
  unitFile(checkout, node, runtimeFile, candidate);
  await access("/proc/meminfo", constants.R_OK);
  run("nice", ["-n", "10", node, "--version"], { quiet: true });
  const schema = await schemaManifest(checkout);
  boundedBuild(node, toolingEnvironment(node));
  if (options.update) return update({ state, checkout, configHome, userUnit, node, runtimeFile, options, schema });
  requireUnusedUnit(service);
  const db = await credentials(dbInput);
  await mkdir(configHome, { recursive: true, mode: 0o700 });
  await mkdir(state, { mode: 0o700 }); // Atomic per-user installation lock and recovery record.

  let started = false;
  let enabling = false;
  try {
    const memory = await readFile("/proc/meminfo", "utf8");
    const available = memory.match(/^MemAvailable:\s+(\d+) kB$/m)?.[1];
    if (available) console.log(`Available server memory before build: ${Math.round(Number(available) / 1024)} MiB.`);
    const toolingEnv = toolingEnvironment(node);
    const prisma = prepareCheckout(checkout, node, toolingEnv);
    const { PrismaClient } = await import("@prisma/client");
    await verifyDatabase(PrismaClient, db.migration, { fresh: true });
    await verifyDatabase(PrismaClient, db.runtime, { fresh: true });
    buildCheckout(node, toolingEnv, appEnv);
    requireSameSchema(schema, await schemaManifest(checkout));

    console.log("Applying the checked-in NovAir migrations to the dedicated database...");
    await verifyDatabase(PrismaClient, db.migration, { fresh: true });
    run(node, [prisma, "migrate", "deploy"], { env: { ...toolingEnv, DATABASE_URL: db.migration }, quiet: true });
    run(node, [prisma, "migrate", "status"], { env: { ...toolingEnv, DATABASE_URL: db.migration }, quiet: true });
    await verifyDatabase(PrismaClient, db.runtime, { schema });

    // The ports and proxy reservations may have changed during npm ci, build or migrations.
    const refreshed = await occupiedPorts(options["proxy-config"]);
    for (const port of options["reserve-port"] ?? []) refreshed.add(parsePort(port));
    const port = await selectPort({ ...portOptions, reserved: refreshed });
    const runtimeContents = Object.entries({ ...appEnv, DATABASE_URL: db.runtime })
      .map(([key, value]) => `${key}=${value}`).join("\n") + "\n";
    await writeFile(runtimeFile, runtimeContents, { flag: "wx", mode: 0o600 });
    await writeFile(join(state, "nginx.conf"), nginxFragment(profile.url.hostname, port), { flag: "wx", mode: 0o600 });
    await writeFile(join(state, "apache.conf"), apacheFragment(profile.url.hostname, port), { flag: "wx", mode: 0o600 });
    await mkdir(dirname(userUnit), { recursive: true, mode: 0o700 });
    const unit = unitFile(checkout, node, runtimeFile, port);
    await writeFile(userUnit, unit, { flag: "wx", mode: 0o600 });
    systemctl(["daemon-reload"]);
    requireLoadedUnit(service, userUnit);
    started = true;
    systemctl(["start", service]);
    await verifyListener(port, profile.url.hostname);
    enabling = true;
    systemctl(["enable", service]);
    await writeFile(join(state, "installed.json"), JSON.stringify({
      checkout, port, origin: profile.url.origin, schema, runtimeHash: sha256(runtimeContents), unitHash: sha256(unit),
    }), { flag: "wx", mode: 0o600 });
    console.log(`Verified NovAir on 127.0.0.1:${port}. Proxy fragments are in ${state}.`);
    console.log("You can now review the fragment for your HTTPS staging vhost and test the effective proxy config before reloading it.");
  } catch (error) {
    if (enabling) {
      try { systemctl(["disable", service]); } catch { console.error("Could not verify the boot setting for the new NovAir unit."); }
    }
    if (started) {
      try { systemctl(["stop", service]); } catch { console.error("Could not stop the NovAir unit. Inspect it with systemctl --user status novair.service."); }
    }
    console.error(`Installation stopped. NovAir files in ${state} and any applied NovAir migrations were retained for recovery.`);
    throw error;
  }
}

await main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});

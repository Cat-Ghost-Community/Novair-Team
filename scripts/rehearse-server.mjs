#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { cp, lstat, mkdir, mkdtemp, open, readFile, realpath, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { homedir, userInfo } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { parseArgs, parseEnv } from "node:util";
import { parsePort } from "./server-install-network.mjs";
import { forcedFailure, instrumentFixture } from "./server-rehearsal-fixture.mjs";
import { isReadyHomepage } from "./server-release.mjs";

const source = fileURLToPath(new URL("../", import.meta.url));
const domain = "novair-staging.example.org";
const neighborPort = 3400;
const privateConfig = join(homedir(), ".config");
const state = join(privateConfig, "novair");
const activeUnit = join(privateConfig, "systemd/user/novair.service");
const testInputs = ["src", "public", "prisma", "scripts", "package.json", "package-lock.json",
  "next.config.ts", "tsconfig.json", "postcss.config.mjs"];

async function missing(path) {
  try { await lstat(path); return false; }
  catch (error) { if (error.code === "ENOENT") return true; throw error; }
}

async function run(command, args, cwd = source) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    for (const stream of [child.stdout, child.stderr]) stream.on("data", chunk => { output += chunk; });
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal, output }));
  });
}

async function stage(root, name, port) {
  const checkout = join(root, name);
  await mkdir(checkout, { mode: 0o700 });
  for (const entry of testInputs) await cp(join(source, entry), join(checkout, entry), { recursive: true, errorOnExist: true, force: false });
  await instrumentFixture(checkout, name, port);
  return checkout;
}

async function rehearsalCredentials(file) {
  const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const info = await handle.stat();
    assert(info.isFile() && info.uid === process.getuid() && !(info.mode & 0o077) && info.size <= 8192,
      "Use a private regular credential file owned by the rehearsal user.");
    const values = parseEnv(await handle.readFile("utf8"));
    for (const value of [values.DATABASE_URL, values.MIGRATION_DATABASE_URL]) {
      const url = new URL(value);
      assert(url.protocol === "mysql:" && ["127.0.0.1", "[::1]"].includes(url.hostname) &&
        /^\/novair_rehearsal_[a-z0-9_]+$/.test(url.pathname),
      "Both rehearsal accounts must target a dedicated loopback novair_rehearsal_* schema.");
    }
  } finally { await handle.close(); }
}

async function main() {
  const { values } = parseArgs({ options: {
    "disposable-linux": { type: "boolean" }, "database-env": { type: "string" }, help: { type: "boolean" },
  } });
  if (values.help) {
    console.log("On a disposable Linux host, run as a dedicated novair-rehearsal user with lingering enabled:");
    console.log("node scripts/rehearse-server.mjs --disposable-linux --database-env /private/rehearsal.env");
    console.log("The private input must point both database accounts at a new loopback MySQL 8.4 novair_rehearsal_* schema.");
    return;
  }
  assert(values["disposable-linux"] && values["database-env"] && process.platform === "linux" &&
    process.getuid() !== 0 && /^novair-rehearsal(?:-[a-z0-9]+)?$/.test(userInfo().username),
  "Rehearsal requires a disposable Linux host and a dedicated non-root novair-rehearsal user.");
  assert(!process.env.XDG_CONFIG_HOME || resolve(process.env.XDG_CONFIG_HOME) === privateConfig,
    "Use the rehearsal user's standard private config directory.");
  assert(await missing(state) && await missing(activeUnit), "This user already has a NovAir installation. Use a fresh disposable user.");
  const credentialsPath = resolve(values["database-env"]);
  await rehearsalCredentials(credentialsPath);
  const root = await mkdtemp(join(homedir(), "novair-rehearsal-"));
  const neighbor = createServer((_request, response) => response.end("rehearsal-neighbor"));

  let started = false;
  let monitoring = true;
  let observingCutover = false;
  let port;
  const evidence = { neighborChecks: 0, worstNeighborMs: 0, neighborFailures: 0, forcedFailureSeen: false, steps: [] };
  let monitor;
  const fetchLocal = (port, host) => fetch(`http://127.0.0.1:${port}/`, {
    signal: AbortSignal.timeout(1500), redirect: "manual", headers: { Host: host },
  });
  async function checkNeighbor() {
    const start = performance.now();
    try {
      const response = await fetchLocal(neighborPort, "neighbor.example.org");
      if (response.status !== 200 || await response.text() !== "rehearsal-neighbor") evidence.neighborFailures++;
    } catch { evidence.neighborFailures++; }
    evidence.neighborChecks++;
    evidence.worstNeighborMs = Math.max(evidence.worstNeighborMs, Math.round(performance.now() - start));
  }
  const invoke = async (checkout, args, log) => {
    const result = await run(process.execPath, ["--experimental-strip-types", "scripts/install-server.mjs", ...args], checkout);
    if (log === "install.log" && result.code === 0) started = true;
    await writeFile(join(root, log), result.output, { flag: "wx", mode: 0o600 });
    return result;
  };
  const verify = async (label, checkout, phase = label) => {
    const record = JSON.parse(await readFile(join(state, "installed.json"), "utf8"));
    assert.equal(record.checkout, await realpath(checkout));
    const installedPort = parsePort(record.port);
    assert.notEqual(installedPort, neighborPort);
    if (port !== undefined) assert.equal(installedPort, port, "The live proxy port must stay unchanged.");
    port = installedPort;
    const response = await fetchLocal(port, domain);
    const html = await response.text();
    assert(isReadyHomepage(response.status, response.headers, html), "Expected a ready staging homepage.");
    assert(html.includes(`data-novair-rehearsal="${label}"`), "The expected release must be serving requests.");
    assert.equal(evidence.neighborFailures, 0, "The neighboring HTTP service failed a probe.");
    evidence.steps.push(phase);
  };
  try {
    await new Promise((ok, error) => {
      neighbor.once("error", error);
      neighbor.listen({ host: "127.0.0.1", port: neighborPort, exclusive: true }, ok);
    });
    monitor = (async () => {
      while (monitoring) {
        await checkNeighbor();
        if (port && observingCutover) {
          try {
            const response = await fetchLocal(port, domain);
            if (response.status === 503 && (await response.text()).includes(forcedFailure)) evidence.forcedFailureSeen = true;
            else await response.body?.cancel();
          } catch { /* NovAir may briefly be between processes during its own restart. */ }
        }
        await delay(200);
      }
    })();
    const initial = await stage(root, "initial");
    const install = await invoke(initial, ["--domain", domain, "--database-env", credentialsPath, "--port", String(neighborPort)], "install.log");
    assert.equal(install.code, 0, "Fresh install failed. See install.log in the private rehearsal directory.");
    await verify("initial", initial);

    const update = await stage(root, "updated");
    const changed = await invoke(update, ["--update"], "update.log");
    assert.equal(changed.code, 0, "Update failed. See update.log in the private rehearsal directory.");
    await verify("updated", update);

    const broken = await stage(root, "fault", port);
    observingCutover = true;
    const failed = await invoke(broken, ["--update"], "rollback.log");
    observingCutover = false;
    assert.equal(failed.code, 1);
    assert(failed.output.includes("previous release was restored and verified"), "Updater did not verify rollback. See rollback.log.");
    assert(evidence.forcedFailureSeen, "The monitor must observe the injected HTTP 503 after cutover.");
    await verify("updated", update, "rollback");
  } finally {
    try {
      // The harness uses a fresh disposable user and never reuses an existing unit.
      if (started) {
        for (const action of ["stop", "disable"]) {
          const result = await run("systemctl", ["--user", action, "novair.service"]);
          assert.equal(result.code, 0, `Could not ${action} the disposable NovAir unit.`);
        }
      }
    } finally {
      monitoring = false;
      await monitor;
      if (neighbor.listening) await new Promise(ok => neighbor.close(ok));
      await writeFile(join(root, "evidence.json"), JSON.stringify(evidence, null, 2) + "\n", { flag: "wx", mode: 0o600 });
      console.log(`Private rehearsal artifacts: ${root}`);
    }
  }
  assert.equal(evidence.neighborFailures, 0);
  assert(evidence.neighborChecks > 0);
  console.log("PASS: fresh install, update, observed live cutover fault, verified rollback and uninterrupted neighboring HTTP probes.");
}

await main().catch(error => { console.error(error.message); process.exitCode = 1; });

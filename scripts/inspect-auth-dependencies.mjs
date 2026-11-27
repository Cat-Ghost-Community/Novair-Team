import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { assessDependencyReadiness } from "./lib/dependency-readiness.mjs";

// Read-only inventory. This never installs packages or certifies an authentication integration.
const root = fileURLToPath(new URL("../", import.meta.url));
const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const names = ["next", "react", "react-dom", "prisma", "@prisma/client", "better-auth", "@better-auth/prisma-adapter", "next-auth", "@auth/core", "prettier", "vitest"];
const packages = await Promise.all(names.map(async (name) => {
  const declared = manifest.dependencies?.[name] ?? manifest.devDependencies?.[name] ?? null;
  try {
    const installed = JSON.parse(await readFile(join(root, "node_modules", name, "package.json"), "utf8"));
    return { name, declared, installed: installed.version, engines: installed.engines ?? {}, peers: installed.peerDependencies ?? {} };
  } catch {
    return { name, declared, installed: null };
  }
}));
let lock;
try {
  const parsed = JSON.parse(await readFile(join(root, "package-lock.json"), "utf8"));
  lock = { present: true, lockfileVersion: parsed.lockfileVersion, note: "Presence alone does not verify completeness, integrity or a clean install." };
} catch { lock = { present: false }; }
const assessment = assessDependencyReadiness(packages, lock.present);
console.log(JSON.stringify({
  ...assessment,
  runtime: process.version, lock, packages,
  note: "Prettier/Vitest are optional; lockfile/reproducible install are release requirements. Installed types, adapter behavior, advisories and real security tests still require verification before auth endpoints are enabled. No automatic install or network retry occurs.",
}, null, 2));
if (assessment.blocked) process.exitCode = 1;

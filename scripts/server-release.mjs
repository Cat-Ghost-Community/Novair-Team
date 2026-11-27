import { createHash, randomUUID } from "node:crypto";
import { readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function schemaManifest(checkout) {
  const directory = join(checkout, "prisma/migrations");
  const entries = await readdir(directory, { withFileTypes: true });
  if (entries.some(entry => entry.isSymbolicLink())) throw new Error("Migration roots must be regular checkout files.");
  const names = entries.filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
  if (!names.length) throw new Error("No versioned NovAir migrations found.");
  async function digest(file) {
    return createHash("sha256").update(await readFile(file)).digest("hex");
  }
  return {
    schema: await digest(join(checkout, "prisma/schema.prisma")),
    provider: await digest(join(directory, "migration_lock.toml")),
    migrations: await Promise.all(names.map(async name => [name, await digest(join(directory, name, "migration.sql"))])),
  };
}

export function requireSameSchema(installed, candidate) {
  if (JSON.stringify(installed) !== JSON.stringify(candidate)) {
    throw new Error("The release changes the Prisma schema or migrations. This updater only accepts schema-compatible releases.");
  }
}

export function requireAppliedMigrations(manifest, rows) {
  if (rows.some(row => !row.finished_at || row.rolled_back_at) ||
    JSON.stringify(manifest.migrations) !== JSON.stringify(rows.map(row => [row.migration_name, row.checksum]))) {
    throw new Error("The NovAir database migration history differs from the installed release.");
  }
}

export function isReadyHomepage(status, headers, html) {
  return status === 200 && /^text\/html(?:;|$)/i.test(headers.get("content-type") ?? "") &&
    /\bnoindex\b/i.test(headers.get("x-robots-tag") ?? "") &&
    /<h1\b[^>]*\sid="hero-title"(?=\s|>)/.test(html);
}

export async function replacePrivateFile(path, content) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, content, { flag: "wx", mode: 0o600 });
  try { await rename(temporary, path); }
  catch (error) {
    await unlink(temporary).catch(() => {});
    throw error;
  }
}

export async function activateRelease({ replaceUnit, oldUnit, newUnit, restartAndVerify, commit }) {
  await replaceUnit(newUnit);
  try {
    await restartAndVerify();
    await commit();
  } catch {
    try {
      await replaceUnit(oldUnit);
      await restartAndVerify();
    } catch {
      throw new Error("NovAir activation failed and rollback could not be verified. Keep the recovery files and inspect novair.service.");
    }
    throw new Error("NovAir activation failed. The previous release was restored and verified.");
  }
}

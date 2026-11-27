import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const hash = value => createHash('sha256').update(value).digest('hex');
export async function sourceFingerprint(directory = 'src') {
  const values = [];
  async function walk(path) {
    for (const entry of (await readdir(path, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path + '/' + entry.name;
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile()) values.push([file, hash(await readFile(file))]);
      else throw new Error('Non-regular source file requires review.');
    }
  }
  await walk(directory);
  return hash(JSON.stringify(values));
}

if (process.argv[1]?.endsWith('release-readiness.mjs')) {
  try {
    const report = JSON.parse(await readFile('test-results/prompt10/verification-summary.json', 'utf8'));
    assert.equal(await sourceFingerprint(), report.baseline.sourceFingerprint, 'Source changed after qualification.');
    for (const [file, expected] of Object.entries(report.baseline.files)) assert.equal(hash(await readFile(file)), expected, file);
    assert.equal((await readFile('.next/BUILD_ID', 'utf8')).trim(), report.baseline.buildId, 'Build changed after qualification.');
    const blocked = report.gates.filter(gate => !['PASS', 'NOT APPLICABLE'].includes(gate.status));
    console.log(report.releaseDecision);
    for (const gate of blocked) console.log(`${gate.status}: ${gate.id} — ${gate.nextAction}`);
    // A documented or previously passed local gate never overrides an unresolved production prerequisite.
    process.exitCode = blocked.length ? 2 : 0;
  } catch {
    console.error('BLOCKED: complete current qualification evidence is missing, stale or inconsistent. No deployment is allowed.');
    process.exitCode = 2;
  }
}

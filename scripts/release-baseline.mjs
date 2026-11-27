import { PrismaClient, Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { readFile, writeFile, readdir, mkdir, cp, stat } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { getDatabaseUrl } from '../src/server/db/environment.ts';

const directory = '.local-tools/prompt10-checkpoint';
const baselineFile = `${directory}/baseline.json`;
const hash = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const db = new PrismaClient({ datasources: { db: { url: getDatabaseUrl() } } });
async function inventory(root, prefix = '') {
  const result = {};
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const name = prefix + entry.name;
    if (entry.isDirectory()) Object.assign(result, await inventory(`${root}/${entry.name}`, `${name}/`));
    else if (entry.isFile()) result[name] = hash(await readFile(`${root}/${entry.name}`));
    else throw new Error('Refusing a non-regular checkpoint source.');
  }
  return result;
}
try {
  if (process.argv[2] === 'record') {
    await mkdir(directory); // Never overwrite an earlier recovery checkpoint.
    const baseline = { createdAt: new Date().toISOString(), git: 'No .git repository present; file checkpoint used.', node: process.version, files: {}, models: {}, migrations: {} };
    const roots = ['src', 'scripts', 'tests', 'prisma', 'public', 'docs'];
    const files = ['package.json', 'package-lock.json', 'next.config.ts', 'tsconfig.json', 'eslint.config.mjs', 'compose.yaml', '.env.example', '.gitignore', 'README.md'];
    for (const root of roots) {
      baseline.files[root] = await inventory(root);
      await cp(root, `${directory}/${root}`, { recursive: true, errorOnExist: true, force: false });
    }
    for (const file of files) {
      baseline.files[file] = hash(await readFile(file));
      await cp(file, `${directory}/${file}`, { errorOnExist: true, force: false });
    }
    // Never copy credentials into the source checkpoint. Database evidence contains hashes/counts only.
    for (const model of Prisma.dmmf.datamodel.models) {
      const name = model.name[0].toLowerCase() + model.name.slice(1);
      const fields = model.fields.filter(f => f.kind === 'scalar' || f.kind === 'enum').map(f => f.name);
      const order = fields.includes('id') ? 'id' : 'key';
      const rows = await db[name].findMany({ select: Object.fromEntries(fields.map(f => [f, true])), orderBy: { [order]: 'asc' } });
      baseline.models[name] = { fields, order, count: rows.length, hash: hash(rows) };
    }
    for (const entry of await readdir('prisma/migrations', { withFileTypes: true })) if (entry.isDirectory()) baseline.migrations[entry.name] = hash(await readFile(`prisma/migrations/${entry.name}/migration.sql`));
    await writeFile(baselineFile, JSON.stringify(baseline, null, 2), { flag: 'wx' });
    await mkdir('test-results/prompt10', { recursive: true });
    await writeFile('test-results/prompt10/baseline.json', JSON.stringify({ ...baseline, files: undefined }, null, 2), { flag: 'wx' });
    console.log(`PASS: recoverable source checkpoint (${roots.length} directories), manifest/lock/migration hashes and ${Object.keys(baseline.models).length} model scalar/count hashes recorded. No secrets copied.`);
  } else if (process.argv[2] === 'verify') {
    assert((await stat(directory)).isDirectory());
    const baseline = JSON.parse(await readFile(baselineFile, 'utf8'));
    for (const [name, model] of Object.entries(baseline.models)) {
      const rows = await db[name].findMany({ select: Object.fromEntries(model.fields.map(f => [f, true])), orderBy: { [model.order]: 'asc' } });
      assert.equal(rows.length, model.count, name);
      assert.equal(hash(rows), model.hash, name);
    }
    for (const [name, value] of Object.entries(baseline.migrations)) assert.equal(hash(await readFile(`prisma/migrations/${name}/migration.sql`)), value, name);
    console.log(`PASS: all ${Object.keys(baseline.models).length} original model scalar values/counts and ${Object.keys(baseline.migrations).length} migration checksums unchanged.`);
  } else throw new Error('Use record or verify.');
} finally { await db.$disconnect(); }

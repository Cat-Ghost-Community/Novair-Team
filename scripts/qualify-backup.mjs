// Disposable LOCAL qualification only. Does not export or restore the active application database.
import { PrismaClient, Prisma } from '@prisma/client';
import { randomBytes, createHash, createCipheriv, createDecipheriv } from 'node:crypto';
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import assert from 'node:assert/strict';

const path = '.local-tools/release-backup';
const fixture = JSON.parse(await readFile('.local-tools/auth-test-context.json', 'utf8'));
assert.match(fixture.name, /^novair_auth_test_[a-f0-9]{12}$/);
const url = new URL(process.env.DATABASE_URL);
assert.equal(url.pathname, '/' + fixture.name);
assert(['127.0.0.1', 'localhost'].includes(url.hostname));
const source = new PrismaClient();
const hash = value => createHash('sha256').update(Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
let restored;
async function snapshot(db) {
  const result = { models: {}, schema: {} };
  for (const model of Prisma.dmmf.datamodel.models) {
    const name = model.name[0].toLowerCase() + model.name.slice(1);
    const fields = model.fields.filter(f => f.kind === 'scalar' || f.kind === 'enum').map(f => f.name);
    const rows = await db[name].findMany({ select: Object.fromEntries(fields.map(f => [f, true])), orderBy: { [fields.includes('id') ? 'id' : 'key']: 'asc' } });
    result.models[name] = { count: rows.length, hash: hash(rows) };
    // Model names originate in the checked-in Prisma schema, never user input.
    assert.match(model.name, /^[A-Za-z]+$/);
    const ddl = await db.$queryRawUnsafe(`SHOW CREATE TABLE \`${model.name}\``);
    // Prisma's MySQL prepared-result metadata names SHOW columns f0/f1 on this server.
    const definition = ddl[0]['Create Table'] ?? ddl[0].f1;
    assert.equal(typeof definition, 'string');
    result.schema[model.name] = hash(definition);
  }
  return result;
}
try {
  assert.equal((await source.siteSetting.findUnique({ where: { key: '__novair_auth_test' } })).value.nonce, fixture.nonce);
  const action = process.argv[2];
  if (action === 'prepare') {
    await mkdir(path); // Fail rather than overwrite a previous backup/restore operation.
    const before = await snapshot(source); // Do all fallible reads BEFORE creating the destination.
    const rootUrl = new URL(url); rootUrl.pathname = '/mysql';
    const root = new PrismaClient({ datasources: { db: { url: rootUrl.href } } });
    const name = 'novair_restore_test_' + randomBytes(6).toString('hex');
    // Persist intent before DDL, so even an interrupted creation has an exact recoverable identity.
    await writeFile(`${path}/context.json`, JSON.stringify({ source: fixture.name, name, nonce: fixture.nonce, before }), { flag: 'wx', mode: 0o600 });
    try { await root.$executeRawUnsafe(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`); }
    finally { await root.$disconnect(); }
    const restoreUrl = new URL(url); restoreUrl.pathname = '/' + name;
    await writeFile(`${path}/restore.env`, `DATABASE_URL=${restoreUrl.href}\nSITE_URL=http://127.0.0.1:3101\n`, { flag: 'wx', mode: 0o600 });
    console.log('PASS: disposable restore destination created and exact 23-model/schema snapshot recorded.');
  } else if (action === 'encrypt') {
    const plain = await readFile(`${path}/dump.sql`), key = randomBytes(32), iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from('NOVAIR-BACKUP-1'));
    const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
    await writeFile(`${path}/snapshot.aes`, Buffer.concat([iv, cipher.getAuthTag(), encrypted]), { flag: 'wx', mode: 0o600 });
    await writeFile(`${path}/snapshot.key`, key, { flag: 'wx', mode: 0o600 });
    await writeFile(`${path}/digest.json`, JSON.stringify({ plaintextHash: hash(plain), encryptedHash: hash(await readFile(`${path}/snapshot.aes`)), plaintextBytes: plain.length }), { flag: 'wx' });
    await unlink(`${path}/dump.sql`);
    console.log('PASS: consistent dump encrypted with AES-256-GCM; temporary plaintext removed; key not logged.');
  } else if (action === 'decrypt') {
    const bytes = await readFile(`${path}/snapshot.aes`), key = await readFile(`${path}/snapshot.key`);
    const decode = value => { const d = createDecipheriv('aes-256-gcm', key, value.subarray(0, 12)); d.setAAD(Buffer.from('NOVAIR-BACKUP-1')); d.setAuthTag(value.subarray(12, 28)); return Buffer.concat([d.update(value.subarray(28)), d.final()]); };
    const changed = Buffer.from(bytes); changed[changed.length - 1] ^= 1; assert.throws(() => decode(changed));
    const plain = decode(bytes); assert.equal(hash(plain), JSON.parse(await readFile(`${path}/digest.json`, 'utf8')).plaintextHash);
    await writeFile(`${path}/restore.sql`, plain, { flag: 'wx', mode: 0o600 });
    console.log('PASS: encrypted backup authenticated/decrypted; real ciphertext tampering rejected.');
  } else if (['verify', 'cleanup'].includes(action)) {
    const context = JSON.parse(await readFile(`${path}/context.json`, 'utf8'));
    assert.equal(context.source, fixture.name); assert.equal(context.nonce, fixture.nonce);
    assert.match(context.name, /^novair_restore_test_[a-f0-9]{12}$/); assert.notEqual(context.name, fixture.name);
    const restoreUrl = new URL(url); restoreUrl.pathname = '/' + context.name;
    restored = new PrismaClient({ datasources: { db: { url: restoreUrl.href } } });
    assert.equal((await restored.siteSetting.findUnique({ where: { key: '__novair_auth_test' } })).value.nonce, fixture.nonce);
    if (action === 'verify') {
      assert.deepEqual((await snapshot(restored)).models, context.before.models);
      assert.deepEqual(await snapshot(source), context.before);
      for (const model of Prisma.dmmf.datamodel.models) {
        const a = (await source.$queryRawUnsafe(`SHOW CREATE TABLE \`${model.name}\``))[0];
        const b = (await restored.$queryRawUnsafe(`SHOW CREATE TABLE \`${model.name}\``))[0];
        // mysqldump explicitly restates the inherited utf8mb4 column charset on this MySQL release.
        // Normalize ONLY that redundant spelling; column types, collations, CHECKs, FKs and indexes still match.
        const canonical = row => (row['Create Table'] ?? row.f1).replaceAll(' CHARACTER SET utf8mb4 COLLATE utf8mb4_', ' COLLATE utf8mb4_');
        assert.equal(canonical(a), canonical(b), model.name);
      }
      console.log('PASS: all 23 restored model scalar/count hashes and semantic DDL match; only redundant explicit utf8mb4 spelling normalized; exact source/schema unchanged.');
    } else {
      await restored.$disconnect(); restored = undefined;
      const rootUrl = new URL(url); rootUrl.pathname = '/mysql';
      const root = new PrismaClient({ datasources: { db: { url: rootUrl.href } } });
      try { await root.$executeRawUnsafe(`DROP DATABASE \`${context.name}\``); } finally { await root.$disconnect(); }
      for (const file of ['context.json', 'restore.env', 'snapshot.key']) await unlink(`${path}/${file}`);
      console.log('PASS: only marker/name-verified disposable restore database and its private key/config removed. Encrypted fixture evidence retained.');
    }
  } else throw new Error('Use prepare, encrypt, decrypt, verify or cleanup.');
} finally { await restored?.$disconnect(); await source.$disconnect(); }

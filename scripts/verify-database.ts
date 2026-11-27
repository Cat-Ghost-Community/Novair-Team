import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { getDatabaseUrl } from "../src/server/db/environment.ts";

const db = new PrismaClient({ datasources: { db: { url: getDatabaseUrl() } } });
try {
  await db.$queryRaw`SELECT 1`;
  const models = [db.user, db.account, db.session, db.verification, db.service, db.projectRequest,
    db.project, db.projectStatusHistory, db.ticket, db.ticketMessage, db.portfolioItem, db.faq,
    db.siteSetting, db.rateLimit, db.projectRequestStatusHistory, db.adminNote, db.adminOperation, db.projectAuditEvent,
    db.ticketNote, db.ticketStatusHistory, db.ticketOperation, db.contentOperation, db.contentAudit];
  for (const model of models) await (model.count as () => Promise<number>)();
  const migrations = await db.$queryRaw<{ migration_name: string; checksum: string; finished_at: Date | null; rolled_back_at: Date | null }[]>`
    SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations`;
  assert(migrations.length > 0 && migrations.every((row) => row.finished_at && !row.rolled_back_at));
  const released = (await readdir("prisma/migrations", { withFileTypes: true })).filter(entry => entry.isDirectory());
  assert.equal(migrations.length, released.length);
  for (const entry of released) {
    const checksum = createHash("sha256").update(await readFile(`prisma/migrations/${entry.name}/migration.sql`)).digest("hex");
    assert.equal(migrations.find(row => row.migration_name === entry.name)?.checksum, checksum);
  }
  // Roll back the verification records. Never seed fake business data.
  const rollback = new Error("ROLLBACK_VERIFICATION");
  try {
    await db.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { name: "آزمون پایگاه داده", email: `db-check-${Date.now()}@example.invalid` } });
      assert.equal(user.role, "USER");
      const request = await tx.projectRequest.create({ data: { ownerId: user.id, title: "آزمون", description: "بررسی ذخیره‌سازی فارسی" } });
      assert.equal(request.status, "NEW");
      const event = await tx.projectRequestStatusHistory.create({ data: { requestId: request.id, actorId: user.id, fromStatus: null, toStatus: "NEW" } });
      assert.equal(event.actorId, user.id);
      assert.equal(request.description, "بررسی ذخیره‌سازی فارسی");
      throw rollback;
    });
  } catch (error) { if (error !== rollback) throw error; }
  console.log("PASS: local connection, 23 models, applied migrations, Persian round-trip, default roles/status, request history, transaction rollback.");
} catch {
  console.error("FAIL: database verification failed. Run db:generate and db:migrate, then inspect local database configuration.");
  process.exitCode = 1;
} finally { await db.$disconnect(); }

import { PrismaClient } from "@prisma/client";
import { getDatabaseUrl } from "../src/server/db/environment.ts";
import { cleanupExpiredAuthentication } from "../src/server/auth/maintenance.ts";

const db = new PrismaClient({ datasources: { db: { url: getDatabaseUrl() } } });
try {
  const result = await cleanupExpiredAuthentication(db);
  console.log(`Removed expired authentication records only: ${result.sessions} sessions, ${result.limits} rate windows, ${result.verifications} verifications.`);
} catch {
  console.error("Authentication maintenance failed. No account or business record was deleted.");
  process.exitCode = 1;
} finally { await db.$disconnect(); }

import { PrismaClient } from "@prisma/client";
import { getDatabaseUrl } from "../src/server/db/environment.ts";

const db = new PrismaClient({ datasources: { db: { url: getDatabaseUrl() } } });
try {
  await db.$queryRaw`SELECT 1`;
  console.log("PASS: connected to the configured local MySQL database.");
} catch {
  console.error("FAIL: local MySQL connection unavailable. Check .env and the local server.");
  process.exitCode = 1;
} finally { await db.$disconnect(); }

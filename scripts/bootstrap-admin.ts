import { PrismaClient } from "@prisma/client";
import { bootstrapAdministrator } from "../src/server/auth/bootstrap.ts";
import { getDatabaseUrl } from "../src/server/db/environment.ts";

const db = new PrismaClient({ datasources: { db: { url: getDatabaseUrl() } } });
try {
  if (process.env.NODE_ENV === "production") throw new Error("Local bootstrap is disabled in production.");
  const result = await bootstrapAdministrator(db, { email: process.env.ADMIN_EMAIL, name: process.env.ADMIN_NAME, password: process.env.ADMIN_PASSWORD });
  console.log(result.created ? "Created a local administrator. Remove ADMIN_PASSWORD from .env now." : "Administrator already exists and is unchanged. Remove ADMIN_PASSWORD from .env now.");
} catch {
  console.error("Administrator was not created. Supply valid ADMIN_EMAIL, ADMIN_NAME and a 12–128 character ADMIN_PASSWORD; existing accounts are never modified.");
  process.exitCode = 1;
} finally { await db.$disconnect(); }

import "server-only";
import { PrismaClient } from "@prisma/client";
import { getDatabaseUrl } from "./environment";

const globalDatabase = globalThis as unknown as { novairDatabase?: PrismaClient };

export function getDatabase(): PrismaClient {
  if (!globalDatabase.novairDatabase) {
    // Small bounded pool. Do not create a client per request or disconnect on every render.
    const url = new URL(getDatabaseUrl());
    url.searchParams.set("connection_limit", "5");
    url.searchParams.set("pool_timeout", "10");
    url.searchParams.set("connect_timeout", "5");
    globalDatabase.novairDatabase = new PrismaClient({
      datasources: { db: { url: url.toString() } },
      log: [],
    });
  }
  return globalDatabase.novairDatabase;
}

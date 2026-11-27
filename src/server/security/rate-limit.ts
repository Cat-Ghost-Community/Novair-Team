import "server-only";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { getDatabase } from "@/server/db/client";

// Database-backed fixed window, atomic under MySQL row locking. No sensitive endpoint yet.
export async function consumeRateLimit(identity: string, limit = 5, windowMs = 60_000): Promise<boolean> {
  const now = Date.now();
  const start = Math.floor(now / windowMs) * windowMs;
  const key = createHash("sha256").update(`${identity}:${start}`).digest("hex");
  const windowStart = new Date(start);
  const expiresAt = new Date(start + windowMs);
  return getDatabase().$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`INSERT INTO RateLimit (\`key\`, count, windowStart, expiresAt)
      VALUES (${key}, 1, ${windowStart}, ${expiresAt})
      ON DUPLICATE KEY UPDATE count = count + 1`);
    const record = await tx.rateLimit.findUniqueOrThrow({ where: { key } });
    return record.count <= limit;
  });
}

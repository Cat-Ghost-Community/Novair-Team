import "server-only";
import { createHmac } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";

// Every request shares the direct-loopback source bucket. Forwarding headers never select identity.
// Replace this source policy only with an explicitly configured trusted ingress in a later deployment.
export async function consumeAuthLimit(db: PrismaClient, secret: string, operation: string, identity: string) {
  const windowMs = operation === "sign-up/email" ? 600_000 : 60_000;
  return db.$transaction((tx) => consumeDatabaseLimit(tx, secret, operation, identity, {
    windowMs, sourceLimit: operation === "sign-up/email" ? 30 : 60, identityLimit: operation === "sign-up/email" ? 6 : 8,
  }), { maxWait: 10_000, timeout: 10_000 });
}

// Also usable inside a business transaction; callers must commit denied counters.
export async function consumeDatabaseLimit(tx: Prisma.TransactionClient, secret: string, operation: string, identity: string,
  policy: { windowMs: number; sourceLimit: number; identityLimit: number }) {
  const now = Date.now();
  const { windowMs } = policy;
  const start = Math.floor(now / windowMs) * windowMs;
  const limits = [
    { identity: "direct-local-source", limit: policy.sourceLimit },
    { identity, limit: policy.identityLimit },
  ];
  const allowed = await (async () => {
    let accepted = true;
    for (const item of limits) {
      const key = createHmac("sha256", secret).update(`${operation}:${start}:${item.identity}`).digest("hex");
      await tx.$executeRaw(Prisma.sql`INSERT INTO RateLimit (\`key\`, count, windowStart, expiresAt)
        VALUES (${key}, 1, ${new Date(start)}, ${new Date(start + windowMs)})
        ON DUPLICATE KEY UPDATE count = count + 1`);
      const row = await tx.rateLimit.findUniqueOrThrow({ where: { key } });
      if (row.count > item.limit) accepted = false;
    }
    return accepted;
  })();
  return { allowed, retryAfter: Math.max(1, Math.ceil((start + windowMs - now) / 1000)) };
}

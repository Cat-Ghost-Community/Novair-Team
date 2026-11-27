import type { PrismaClient } from "@prisma/client";

// Intentionally excludes users, credentials, histories and durable idempotency ledgers.
export async function cleanupExpiredAuthentication(db: PrismaClient, now = new Date()) {
  const [sessions, limits, verifications] = await db.$transaction([
    db.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.rateLimit.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.verification.deleteMany({ where: { expiresAt: { lt: now } } }),
  ]);
  return { sessions: sessions.count, limits: limits.count, verifications: verifications.count };
}

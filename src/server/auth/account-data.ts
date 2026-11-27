import "server-only";
import type { PrismaClient } from "@prisma/client";
import type { AuthenticationService } from "./service.ts";

export class AccountAccessError extends Error {
  readonly status: 401 | 403;
  constructor(status: 401 | 403) { super("دسترسی به این بخش مجاز نیست."); this.status = status; }
}
export async function readOwnAccount(authentication: AuthenticationService, headers: Headers) {
  const context = await authentication.principal(headers);
  if (!context) throw new AccountAccessError(401);
  return context.user;
}
export async function readAdminOverview(authentication: AuthenticationService, db: PrismaClient, headers: Headers) {
  const user = await readOwnAccount(authentication, headers);
  if (user.role !== "ADMIN") throw new AccountAccessError(403);
  const [activeUsers, disabledUsers] = await Promise.all([
    db.user.count({ where: { disabledAt: null } }), db.user.count({ where: { disabledAt: { not: null } } }),
  ]);
  return { activeUsers, disabledUsers };
}

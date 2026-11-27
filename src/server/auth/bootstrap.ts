import type { PrismaClient } from "@prisma/client";
import { hashPassword, verifyPassword, passwordSchema } from "./password.ts";
import { emailSchema, nameSchema } from "../../shared/validation.ts";

// Trusted local operator only. Never called from a route, server action or public registration.
export async function bootstrapAdministrator(db: PrismaClient, input: { email: unknown; name: unknown; password: unknown }) {
  const email = emailSchema.parse(input.email);
  const name = nameSchema.parse(input.name);
  const password = passwordSchema.parse(input.password);
  const existing = await db.user.findUnique({ where: { email }, include: { accounts: { where: { providerId: "credential" } } } });
  if (existing) {
    const encoded = existing.accounts[0]?.password;
    if (existing.role !== "ADMIN" || existing.disabledAt || !encoded || !await verifyPassword(password, encoded)) throw new Error("Account exists; no changes were made.");
    return { created: false, id: existing.id };
  }
  const encoded = await hashPassword(password);
  return db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email, name, role: "ADMIN", emailVerified: false } });
    await tx.account.create({ data: { providerId: "credential", accountId: user.id, userId: user.id, password: encoded } });
    return { created: true, id: user.id };
  });
}

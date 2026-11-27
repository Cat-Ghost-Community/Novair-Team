import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../../src/server/auth/password.ts";
import { hasRole, safeReturnPath } from "../../src/server/auth/policy.ts";
import { localDatabaseUrl } from "../../src/server/db/environment.ts";
import { emailSchema, nameSchema } from "../../src/shared/validation.ts";

export const cases: [string, () => void | Promise<void>][] = [
  ["password hashing uses unique salts and verifies only the matching password", async () => {
    const password = "correct horse battery staple";
    const first = await hashPassword(password);
    const second = await hashPassword(password);
    assert.notEqual(first, second);
    assert(!first.includes(password));
    assert(await verifyPassword(password, first));
    assert.equal(await verifyPassword("incorrect-password", first), false);
  }],
  ["malformed hashes and invalid password sizes are rejected safely", async () => {
    for (const hash of ["", "scrypt-v1$00$00", "scrypt-v2$" + "a".repeat(500), "arbitrary plaintext"]) {
      assert.equal(await verifyPassword("correct-password", hash), false);
    }
    await assert.rejects(hashPassword("short"));
    await assert.rejects(hashPassword("a".repeat(129)));
    assert.equal(await verifyPassword("a".repeat(10000), "invalid"), false);
  }],
  ["role authorization rejects anonymous, disabled and wrong-role principals", () => {
    assert.equal(hasRole(null, "ADMIN"), false);
    assert.equal(hasRole({ id: "a", role: "USER", disabledAt: null }, "ADMIN"), false);
    assert.equal(hasRole({ id: "a", role: "ADMIN", disabledAt: new Date() }, "ADMIN"), false);
    assert.equal(hasRole({ id: "a", role: "ADMIN", disabledAt: null }, "ADMIN"), true);
    assert.equal(hasRole({ id: "u", role: "USER", disabledAt: null }, "USER"), true);
  }],
  ["return paths cannot redirect to another origin or smuggle encoded paths", () => {
    for (const input of ["https://evil.invalid", "//evil.invalid", "/\\evil.invalid", "/admin%2f%2fevil", "/admin\n", "/dashboard?next=evil", "/administrator", "/admin/../login", null]) {
      assert.equal(safeReturnPath(input), "/dashboard");
    }
    assert.equal(safeReturnPath("/admin/requests"), "/admin/requests");
    assert.equal(safeReturnPath("/dashboard/tickets"), "/dashboard/tickets");
  }],
  ["database configuration accepts local MySQL and rejects remote or substituted storage", () => {
    assert(localDatabaseUrl.safeParse("mysql://app:secret@127.0.0.1:3307/novair_local").success);
    for (const input of ["file:local.db", "postgresql://u:p@localhost/db", "mysql://u:p@remote.invalid/db", "mysql://localhost/db", ""]) {
      assert.equal(localDatabaseUrl.safeParse(input).success, false);
    }
  }],
  ["identity validation normalizes email and supports Persian names", () => {
    assert.equal(emailSchema.parse("  TEAM@EXAMPLE.INVALID  "), "team@example.invalid");
    assert.equal(nameSchema.parse("  تیم نوایر  "), "تیم نوایر");
    assert.equal(emailSchema.safeParse("not-an-email").success, false);
    assert.equal(nameSchema.safeParse(" ").success, false);
  }],
];

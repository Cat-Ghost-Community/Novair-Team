import { test } from "node:test";
import assert from "node:assert/strict";
import { assessDependencyReadiness } from "../../scripts/lib/dependency-readiness.mjs";

const ready = [
  { name: "next", declared: "16.4.2", installed: "16.4.2" },
  { name: "@prisma/client", declared: "6.19.3", installed: "6.19.3" },
  { name: "better-auth", declared: "1.7.12", installed: "1.7.12" },
  { name: "@better-auth/prisma-adapter", declared: "1.7.12", installed: "1.7.12" },
  { name: "prettier", declared: "3.8.1", installed: null },
  { name: "vitest", declared: "4.0.18", installed: null },
];

// Fixture package metadata tests workflow policy only; it does not simulate working authentication.
test("optional tools and missing release lockfile do not block an available auth dependency", () => {
  const result = assessDependencyReadiness(ready, false);
  assert.equal(result.blocked, false);
  assert.equal(result.inventoryStatus, "PREREQUISITES_PRESENT_REVIEW_REQUIRED");
  assert.equal(result.authenticationCertified, false);
  assert.deepEqual(result.developmentBlockers, []);
  assert.deepEqual(result.optionalToolsMissing, ["prettier", "vitest"]);
  assert.equal(result.releaseDebt.length, 1);
});

test("absent authentication dependencies still block activation prerequisites", () => {
  const result = assessDependencyReadiness(ready.filter((item) => !item.name.includes("auth")), true);
  assert.equal(result.blocked, true);
  assert.equal(result.authenticationCertified, false);
});

test("Better Auth without its required Prisma integration is not marked available", () => {
  const result = assessDependencyReadiness(ready.filter((item) => item.name !== "@better-auth/prisma-adapter"), true);
  assert.equal(result.blocked, true);
});

test("a required framework version mismatch remains a development blocker", () => {
  const result = assessDependencyReadiness(ready.map((item) => item.name === "next" ? { ...item, installed: "15.0.0" } : item), true);
  assert.equal(result.blocked, true);
  assert(result.missingOrMismatched.includes("next"));
});

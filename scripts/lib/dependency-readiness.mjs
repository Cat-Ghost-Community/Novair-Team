const optionalTools = new Set(["prettier", "vitest"]);

// This project pins exact versions. Presence checks never certify library security or integration.
export function assessDependencyReadiness(packages, lockPresent) {
  const entry = (name) => packages.find((item) => item.name === name);
  const installed = (name) => {
    const item = entry(name);
    return Boolean(item?.declared && item.installed === item.declared);
  };
  const missingOrMismatched = packages.filter((item) => item.declared && item.installed !== item.declared).map((item) => item.name);
  const requiredMissing = missingOrMismatched.filter((name) => !optionalTools.has(name));
  const candidate = (installed("better-auth") && installed("@better-auth/prisma-adapter")) || installed("next-auth");
  const blocked = !candidate || requiredMissing.length > 0;
  return {
    inventoryStatus: blocked ? "BLOCKED" : "PREREQUISITES_PRESENT_REVIEW_REQUIRED",
    authenticationCertified: false,
    missingOrMismatched,
    developmentBlockers: [!candidate && "No declared matching authentication library/integration", requiredMissing.length > 0 && "Required package inventory is incomplete"].filter(Boolean),
    optionalToolsMissing: packages.filter((item) => optionalTools.has(item.name) && !item.installed).map((item) => item.name),
    releaseDebt: lockPresent ? [] : ["Complete root lockfile and reproducible installation required before V1 release"],
    blocked,
  };
}

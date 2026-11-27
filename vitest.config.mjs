const config = {
  test: {
    environment: "node",
    include: ["tests/unit/**/*.vitest.mjs"],
    coverage: { include: ["src/server/auth/password.ts", "src/server/auth/policy.ts", "src/shared/validation.ts"] },
  },
};
export default config;

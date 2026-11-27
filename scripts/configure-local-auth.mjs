import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

// Preserve all existing local credentials. Never print the generated authentication secret.
let contents = await readFile(".env", "utf8");
const configured = contents.match(/^BETTER_AUTH_SECRET=(.*)$/m)?.[1]?.trim().replace(/^(["'])(.*)\1$/, "$2") ?? "";
if (configured && configured.length < 32) throw new Error("Existing auth secret is too short; explicitly replace it locally. It was not changed.");
if (!configured) {
  const line = `BETTER_AUTH_SECRET=${randomBytes(48).toString("base64url")}`;
  contents = /^BETTER_AUTH_SECRET=.*$/m.test(contents) ? contents.replace(/^BETTER_AUTH_SECRET=.*$/m, line) : `${contents.trimEnd()}\n${line}\n`;
}
if (!/^AUTH_ENABLED=/m.test(contents)) contents = `${contents.trimEnd()}\nAUTH_ENABLED=false\n`;
if (process.argv.includes("--enable")) contents = contents.replace(/^AUTH_ENABLED=.*$/m, "AUTH_ENABLED=true");
await writeFile(".env", contents, { mode: 0o600 });
console.log(process.argv.includes("--enable") ? "Enabled verified local authentication; no secrets printed." : "Prepared a private local authentication secret. Activation remains unchanged.");

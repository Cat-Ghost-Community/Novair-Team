import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";

if (existsSync(".env")) {
  console.error(".env already exists. It was left unchanged. Edit it for an existing local MySQL server.");
  process.exitCode = 1;
} else {
  const password = randomBytes(24).toString("hex");
  writeFileSync(".env", [
    `DATABASE_URL=mysql://novair:${password}@127.0.0.1:3307/novair_local`,
    "MYSQL_DATABASE=novair_local", "MYSQL_USER=novair", `MYSQL_PASSWORD=${password}`,
    `MYSQL_ROOT_PASSWORD=${randomBytes(24).toString("hex")}`, "MYSQL_PORT=3307",
    "SITE_URL=http://127.0.0.1:3000", "AUTH_ENABLED=true", `BETTER_AUTH_SECRET=${randomBytes(48).toString("base64url")}`,
    "ADMIN_EMAIL=", "ADMIN_PASSWORD=", "ADMIN_NAME=", "",
  ].join("\n"), { flag: "wx", mode: 0o600 });
  console.log("Created .env with random local database credentials. No secrets printed.");
}

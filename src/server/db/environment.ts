import { z } from "zod";

export const localDatabaseUrl = z.string().url().refine((input) => {
  if (!URL.canParse(input)) return false;
  const url = new URL(input);
  return url.protocol === "mysql:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    && Boolean(url.username) && Boolean(url.password) && url.pathname.length > 1;
}, "A credentialed local MySQL DATABASE_URL is required.");

export function getDatabaseUrl(): string {
  const result = localDatabaseUrl.safeParse(process.env.DATABASE_URL);
  if (!result.success) throw new Error("Local database configuration is missing or invalid.");
  return result.data;
}

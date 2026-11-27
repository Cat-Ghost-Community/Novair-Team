import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const passwordSchema = z.string().min(12).max(128);
const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
let pendingDerivations = 0;
function derive(password: string, salt: string): Promise<Buffer> {
  if (pendingDerivations >= 16) return Promise.reject(new Error("Password processing is busy."));
  pendingDerivations++;
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, options, (error, key) => {
      pendingDerivations--;
      if (error) reject(error);
      else resolve(key);
    });
  });
}

// Versioned format shared by Better Auth's documented callbacks and the local bootstrap.
export async function hashPassword(input: string): Promise<string> {
  const password = passwordSchema.parse(input);
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt);
  return `scrypt-v1$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  if (!passwordSchema.safeParse(password).success) return false;
  const match = /^scrypt-v1\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(encoded);
  if (!match?.[1] || !match[2]) return false;
  const key = await derive(password, match[1]);
  return timingSafeEqual(key, Buffer.from(match[2], "hex"));
}

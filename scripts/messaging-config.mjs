import { constants } from "node:fs";
import { lstat, mkdir, open, rmdir } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { replacePrivateFile } from "./server-release.mjs";

export const emailAddress = z.email().max(191);
export const gmailSettings = z.strictObject({
  address: emailAddress,
  appPassword: z.string().length(16).regex(/^[a-z\d]+$/i),
  port: z.union([z.literal(465), z.literal(587)]),
});
export const smsSettings = z.strictObject({
  apiKey: z.string().min(8).max(512).refine(value => !/[^\x21-\x7e]/.test(value)),
  templateId: z.number().int().min(1).max(2147483647),
  parameter: z.string().regex(/^[a-z][a-z0-9_]{0,24}$/i).refine(value => value === value.trim()),
});
const settings = z.strictObject({ gmail: gmailSettings.optional(), sms: smsSettings.optional() });

export function iranianMobile(input) {
  const digits = input.trim().replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) & 15)).replace(/[ -]/g, "");
  const match = /^(?:\+98|0098|98|0)?(9\d{9})$/.exec(digits);
  if (!match) throw new Error("Enter an Iranian mobile number, such as 09xxxxxxxxx or +989xxxxxxxxx.");
  return `0${match[1]}`;
}

async function requirePrivateDirectory(directory) {
  const info = await lstat(directory);
  if (!info.isDirectory() || info.uid !== process.getuid() || (info.mode & 0o077)) {
    throw new Error("The messaging directory must be a private directory owned by this Linux user (mode 0700).");
  }
}

export async function readMessagingSettings(directory) {
  try { await requirePrivateDirectory(directory); }
  catch (error) { if (error.code === "ENOENT") return {}; throw error; }
  let file;
  try { file = await open(join(directory, "providers.json"), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK); }
  catch (error) { if (error.code === "ENOENT") return {}; throw error; }
  try {
    const info = await file.stat();
    if (!info.isFile() || info.uid !== process.getuid() || (info.mode & 0o077) || info.size > 8192) {
      throw new Error("The provider file must be a private regular file owned by this user (mode 0600).");
    }
    try { return settings.parse(JSON.parse(await file.readFile("utf8"))); }
    catch { throw new Error("Stored messaging settings are invalid. Review the private provider file locally."); }
  } finally { await file.close(); }
}

export async function saveMessagingSettings(directory, original, updated) {
  const parsed = settings.safeParse(updated);
  if (!parsed.success) throw new Error("Messaging settings are invalid.");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await requirePrivateDirectory(directory);
  const lock = join(directory, "edit.lock");
  await mkdir(lock, { mode: 0o700 });
  try {
    if (JSON.stringify(await readMessagingSettings(directory)) !== JSON.stringify(original)) {
      throw new Error("Messaging settings changed in another terminal. Reopen the wizard before saving.");
    }
    await replacePrivateFile(join(directory, "providers.json"), JSON.stringify(parsed.data, null, 2) + "\n");
  } finally { await rmdir(lock); }
}

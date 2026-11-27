import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "@playwright/test";

export async function openBrowser() {
  if (process.env.NOVAIR_BROWSER_LAUNCH === "1") {
    return chromium.launch({ chromiumSandbox: true });
  }
  let endpoint = process.env.NOVAIR_CDP_URL;
  if (!endpoint && process.env.LOCALAPPDATA) {
    const activePort = await readFile(join(process.env.LOCALAPPDATA,
      "Google/Chrome/User Data/DevToolsActivePort"), "utf8");
    const [port, path] = activePort.trim().split(/\r?\n/);
    endpoint = `ws://127.0.0.1:${port}${path}`;
  }
  if (!endpoint) throw new Error("Set an authorized local NOVAIR_CDP_URL or opt into a new isolated browser with NOVAIR_BROWSER_LAUNCH=1.");
  const url = new URL(endpoint);
  if (!["ws:", "http:"].includes(url.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error("CDP checks require a local browser endpoint.");
  }
  return chromium.connectOverCDP(endpoint, { timeout: 10_000, noDefaults: true });
}

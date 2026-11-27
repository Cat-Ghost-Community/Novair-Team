import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const buildMemoryMiB = 2048;

export function checkBuildBudget(memory, cpu) {
  const [quota, period] = cpu.trim().split(/\s+/).map(Number);
  if (!/^\d+$/.test(memory.trim()) || Number(memory) <= 0 || Number(memory) > buildMemoryMiB * 1024 ** 2 ||
      !Number.isFinite(quota) || quota <= 0 || !Number.isFinite(period) || period <= 0 || quota > period) {
    throw new Error("The shared-server build needs an enforced 2 GiB memory limit and a one-core CPU limit.");
  }
}

async function main() {
  const group = (await readFile("/proc/self/cgroup", "utf8")).match(/^0::(\/[^\n]+)$/m)?.[1];
  if (!group || group.split("/").includes("..")) throw new Error("A delegated Linux cgroup v2 build scope is required.");
  const path = join("/sys/fs/cgroup", group);
  const [memory, cpu] = await Promise.all(["memory.max", "cpu.max"].map(file => readFile(join(path, file), "utf8")));
  checkBuildBudget(memory, cpu);
  const available = Number((await readFile("/proc/meminfo", "utf8")).match(/^MemAvailable:\s+(\d+) kB$/m)?.[1]);
  if (!Number.isFinite(available) || available < (buildMemoryMiB + 1024) * 1024) {
    throw new Error("The host needs at least 3 GiB of available memory before the shared-server build.");
  }
  const [command, ...args] = process.argv.slice(2);
  if (!command) return;
  const child = spawnSync(command, args, { stdio: "inherit" });
  process.exitCode = child.status ?? 1;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await main().catch(error => { console.error(error.message); process.exitCode = 1; });
}

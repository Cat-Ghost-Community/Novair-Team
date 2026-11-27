import { createServer } from "node:net";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const proxyDirectories = [
  "/etc/nginx/sites-enabled", "/etc/nginx/conf.d",
  "/etc/apache2/sites-enabled", "/etc/apache2/conf-enabled", "/etc/httpd/conf.d",
];

export function parsePort(value) {
  const text = String(value);
  if (text !== text.trim() || !/^\d{1,5}$/.test(text) || Number(text) < 1024 || Number(text) > 65535) {
    throw new Error("Choose a TCP port between 1024 and 65535.");
  }
  return Number(text);
}

export async function proxyReservations(extraFiles = [], directories = proxyDirectories) {
  const files = [...extraFiles];
  for (const directory of directories) {
    let entries;
    try { entries = await readdir(directory, { withFileTypes: true }); }
    catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    for (const entry of entries) {
      if (entry.isFile() || entry.isSymbolicLink()) files.push(join(directory, entry.name));
    }
  }
  const reserved = new Set();
  for (const file of files) {
    const config = (await readFile(file, "utf8")).replace(/^[ \t]*#.*$/gm, "");
    // Include offline upstreams and explicit reverse-proxy listeners, not only running sockets.
    for (const match of config.matchAll(/(?:localhost|127(?:\.\d{1,3}){3}|\[::1\]):(\d+)(?!\d)|^\s*listen\s+(?:\S+:)?(\d+)(?=[;\s]|$)/gim)) {
      reserved.add(Number(match[1] ?? match[2]));
    }
  }
  return reserved;
}

async function canBind(host, port) {
  const server = createServer(socket => socket.destroy());
  return new Promise((resolve, reject) => {
    server.once("error", error => {
      if (["EADDRINUSE", "EACCES"].includes(error.code)) resolve(false);
      else if (host.includes(":") && ["EAFNOSUPPORT", "EADDRNOTAVAIL", "EPROTONOSUPPORT"].includes(error.code)) resolve(true);
      else reject(error);
    });
    server.listen({ host, port, ipv6Only: host.includes(":"), exclusive: true }, () => server.close(error => {
      if (error) reject(error);
      else resolve(true);
    }));
  });
}

// Probe both loopback families after the caller checks the host-wide listener inventory.
export async function selectPort({ preferred = 3400, reserved = new Set(), first = 3400, last = 3499 } = {}) {
  const candidates = new Set([parsePort(preferred)]);
  for (let port = first; port <= last; port++) candidates.add(parsePort(port));
  for (const port of candidates) {
    if (!reserved.has(port) && await canBind("127.0.0.1", port) && await canBind("::1", port)) return port;
  }
  throw new Error("No free, unreserved backend port was found. Supply another preferred port.");
}

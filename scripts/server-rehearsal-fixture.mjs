import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parsePort } from "./server-install-network.mjs";

export const forcedFailure = "novair-rehearsal-forced-failure";

export function markHomepage(source, marker) {
  const matches = source.match(/<h1 id="hero-title">/g);
  if (!/^[a-z0-9-]+$/.test(marker) || matches?.length !== 1) {
    throw new Error("Could not uniquely mark the disposable homepage fixture.");
  }
  return source.replace('<h1 id="hero-title">', `<h1 id="hero-title" data-novair-rehearsal="${marker}">`);
}

export function failOnlyOnLivePort(source, value) {
  const port = parsePort(value);
  const handler = "export async function proxy(request: NextRequest) {";
  const matcher = 'matcher: ["/dashboard/:path*", "/admin/:path*"]';
  if (source.split(handler).length !== 2 || source.split(matcher).length !== 2) {
    throw new Error("Could not uniquely add the rollback fault to the disposable proxy fixture.");
  }
  // Preview remains healthy. Only restarting on the installed port produces a real HTTP 503.
  return source.replace(handler, `${handler}
  if (request.nextUrl.pathname === "/") {
    return process.env.PORT === "${port}"
      ? new NextResponse("${forcedFailure}", { status: 503 })
      : NextResponse.next();
  }`).replace(matcher, 'matcher: ["/", "/dashboard/:path*", "/admin/:path*"]');
}

export async function instrumentFixture(checkout, marker, livePort) {
  const home = join(checkout, "src/app/(public)/page.tsx");
  await writeFile(home, markHomepage(await readFile(home, "utf8"), marker));
  if (livePort !== undefined) {
    const proxy = join(checkout, "src/proxy.ts");
    await writeFile(proxy, failOnlyOnLivePort(await readFile(proxy, "utf8"), livePort));
  }
}

import "server-only";
import { site } from "@/config/site";

// Apply before any future mutation route. Server Actions additionally verify Origin in Next.
export function assertSameOrigin(request: Request): void {
  if (request.headers.get("origin") !== site.url.origin) throw new Error("درخواست معتبر نیست.");
  if (request.headers.get("sec-fetch-site") === "cross-site") throw new Error("درخواست معتبر نیست.");
}

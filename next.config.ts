import type { NextConfig } from "next";
import { resolveSiteProfile } from "./src/config/site-profile";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
  devIndicators: false,
  // The reviewed catalog has small raster files that can be served directly.
  images: { unoptimized: true, localPatterns: [{ pathname: "/portfolio/**", search: "" }] },
  experimental: {
    serverActions: { bodySizeLimit: "1mb" },
    // Supported in-process/threaded compilation for local hosts that disallow child workers.
    ...(process.env.NOVAIR_BUILD_IN_PROCESS === "1" ? { webpackBuildWorker: false, workerThreads: true, useTypeScriptCli: false, cpus: 1 } : {}),
  },
  async headers() {
    const development = process.env.NODE_ENV === "development";
    const { index } = resolveSiteProfile(process.env);
    const policy = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "img-src 'self' data:",
      "font-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      // Next's streamed bootstrap and the pre-paint theme script need inline scripts.
      // Adopt per-request nonces before exposing user-authored HTML in a later phase.
      `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ""}`,
      `connect-src 'self'${development ? " ws://127.0.0.1:* ws://localhost:*" : ""}`,
    ].join("; ");
    const noIndex = { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" };
    return [{ source: "/:path*", headers: [
      { key: "Content-Security-Policy", value: policy },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ...(!index ? [noIndex] : []),
    ] }, ...(index ? ["/login", "/register", "/dashboard/:path*", "/admin/:path*", "/api/:path*"]
      .map(source => ({ source, headers: [noIndex] })) : [])];
  },
};
export default nextConfig;

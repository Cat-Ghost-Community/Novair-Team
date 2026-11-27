const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
const dnsLabel = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

export function resolveSiteProfile(env: NodeJS.ProcessEnv) {
  const production = env.NOVAIR_SITE_PROFILE === "production";
  if (env.NOVAIR_SITE_PROFILE && !production && env.NOVAIR_SITE_PROFILE !== "local") {
    throw new Error("NOVAIR_SITE_PROFILE must be local or production.");
  }
  const input = env.SITE_URL || (production ? "" : "http://127.0.0.1:3000");
  if (!URL.canParse(input)) throw new Error("SITE_URL must be a valid origin.");
  const url = new URL(input);
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("SITE_URL must contain only the canonical origin.");
  }
  const hostname = url.hostname;
  if (production) {
    if (url.protocol !== "https:" || url.port ||
      hostname.length > 253 || !hostname.includes(".") || !hostname.split(".").every(label => dnsLabel.test(label)) ||
      /\.(?:localhost|local|internal|lan|home|test|invalid|example)$/.test(hostname) ||
      /^\d+(?:\.\d+){3}$/.test(hostname)) {
      throw new Error("Production SITE_URL requires a public DNS name and HTTPS on the default port.");
    }
    // Public account access remains closed until address verification and recovery are configured.
    if (env.AUTH_ENABLED === "true") throw new Error("Production authentication requires a verified account email lifecycle.");
  } else if (url.protocol !== "http:" || !loopbackHosts.has(hostname)) {
    throw new Error("Local SITE_URL requires a loopback HTTP origin.");
  }
  const index = env.NOVAIR_INDEX_PUBLIC === "true";
  if (index && (!production || env.NODE_ENV !== "production")) {
    throw new Error("Public indexing requires a production build and production site profile.");
  }
  return { url, index };
}

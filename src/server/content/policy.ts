export function safePublicProjectUrl(value: string | null): string | null {
  if (!value || value !== value.trim() || /[\s\\\u0000-\u001f]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    // Links represent public work, not local/admin previews. Nothing is fetched from this URL.
    if (!host.includes(".") || host.endsWith(".localhost") || host.endsWith(".local") ||
      host === "localhost" || host.startsWith("[") || host.endsWith(".") || /\.(?:internal|lan|home|test|invalid|example)$/.test(host) || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;
    if (["bit.ly", "t.co", "tinyurl.com", "is.gd"].includes(host) || [...url.searchParams.keys()].some(key => /^(?:url|redirect|redirect_uri|redirect_url|next|return|returnto|target|destination)$/i.test(key))) return null;
    return url.href;
  } catch { return null; }
}

export function safePortfolioImageKey(value: string | null): string | null {
  return value && /^portfolio\/[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}\.(?:avif|webp|png|jpe?g)$/.test(value)
    ? value : null;
}

// No upload endpoint is enabled in phase 1. Future uploads must also inspect file signatures,
// authorize ownership, use random storage keys outside public/, and scan before serving.
export const uploadPolicy = Object.freeze({
  maxBytes: 5 * 1024 * 1024,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const,
  allowSvg: false,
  storageVisibility: "private" as const,
});

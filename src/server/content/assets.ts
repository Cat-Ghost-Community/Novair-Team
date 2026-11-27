import "server-only";
import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { contentAssets } from "../../content/assets.ts";
export async function trustedContentAsset(key: string | null) {
    const asset = contentAssets.find(a => a.key === key);
    if (!asset)
        return null;
    try {
        const file = resolve(process.cwd(), "public", asset.key);
        const base = resolve(process.cwd(), "public", "portfolio") + sep;
        const canonical = await realpath(file);
        const normalize = (p: string) => process.platform === "win32" ? p.toLowerCase() : p;
        if (!normalize(canonical).startsWith(normalize(base)))
            return null;
        const info = await lstat(file);
        if (!info.isFile() || info.isSymbolicLink() || info.size !== asset.bytes || info.size > 2 * 1024 * 1024)
            return null;
        const bytes = await readFile(file);
        // Exact reviewed content digest, PNG signature/IHDR and bounded dimensions: never extension-only trust.
        if (createHash("sha256").update(bytes).digest("hex") !== asset.sha256 || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" || bytes.toString("ascii", 12, 16) !== "IHDR" || bytes.readUInt32BE(16) !== asset.width || bytes.readUInt32BE(20) !== asset.height || asset.width > 2400 || asset.height > 1600)
            return null;
        return { key: asset.key, src: `/${asset.key}`, width: asset.width, height: asset.height, label: asset.label };
    }
    catch {
        return null;
    }
}

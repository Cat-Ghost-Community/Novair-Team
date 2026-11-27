import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

function contrast(first: string, second: string) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0]! + 0.05) / (values[1]! + 0.05);
}

export const contrastCases: [string, () => void][] = ["light", "dark"].map((theme) => [
  `${theme} semantic text, action, feedback and focus pairs meet contrast thresholds`,
  () => {
    const css = readFileSync(new URL("../../src/app/globals.css", import.meta.url), "utf8");
    const block = theme === "light" ? css.match(/:root\s*\{([^}]+)\}/)?.[1] : css.match(/\[data-theme="dark"\]\s*\{([^}]+)\}/)?.[1];
    assert(block);
    const tokens = Object.fromEntries([...block.matchAll(/--([a-z-]+):\s*(#[a-f0-9]{6});/g)].map((match) => [match[1], match[2]]));
    const pairs = [
      ["text", "background"], ["text-secondary", "background"], ["muted", "background"],
      ["muted", "surface-elevated"], ["text", "surface"],
      ["on-primary", "primary"], ["on-primary", "primary-hover"],
      ["accent-text", "lavender"], ["mint-text", "mint"], ["coral-text", "coral"],
      ["success", "success-surface"], ["warning", "warning-surface"],
      ["danger", "danger-surface"], ["information", "information-surface"],
    ];
    for (const [foreground, background] of pairs) {
      const ratio = contrast(tokens[foreground!]!, tokens[background!]!);
      assert(ratio >= 4.5, `${foreground}/${background}: ${ratio.toFixed(2)} must be >=4.5`);
    }
    for (const foreground of ["focus", "control-border"]) {
      const ratio = contrast(tokens[foreground]!, tokens["surface-elevated"]!);
      assert(ratio >= 3, `${foreground} contrast ${ratio.toFixed(2)} must be >=3`);
    }
  },
]);

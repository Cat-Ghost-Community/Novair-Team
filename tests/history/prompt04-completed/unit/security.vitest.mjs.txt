import { test } from "vitest";
import { cases } from "./security-cases.ts";
import { contrastCases } from "./contrast-cases.ts";
import { contentCases } from "./content-cases.ts";

for (const [name, run] of [...cases, ...contrastCases, ...contentCases]) test(name, run);

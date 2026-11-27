import { test } from "node:test";
import { cases } from "./security-cases.ts";
import { contrastCases } from "./contrast-cases.ts";
import { contentCases } from "./content-cases.ts";

for (const [name, run] of [...cases, ...contrastCases, ...contentCases]) test(name, run);

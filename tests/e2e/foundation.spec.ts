import { test } from "@playwright/test";
import { browserCases } from "../shared/browser-cases";

for (const scenario of browserCases) test(scenario.name, scenario.run);

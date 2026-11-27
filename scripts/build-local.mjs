// Next's supported in-process compiler/TypeScript API and worker-thread mode.
// This does not change permissions or skip compilation, typechecking or prerendering.
process.env.NOVAIR_BUILD_IN_PROCESS = "1";
process.env.NEXT_TELEMETRY_DISABLED = "1";
process.argv = [process.execPath, "next", "build", "--webpack"];
await import("next/dist/bin/next");

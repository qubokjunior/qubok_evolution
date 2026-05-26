import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_lifecycle_telemetry_bench");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

await transpileSimModule("lifecycleTelemetry.ts", "lifecycleTelemetry.mjs");

const { makeObstacleLifecycleTelemetry } = await import(pathToFileURL(join(temporaryDirectory, "lifecycleTelemetry.mjs")).href);

const iterations = 250000;
let pressureSum = 0;
let eventSum = 0;

const input = {
  sensorStats: {
    obstacleMaskHits: 10,
    obstacleMaskSectorWrites: 8
  },
  obstacleResponseStats: {
    forceAppliedCount: 4,
    obstacleHits: 6,
    boundaryHits: 2,
    obstacleCellChecks: 40
  },
  resourceRespawnStats: {
    spawnedCount: 3,
    blockedAttemptCount: 5,
    fallbackUsedCount: 1,
    failedCount: 0
  },
  reproductionStats: {
    birthsThisStep: 2,
    blockedByObstacle: 1,
    obstaclePlacementFailedCount: 1,
    obstacleFallbackUsedCount: 2,
    obstacleBlockedAttemptCount: 7
  }
};

const start = performance.now();

for (let index = 0; index < iterations; index += 1) {
  const telemetry = makeObstacleLifecycleTelemetry(input);
  pressureSum += telemetry.lifecyclePressureScore;
  eventSum += telemetry.lifecycleEventCount;
}

const telemetryMs = performance.now() - start;

await rm(temporaryDirectory, { force: true, recursive: true });

console.log(JSON.stringify({
  bench: "lifecycle-telemetry:m24",
  iterations,
  telemetryMs: round3(telemetryMs),
  averageNsPerBuild: round3((telemetryMs * 1_000_000) / iterations),
  pressureSum: round3(pressureSum),
  eventSum
}, null, 2));

async function transpileSimModule(sourceName, outputName) {
  const sourcePath = join(projectRoot, "src", "sim", sourceName);
  const sourceText = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(sourceText, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      strict: true
    }
  });

  const output = transpiled.outputText
    .replaceAll('from "./obstacleResponse"', 'from "./obstacleResponse.mjs"')
    .replaceAll('from "./reproduction"', 'from "./reproduction.mjs"')
    .replaceAll('from "./sensors"', 'from "./sensors.mjs"')
    .replaceAll('from "./spawnValidation"', 'from "./spawnValidation.mjs"');

  await writeFile(join(temporaryDirectory, outputName), output, "utf8");
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

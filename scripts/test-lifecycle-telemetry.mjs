import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_lifecycle_telemetry_test");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

await transpileSimModule("lifecycleTelemetry.ts", "lifecycleTelemetry.mjs");

const {
  LIFECYCLE_TELEMETRY_VERSION,
  makeObstacleLifecycleTelemetry
} = await import(pathToFileURL(join(temporaryDirectory, "lifecycleTelemetry.mjs")).href);

assertEqual(LIFECYCLE_TELEMETRY_VERSION, "qubok_evolve.lifecycle_telemetry.v1", "lifecycle telemetry version");

const telemetry = makeObstacleLifecycleTelemetry({
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
});

assertEqual(telemetry.version, "qubok_evolve.lifecycle_telemetry.v1", "telemetry object version");
assertEqual(telemetry.sensorMaskHits, 10, "sensor mask hits");
assertEqual(telemetry.responseForceCount, 4, "response force count");
assertEqual(telemetry.resourceRespawnedCount, 3, "resource respawned count");
assertEqual(telemetry.reproductionBirths, 2, "reproduction births");
assertEqual(telemetry.spawnBlockedAttempts, 12, "combined blocked attempts");
assertEqual(telemetry.spawnFallbacks, 3, "combined fallbacks");
assertEqual(telemetry.spawnFailures, 1, "combined failures");
assertEqual(telemetry.reproductionBlockedByObstacle, 1, "reproduction blocked by obstacle");
assertEqual(telemetry.reproductionPlacementFailures, 1, "reproduction placement failures");

if (!(telemetry.lifecycleEventCount > 0)) {
  throw new Error("lifecycleEventCount should be positive");
}

if (!(telemetry.lifecyclePressureScore > 0)) {
  throw new Error("lifecyclePressureScore should be positive");
}

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("lifecycle telemetry tests passed");

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

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

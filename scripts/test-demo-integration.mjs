import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const readText = (relativePath) => readFileSync(resolve(projectRoot, relativePath), "utf8");

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const packageJson = JSON.parse(readText("package.json"));
const appVersion = readText("src/shared/appVersion.ts");
const demoSimulation = readText("src/sim/demoSimulation.ts");
const lifecycleTelemetry = readText("src/sim/lifecycleTelemetry.ts");
const perfMetrics = readText("src/shared/perfMetrics.ts");
const debugOverlay = readText("src/render/debugOverlay.ts");
const pixiRenderer = readText("src/render/pixiRenderer.ts");

assert(packageJson.version === "0.1.0-milestone.24", "package.json version must be 0.1.0-milestone.24.");
assert(appVersion.includes('PROJECT_VERSION = "0.1.0-milestone.24"'), "appVersion must expose milestone.24.");
assert(appVersion.includes('PROJECT_MILESTONE_LABEL = "m24"'), "appVersion must expose m24 overlay label.");

for (const forbiddenImport of ["../render/", "./render/", "../ui/", "./ui/", "pixi.js", "react"]) {
  assert(!demoSimulation.includes(forbiddenImport), `demoSimulation must not import forbidden boundary token: ${forbiddenImport}`);
}

for (const requiredDemoToken of [
  "makeObstacleLifecycleTelemetry",
  "ObstacleLifecycleTelemetry",
  "obstacleLifecycleTelemetry",
  "resourceRespawnStats",
  "reproductionStats"
]) {
  assert(demoSimulation.includes(requiredDemoToken), `demoSimulation is missing lifecycle telemetry token: ${requiredDemoToken}`);
}

for (const requiredLifecycleToken of [
  "LIFECYCLE_TELEMETRY_VERSION",
  "makeObstacleLifecycleTelemetry",
  "lifecycleEventCount",
  "lifecyclePressureScore",
  "spawnBlockedAttempts",
  "reproductionPlacementFailures"
]) {
  assert(lifecycleTelemetry.includes(requiredLifecycleToken), `lifecycle telemetry module is missing token: ${requiredLifecycleToken}`);
}

for (const requiredMetricToken of [
  "obstacleLifecycleEvents",
  "obstacleLifecyclePressure",
  "obstacleSpawnBlockedAttempts",
  "obstacleSpawnFallbacks",
  "obstacleSpawnFailures",
  "obstacleReproductionBlocked",
  "obstacleReproductionFailures",
  "obstacleResourceRespawns"
]) {
  assert(perfMetrics.includes(requiredMetricToken), `perf metrics missing lifecycle token: ${requiredMetricToken}`);
  assert(pixiRenderer.includes(requiredMetricToken), `pixiRenderer missing lifecycle token: ${requiredMetricToken}`);
  assert(debugOverlay.includes(requiredMetricToken), `debugOverlay missing lifecycle token: ${requiredMetricToken}`);
}

console.log("demo integration tests passed");

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
const obstacleRenderSnapshot = readText("src/sim/obstacleRenderSnapshot.ts");
const pixiRenderer = readText("src/render/pixiRenderer.ts");
const debugOverlay = readText("src/render/debugOverlay.ts");
const perfMetrics = readText("src/shared/perfMetrics.ts");
const energy = readText("src/sim/energy.ts");
const predatorPrey = readText("src/sim/predatorPrey.ts");
const lifecyclePressureTest = readText("scripts/test-lifecycle-pressure.mjs");

assert(packageJson.version === "0.1.0-milestone.28", "package.json version must be 0.1.0-milestone.28.");
assert(appVersion.includes('PROJECT_VERSION = "0.1.0-milestone.28"'), "appVersion must expose milestone.28.");
assert(appVersion.includes('PROJECT_MILESTONE_LABEL = "m28"'), "appVersion must expose m28 overlay label.");
assert(energy.includes("killAgent(world, index)"), "energy deaths must use killAgent so dead slots enter the free-list.");
assert(predatorPrey.includes("killAgent(world, preyIndex)"), "predator/prey kills must use killAgent so dead slots enter the free-list.");
assert(lifecyclePressureTest.includes("death -> reusable slot -> birth"), "lifecycle pressure test must document the m28 loop.");

for (const forbiddenImport of ["../render/", "./render/", "../ui/", "./ui/", "pixi.js", "react"]) {
  assert(!demoSimulation.includes(forbiddenImport), `demoSimulation must not import forbidden boundary token: ${forbiddenImport}`);
}

for (const requiredDemoToken of [
  "makeObstacleMaskRenderSnapshot",
  "ObstacleMaskRenderSnapshot",
  "obstacleMaskSnapshot"
]) {
  assert(demoSimulation.includes(requiredDemoToken), `demoSimulation is missing obstacle render token: ${requiredDemoToken}`);
}

for (const requiredSnapshotToken of [
  "OBSTACLE_RENDER_SNAPSHOT_VERSION",
  "makeObstacleMaskRenderSnapshot",
  "occupiedCellIds",
  "occupiedCellCount"
]) {
  assert(obstacleRenderSnapshot.includes(requiredSnapshotToken), `obstacle render snapshot module is missing token: ${requiredSnapshotToken}`);
}

for (const requiredRendererToken of [
  "obstacleLayer",
  "renderObstacleMask",
  "obstacleRenderMs",
  "obstacleRenderCellCount",
  "ObstacleMaskRenderSnapshot"
]) {
  assert(pixiRenderer.includes(requiredRendererToken), `pixiRenderer missing obstacle render token: ${requiredRendererToken}`);
}

for (const requiredMetricToken of [
  "obstacleRenderMs",
  "obstacleRenderCellCount"
]) {
  assert(perfMetrics.includes(requiredMetricToken), `perf metrics missing obstacle render metric: ${requiredMetricToken}`);
  assert(pixiRenderer.includes(requiredMetricToken), `pixiRenderer missing obstacle render metric: ${requiredMetricToken}`);
}

for (const requiredOverlayToken of [
  "obstacleRenderMs",
  "obstacleRenderCellCount",
  "obs render",
  "obs cells"
]) {
  assert(debugOverlay.includes(requiredOverlayToken), `debugOverlay missing obstacle render token: ${requiredOverlayToken}`);
}


for (const requiredWorldSlotTelemetryToken of [
  "reusableSlotCount",
  "spawnReusedSlotCount",
  "spawnAppendedSlotCount"
]) {
  assert(perfMetrics.includes(requiredWorldSlotTelemetryToken), "perf metrics missing world slot telemetry token: " + requiredWorldSlotTelemetryToken);
  assert(pixiRenderer.includes(requiredWorldSlotTelemetryToken), "pixiRenderer missing world slot telemetry token: " + requiredWorldSlotTelemetryToken);
  assert(debugOverlay.includes(requiredWorldSlotTelemetryToken), "debugOverlay missing world slot telemetry token: " + requiredWorldSlotTelemetryToken);
}

for (const requiredWorldSlotOverlayLabel of ["free slots", "spawn reused", "spawn append"]) {
  assert(debugOverlay.includes(requiredWorldSlotOverlayLabel), "debugOverlay missing world slot overlay label: " + requiredWorldSlotOverlayLabel);
}

console.log("demo integration tests passed");

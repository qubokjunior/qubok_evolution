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
const debugOverlay = readText("src/render/debugOverlay.ts");
const pixiRenderer = readText("src/render/pixiRenderer.ts");
const sensors = readText("src/sim/sensors.ts");

assert(packageJson.version === "0.1.0-milestone.17", "package.json version must be 0.1.0-milestone.17.");
assert(appVersion.includes('PROJECT_VERSION = "0.1.0-milestone.17"'), "appVersion must expose milestone.17.");
assert(appVersion.includes('PROJECT_MILESTONE_LABEL = "m17"'), "appVersion must expose m17 overlay label.");

assert(!debugOverlay.includes('badge.textContent = "m10"'), "debug overlay must not hardcode m10.");
assert(!debugOverlay.includes('badge.textContent = "m16"'), "debug overlay must not hardcode m16.");
assert(debugOverlay.includes("../shared/appVersion"), "debug overlay must read milestone label from shared/appVersion.");

for (const forbiddenImport of ["../render/", "./render/", "../ui/", "./ui/", "pixi.js", "react"]) {
  assert(!demoSimulation.includes(forbiddenImport), `demoSimulation must not import forbidden boundary token: ${forbiddenImport}`);
}

for (const requiredDemoToken of [
  "applyAgentSensors",
  "applyPredatorPreyInteraction",
  "applyReproduction",
  "sensorStats",
  "predatorPreyStats",
  "reproductionStats",
  "sensorMs",
  "predatorPreyMs",
  "reproductionMs",
  "resources",
  "resourceBuildStats"
]) {
  assert(demoSimulation.includes(requiredDemoToken), `demoSimulation is missing live integration token: ${requiredDemoToken}`);
}

for (const requiredSensorToken of [
  "sectorFood",
  "sectorObstacle",
  "foodSignalSum",
  "obstacleSignalSum",
  "includeFood",
  "includeObstacles",
  "foodSectorWrites",
  "obstacleSectorWrites"
]) {
  assert(sensors.includes(requiredSensorToken), `sensors m17 contract is missing token: ${requiredSensorToken}`);
}

for (const requiredOverlayToken of [
  "sensorVisibleNeighbors",
  "sensorSectorWrites",
  "sensorFoodSectorWrites",
  "sensorObstacleSectorWrites",
  "sensorFoodSignalSum",
  "sensorObstacleSignalSum",
  "attacksThisStep",
  "killsThisStep",
  "birthsThisStep",
  "mutationChangedCount"
]) {
  assert(pixiRenderer.includes(requiredOverlayToken), `pixiRenderer is missing overlay metric token: ${requiredOverlayToken}`);
  assert(debugOverlay.includes(requiredOverlayToken), `debugOverlay is missing overlay row token: ${requiredOverlayToken}`);
}

console.log("demo integration tests passed");
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
const spawnValidation = readText("src/sim/spawnValidation.ts");

assert(packageJson.version === "0.1.0-milestone.22", "package.json version must be 0.1.0-milestone.22.");
assert(appVersion.includes('PROJECT_VERSION = "0.1.0-milestone.22"'), "appVersion must expose milestone.22.");
assert(appVersion.includes('PROJECT_MILESTONE_LABEL = "m22"'), "appVersion must expose m22 overlay label.");

for (const forbiddenImport of ["../render/", "./render/", "../ui/", "./ui/", "pixi.js", "react"]) {
  assert(!demoSimulation.includes(forbiddenImport), `demoSimulation must not import forbidden boundary token: ${forbiddenImport}`);
}

for (const requiredDemoToken of [
  "spawnRandomAgentsAvoidingObstacles",
  "spawnRandomResourcesAvoidingObstacles",
  "respawnResourcesToTargetAvoidingObstacles",
  "initialAgentSpawnStats",
  "initialResourceSpawnStats",
  "resourceRespawnStats",
  "spawnMaxAttempts",
  "spawnClearanceRadius"
]) {
  assert(demoSimulation.includes(requiredDemoToken), `demoSimulation is missing obstacle-aware spawn token: ${requiredDemoToken}`);
}

for (const requiredSpawnToken of [
  "SPAWN_VALIDATION_VERSION",
  "isPositionBlockedByObstacleMask",
  "findFreeRandomPosition",
  "findFreePositionNearOrRandom",
  "spawnRandomAgentsAvoidingObstacles",
  "spawnRandomResourcesAvoidingObstacles",
  "respawnResourcesToTargetAvoidingObstacles"
]) {
  assert(spawnValidation.includes(requiredSpawnToken), `spawn validation module is missing token: ${requiredSpawnToken}`);
}

console.log("demo integration tests passed");

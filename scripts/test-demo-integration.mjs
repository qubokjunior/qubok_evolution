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
const reproduction = readText("src/sim/reproduction.ts");

assert(packageJson.version === "0.1.0-milestone.23", "package.json version must be 0.1.0-milestone.23.");
assert(appVersion.includes('PROJECT_VERSION = "0.1.0-milestone.23"'), "appVersion must expose milestone.23.");
assert(appVersion.includes('PROJECT_MILESTONE_LABEL = "m23"'), "appVersion must expose m23 overlay label.");

for (const forbiddenImport of ["../render/", "./render/", "../ui/", "./ui/", "pixi.js", "react"]) {
  assert(!demoSimulation.includes(forbiddenImport), `demoSimulation must not import forbidden boundary token: ${forbiddenImport}`);
}

for (const requiredDemoToken of [
  "applyReproduction",
  "obstacleMask",
  "offspringSpawnMaxAttempts",
  "offspringClearanceRadius",
  "spawnMaxAttempts",
  "spawnClearanceRadius"
]) {
  assert(demoSimulation.includes(requiredDemoToken), `demoSimulation is missing reproduction obstacle spawn token: ${requiredDemoToken}`);
}

for (const requiredReproductionToken of [
  "REPRODUCTION_SYSTEM_VERSION = \"qubok_evolve.reproduction.v3\"",
  "obstacleMask",
  "offspringSpawnMaxAttempts",
  "offspringClearanceRadius",
  "blockedByObstacle",
  "obstaclePlacementFailedCount",
  "findFreePositionNearOrRandom"
]) {
  assert(reproduction.includes(requiredReproductionToken), `reproduction module is missing m23 token: ${requiredReproductionToken}`);
}

console.log("demo integration tests passed");

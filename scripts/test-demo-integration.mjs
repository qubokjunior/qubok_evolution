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
const obstacleResponse = readText("src/sim/obstacleResponse.ts");

assert(packageJson.version === "0.1.0-milestone.20", "package.json version must be 0.1.0-milestone.20.");
assert(appVersion.includes('PROJECT_VERSION = "0.1.0-milestone.20"'), "appVersion must expose milestone.20.");
assert(appVersion.includes('PROJECT_MILESTONE_LABEL = "m20"'), "appVersion must expose m20 overlay label.");

assert(!debugOverlay.includes('badge.textContent = "m19"'), "debug overlay must not hardcode m19.");
assert(debugOverlay.includes("../shared/appVersion"), "debug overlay must read milestone label from shared/appVersion.");

for (const forbiddenImport of ["../render/", "./render/", "../ui/", "./ui/", "pixi.js", "react"]) {
  assert(!demoSimulation.includes(forbiddenImport), `demoSimulation must not import forbidden boundary token: ${forbiddenImport}`);
}

for (const requiredDemoToken of [
  "applyObstacleSoftResponse",
  "obstacleResponseStats",
  "obstacleResponseMs",
  "obstacleResponseRadius",
  "obstacleResponseForceScale",
  "obstacleResponseMaxForce"
]) {
  assert(demoSimulation.includes(requiredDemoToken), `demoSimulation is missing obstacle response token: ${requiredDemoToken}`);
}

for (const requiredResponseToken of [
  "OBSTACLE_RESPONSE_VERSION",
  "applyObstacleSoftResponse",
  "responseRadius",
  "forceScale",
  "maxForcePerAgent",
  "forceAppliedCount"
]) {
  assert(obstacleResponse.includes(requiredResponseToken), `obstacle response module is missing token: ${requiredResponseToken}`);
}

for (const requiredOverlayToken of [
  "obstacleResponseMs",
  "obstacleResponseForces",
  "obstacleResponseHits",
  "obstacleResponseBoundaryHits"
]) {
  assert(pixiRenderer.includes(requiredOverlayToken), `pixiRenderer is missing overlay metric token: ${requiredOverlayToken}`);
  assert(debugOverlay.includes(requiredOverlayToken), `debugOverlay is missing overlay row token: ${requiredOverlayToken}`);
}

console.log("demo integration tests passed");

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = (relativePath) => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const perfMetrics = readText("src/shared/perfMetrics.ts");
const debugOverlay = readText("src/render/debugOverlay.ts");
const pixiRenderer = readText("src/render/pixiRenderer.ts");
const demoSimulation = readText("src/sim/demoSimulation.ts");
const actuatorTokens = ["controllerActuatorMs", "controllerActuatorEnabled", "controllerActuatorAgentCount", "controllerActuatorSampleCount", "controllerActuatorAffectedAgentCount", "controllerActuatorIgnoredDeadCount", "controllerActuatorZeroIntentCount", "controllerActuatorClampCount", "controllerActuatorForceMagnitudeTotal", "controllerActuatorMaxForceMagnitude", "controllerActuatorIntentMagnitudeTotal"];

assert(packageJson.scripts["test:controller-overlay-qa"] === "node scripts/test-controller-overlay-qa.mjs", "package.json must expose test:controller-overlay-qa.");
assert(packageJson.scripts.test.includes("test:controller-overlay-qa"), "npm run test must include test:controller-overlay-qa.");

for (const token of [
  "controllerMs",
  "controllerEnabled",
  "controllerAgentCount",
  "controllerSampleCount",
  "controllerAffectedAgentCount",
  "controllerIgnoredDeadCount",
  "controllerZeroIntentCount",
  "controllerClampCount",
  "controllerIntentMagnitudeTotal",
  "controllerMaxIntentMagnitude"
]) {
  assert(perfMetrics.includes(token), "perfMetrics missing controller token: " + token);
  assert(pixiRenderer.includes(token), "pixiRenderer missing controller token: " + token);
}

for (const token of actuatorTokens) {
  assert(perfMetrics.includes(token), "perfMetrics missing controller actuator token: " + token);
  assert(pixiRenderer.includes(token), "pixiRenderer missing controller actuator token: " + token);
  assert(debugOverlay.includes(token), "debugOverlay missing controller actuator overlay token: " + token);
}

for (const token of [
  'controller: "controller"',
  'controllerMs: "controller"',
  'controllerSampleCount: "controller"',
  'controllerAffectedAgentCount: "controller"',
  'controllerIntentMagnitudeTotal: "controller"',
  'controllerMs: "controller"',
  'controllerSampleCount: "ctrl samples"',
  'controllerAffectedAgentCount: "ctrl affected"',
  'controllerIntentMagnitudeTotal: "ctrl intent mag"'
]) {
  assert(debugOverlay.includes(token), "debugOverlay missing controller overlay token: " + token);
}

assert(demoSimulation.includes("controllerStats") && demoSimulation.includes("controllerMs"), "demoSimulation must expose controller step result metrics.");
assert(pixiRenderer.includes("frame.controllerStats") && pixiRenderer.includes("frame.controllerConfig.enableController ? 1 : 0"), "pixiRenderer must record controller stats/readouts.");
assert(pixiRenderer.includes("frame.controllerActuatorStats") && pixiRenderer.includes("frame.controllerActuatorConfig.enableControllerMovementInfluence ? 1 : 0"), "pixiRenderer must record controller actuator stats/readouts.");
assert(!demoSimulation.includes("addForce(world, index, controllerOutput"), "A4 must not wire controller output into movement forces.");
assert(!pixiRenderer.includes("updateControllerConfig("), "A4 must not add controller UI controls or persistence.");

console.log("controller overlay QA tests passed");

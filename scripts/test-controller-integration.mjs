import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = (relativePath) => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const demoSimulation = readText("src/sim/demoSimulation.ts");
const controller = readText("src/sim/controller.ts");

assert(packageJson.scripts["test:controller-integration"] === "node scripts/test-controller-integration.mjs", "package.json must expose test:controller-integration.");
assert(packageJson.scripts.test.includes("test:controller-integration"), "npm run test must include test:controller-integration.");

for (const token of [
  "createAgentControllerOutput",
  "stepAgentController",
  "AgentControllerStepMetrics",
  "DemoSimulationControllerConfig",
  "DemoSimulationControllerConfigPatch",
  "enableController?: boolean",
  "DEFAULT_ENABLE_CONTROLLER = false",
  "controllerOutput",
  "controllerStats",
  "controllerConfig: getControllerConfig()",
  "controllerMs",
  "getControllerConfig",
  "updateControllerConfig",
  "enabled: enableController",
  "maxIntentPerAgent: controllerMaxIntentPerAgent"
]) {
  assert(demoSimulation.includes(token), "demoSimulation missing controller integration token: " + token);
}

const sensorIndex = demoSimulation.indexOf("const sensorStats = applyAgentSensors");
const controllerIndex = demoSimulation.indexOf("const controllerStats = stepAgentController");
const predatorPreyIndex = demoSimulation.indexOf("const predatorPreyStats = applyPredatorPreyInteraction");
assert(sensorIndex >= 0 && controllerIndex > sensorIndex && predatorPreyIndex > controllerIndex, "controller must run after sensors and before predator/prey in A3 demo wiring.");

assert(demoSimulation.includes("DEFAULT_ENABLE_CONTROLLER = false"), "controller must remain disabled by default.");
assert(!demoSimulation.includes("addForce(world, index, controllerOutput"), "A3 must not wire controller output into movement forces.");
assert(!demoSimulation.includes("stepMovement(world, controllerOutput"), "A3 must not pass controller output into movement.");

for (const token of [
  "CONTROLLER_VERSION",
  "DEFAULT_AGENT_CONTROLLER_CONFIG",
  "enabled: false",
  "stepAgentController",
  "makeAgentControllerConfig",
  "AgentControllerStepMetrics"
]) {
  assert(controller.includes(token), "controller core missing token: " + token);
}

console.log("controller integration tests passed");

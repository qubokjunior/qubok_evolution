import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = (relativePath) => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const demoSimulation = readText("src/sim/demoSimulation.ts");
const fieldForce = readText("src/sim/fieldForce.ts");

assert(packageJson.scripts["test:field-force-integration"] === "node scripts/test-field-force-integration.mjs", "package.json must expose test:field-force-integration.");
assert(packageJson.scripts.test.includes("test:field-force-integration"), "npm run test must include test:field-force-integration.");

for (const requiredToken of [
  "applyFieldForces",
  "FieldForceStepMetrics",
  "DemoSimulationFieldForceConfig",
  "DemoSimulationFieldForceConfigPatch",
  "enableFieldForce?: boolean",
  "DEFAULT_ENABLE_FIELD_FORCE = false",
  "fieldForceStats",
  "fieldForceConfig: getFieldForceConfig()",
  "fieldForceMs",
  "getFieldForceConfig",
  "updateFieldForceConfig",
  "enabled: enableFieldForce",
  "maxForcePerAgent: fieldForceMaxForcePerAgent"
]) {
  assert(demoSimulation.includes(requiredToken), "demoSimulation missing field-force integration token: " + requiredToken);
}

const dynamicsIndex = demoSimulation.indexOf("const fieldDynamicsStats = stepEnvironmentalFieldDynamics");
const forceIndex = demoSimulation.indexOf("const fieldForceStats = applyFieldForces");
const movementIndex = demoSimulation.indexOf("const movementMetrics = stepMovement");
assert(dynamicsIndex >= 0 && forceIndex > dynamicsIndex && movementIndex > forceIndex, "field force must run after field dynamics and before movement.");

for (const requiredToken of [
  "FIELD_FORCE_VERSION",
  "DEFAULT_FIELD_FORCE_CONFIG",
  "enabled: false",
  "applyFieldForces",
  "makeFieldForceConfig",
  "FieldForceStepMetrics"
]) {
  assert(fieldForce.includes(requiredToken), "fieldForce core missing token: " + requiredToken);
}

console.log("field force integration tests passed");

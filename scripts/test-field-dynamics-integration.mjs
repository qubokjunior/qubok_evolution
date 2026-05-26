import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = (relativePath) => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const fieldDynamics = readText("src/sim/fieldDynamics.ts");
const demoSimulation = readText("src/sim/demoSimulation.ts");
const pixiRenderer = readText("src/render/pixiRenderer.ts");
const debugOverlay = readText("src/render/debugOverlay.ts");
const perfMetrics = readText("src/shared/perfMetrics.ts");
const integrationM42 = readText("docs/integration_m42.md");

for (const requiredToken of [
  "FIELD_DYNAMICS_VERSION",
  "DEFAULT_FIELD_DYNAMICS_CONFIG",
  "makeFieldDynamicsConfig",
  "createFieldDynamicsScratch",
  "stepEnvironmentalFieldDynamics",
  "diffusionTransferCount",
  "decayMagnitudeLoss",
  "totalMagnitudeAfter"
]) {
  assert(fieldDynamics.includes(requiredToken), "field dynamics module missing token: " + requiredToken);
}

for (const requiredToken of [
  "createFieldDynamicsScratch",
  "stepEnvironmentalFieldDynamics",
  "FieldDynamicsStepMetrics",
  "fieldDecayPerSecond",
  "fieldDiffusionRatePerSecond",
  "fieldDynamicsMinActiveMagnitude",
  "DEFAULT_FIELD_DECAY_PER_SECOND",
  "DEFAULT_FIELD_DIFFUSION_RATE_PER_SECOND",
  "fieldDynamicsScratch",
  "fieldDynamicsStats",
  "fieldDynamicsMs"
]) {
  assert(demoSimulation.includes(requiredToken), "demo simulation missing field dynamics token: " + requiredToken);
}

for (const requiredToken of [
  "FieldDynamicsStepMetrics",
  "fieldDynamicsStats: FieldDynamicsStepMetrics",
  "fieldDynamicsMs: number",
  "metrics.record(\"fieldDynamicsMs\"",
  "metrics.record(\"fieldDynamicsActiveCellCount\"",
  "metrics.record(\"fieldDynamicsUpdatedCellCount\"",
  "metrics.record(\"fieldDynamicsTransferCount\"",
  "metrics.record(\"fieldDynamicsMagnitudeLoss\"",
  "metrics.record(\"fieldDynamicsMagnitudeAfter\"",
  "fieldDynamicsMs: snapshot.values.fieldDynamicsMs",
  "fieldDynamicsMagnitudeAfter: snapshot.values.fieldDynamicsMagnitudeAfter"
]) {
  assert(pixiRenderer.includes(requiredToken), "pixi renderer missing field dynamics metric token: " + requiredToken);
}

for (const requiredToken of [
  "fieldDynamicsMs",
  "fieldDynamicsActiveCellCount",
  "fieldDynamicsUpdatedCellCount",
  "fieldDynamicsTransferCount",
  "fieldDynamicsMagnitudeLoss",
  "fieldDynamicsMagnitudeAfter"
]) {
  assert(perfMetrics.includes(requiredToken), "perf metrics missing field dynamics metric: " + requiredToken);
  assert(debugOverlay.includes(requiredToken), "debug overlay missing field dynamics metric: " + requiredToken);
}

for (const requiredLabel of [
  "field dyn",
  "field active cells",
  "field update cells",
  "field transfers",
  "field mag loss",
  "field mag after"
]) {
  assert(debugOverlay.includes(requiredLabel), "debug overlay missing field dynamics label: " + requiredLabel);
}

assert(integrationM42.includes("decay") && integrationM42.includes("diffusion"), "integration_m42 must describe decay and diffusion.");
assert(packageJson.scripts["test:field-dynamics"] === "node scripts/test-field-dynamics.mjs", "package.json must expose test:field-dynamics.");
assert(packageJson.scripts["bench:field-dynamics"] === "node scripts/bench-field-dynamics.mjs", "package.json must expose bench:field-dynamics.");
assert(packageJson.scripts.test.includes("test:field-dynamics"), "npm run test must include test:field-dynamics.");

console.log("field dynamics integration tests passed");

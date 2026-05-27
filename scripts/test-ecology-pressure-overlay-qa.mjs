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
const integrationM50 = readText("docs/integration_m50.md");

const ecologyTokens = [
  "ecologyPressurePresetId",
  "ecologyPressureResourceTargetCount",
  "ecologyPressureResourceAliveCount",
  "ecologyPressureResourceRespawnedCount",
  "ecologyPressureFoodPickupCount",
  "ecologyPressureFoodEnergyTransferred",
  "ecologyPressureAverageEnergy01",
  "ecologyPressureMinimumEnergy01",
  "ecologyPressureMaximumEnergy01",
  "ecologyPressureStarvingCount",
  "ecologyPressureStarvationDamage",
  "ecologyPressureDeathsThisStep",
  "ecologyPressureBirthsThisStep",
  "ecologyPressureBlockedBirthsByCapacity",
  "ecologyPressurePredatorAttacksThisStep",
  "ecologyPressurePredatorKillsThisStep",
  "ecologyPressureAliveCount",
  "ecologyPressureCapacityCount",
  "ecologyPressureReusableSlotCount",
  "ecologyPressurePopulationPressure01"
];

assert(packageJson.scripts["test:ecology-pressure-overlay-qa"] === "node scripts/test-ecology-pressure-overlay-qa.mjs", "package.json must expose test:ecology-pressure-overlay-qa.");
assert(packageJson.scripts.test.includes("test:ecology-pressure-overlay-qa"), "npm run test must include test:ecology-pressure-overlay-qa.");

for (const token of ecologyTokens) {
  assert(perfMetrics.includes(token), "perfMetrics missing ecology pressure token: " + token);
  assert(pixiRenderer.includes(token), "pixiRenderer missing ecology pressure token: " + token);
  assert(debugOverlay.includes(token), "debugOverlay missing ecology pressure overlay token: " + token);
}

for (const token of [
  'ecology: "ecology"',
  'ecologyPressurePresetId: "ecology"',
  'ecologyPressureAverageEnergy01: "ecology"',
  'ecologyPressurePopulationPressure01: "ecology"',
  'ecologyPressureBirthsThisStep: "ec births"',
  'ecologyPressureBlockedBirthsByCapacity: "ec blocked births"',
  'ecologyPressurePredatorKillsThisStep: "ec kills"'
]) assert(debugOverlay.includes(token), "debugOverlay missing ecology group/label token: " + token);

assert(demoSimulation.includes("ecologyPressureReadout") && demoSimulation.includes("makeEcologyPressureReadout"), "demoSimulation must expose ecology pressure readout.");
assert(pixiRenderer.includes("frame.ecologyPressureReadout") && pixiRenderer.includes("ecologyPressurePresetId(frame.ecologyPressureReadout.ecologyPreset)"), "pixiRenderer must record ecology pressure readout.");
assert(!pixiRenderer.includes("updateEcologyPressureConfig("), "M50-A4 must not add ecology panel or persistence.");
assert(integrationM50.includes("M50-A4") && integrationM50.includes("overlay/readout QA"), "integration_m50 must retain M50-A4 scope.");
console.log("ecology pressure overlay QA tests passed");

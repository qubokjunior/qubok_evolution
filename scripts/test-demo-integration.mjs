import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { EXPECTED_PROJECT_MILESTONE, EXPECTED_PROJECT_MILESTONE_LABEL, EXPECTED_PROJECT_STATUS, EXPECTED_PROJECT_VERSION } from "./project-status.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = (relativePath) => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const appVersion = readText("src/shared/appVersion.ts");
const readme = readText("README.md");
const milestones = readText("docs/milestones.md");
const roadmap = readText("docs/roadmap.md");
const architectureTracks = readText("docs/architecture_tracks.md");
const integrationM49 = readText("docs/integration_m49.md");
const integrationM50 = readText("docs/integration_m50.md");

const app = readText("src/ui/App.ts");
const demoSimulation = readText("src/sim/demoSimulation.ts");
const ecologyPressure = readText("src/sim/ecologyPressure.ts");
const pixiRenderer = readText("src/render/pixiRenderer.ts");
const debugOverlay = readText("src/render/debugOverlay.ts");
const perfMetrics = readText("src/shared/perfMetrics.ts");
const energy = readText("src/sim/energy.ts");
const predatorPrey = readText("src/sim/predatorPrey.ts");

assert(packageJson.version === EXPECTED_PROJECT_VERSION, `package.json version must be ${EXPECTED_PROJECT_VERSION}.`);
assert(appVersion.includes(`PROJECT_VERSION = "${EXPECTED_PROJECT_VERSION}"`), "appVersion must expose expected project version.");
assert(appVersion.includes(`PROJECT_MILESTONE = ${EXPECTED_PROJECT_MILESTONE}`), "appVersion must expose expected milestone number.");
assert(appVersion.includes(`PROJECT_MILESTONE_LABEL = "${EXPECTED_PROJECT_MILESTONE_LABEL}"`), "appVersion must expose expected milestone label.");
assert(readme.includes(EXPECTED_PROJECT_STATUS), "README must expose expected project status.");
assert(milestones.includes("| m49 |") && milestones.includes("| m50 |"), "milestones must include m49 and m50.");
assert(roadmap.includes("m49 shipped: controller actuator bridge"), "roadmap must preserve m49 shipped state.");
assert(roadmap.includes("### M50: ecology pressure calibration"), "roadmap must expose M50 ecology pressure calibration.");
assert(architectureTracks.includes("renderer must not own authoritative simulation state"), "architecture tracks must preserve sim/render boundary.");
assert(integrationM49.includes("M49 is closed"), "integration_m49 must remain closed.");
assert(integrationM50.includes("M50-A3b") && integrationM50.includes("M50-A4"), "integration_m50 must describe M50-A3b/A4 scope.");

for (const [scriptName, command] of [
  ["test:repo-status", "node scripts/test-repo-status.mjs"],
  ["test:roadmap-status", "node scripts/test-roadmap-status.mjs"],
  ["test:demo-integration", "node scripts/test-demo-integration.mjs"],
  ["test:ecology-pressure", "node scripts/test-ecology-pressure.mjs"],
  ["test:ecology-pressure-overlay-qa", "node scripts/test-ecology-pressure-overlay-qa.mjs"],
  ["test:controller-actuator", "node scripts/test-controller-actuator.mjs"],
  ["test:controller-integration", "node scripts/test-controller-integration.mjs"]
]) {
  assert(packageJson.scripts[scriptName] === command, `package.json must expose ${scriptName}.`);
  assert(packageJson.scripts.test.includes(scriptName), `npm run test must include ${scriptName}.`);
}

for (const requiredToken of [
  "loadStoredRenderDebugConfig",
  "saveRenderDebugConfig",
  "mountPixiRenderer",
  "createPerfOverlay",
  "createDemoSimulation"
]) assert(app.includes(requiredToken), "App bridge missing token: " + requiredToken);

for (const forbiddenImport of ["pixi.js", "../sim/world", "../sim/movement", "../sim/sensors"]) {
  assert(!app.includes(forbiddenImport), `App must not import low-level runtime/render internals directly: ${forbiddenImport}`);
}

for (const requiredToken of [
  "DEMO_SIMULATION_VERSION",
  "createDemoSimulation",
  "terrainRenderSnapshot",
  "fieldRenderSnapshot",
  "fieldSourceStats",
  "fieldDampingStats",
  "fieldAdvectionStats",
  "fieldForceStats",
  "controllerStats",
  "controllerActuatorStats",
  "controllerOutput",
  "makeEcologyPressureConfig",
  "makeEcologyPressureReadout",
  "ecologyPressureConfig",
  "ecologyPressureReadout",
  "getEcologyPressureConfig",
  "updateEcologyPressureConfig"
]) assert(demoSimulation.includes(requiredToken), "demoSimulation missing token: " + requiredToken);

for (const forbiddenImport of ["../render/", "./render/", "../ui/", "./ui/", "pixi.js", "react"]) {
  assert(!demoSimulation.includes(forbiddenImport), `demoSimulation must not import forbidden boundary token: ${forbiddenImport}`);
}

for (const requiredToken of [
  "ECOLOGY_PRESSURE_VERSION",
  "ECOLOGY_PRESSURE_PRESET_CONFIGS",
  "makeEcologyPressureConfig",
  "makeEcologyPressureReadout",
  "neutral_lab",
  "scarce_food",
  "predator_pressure",
  "terrain_habitat",
  "field_current_stress"
]) assert(ecologyPressure.includes(requiredToken), "ecologyPressure missing token: " + requiredToken);

for (const requiredToken of [
  "frame.ecologyPressureReadout",
  "ecologyPressurePresetId(frame.ecologyPressureReadout.ecologyPreset)",
  "ecologyPressureResourceTargetCount",
  "ecologyPressureAverageEnergy01",
  "ecologyPressurePopulationPressure01",
  "controllerActuatorStats",
  "fieldForceStats"
]) assert(pixiRenderer.includes(requiredToken), "pixiRenderer missing token: " + requiredToken);

for (const requiredToken of [
  "ecologyPressurePresetId",
  "ecologyPressureResourceTargetCount",
  "ecologyPressureAverageEnergy01",
  "ecologyPressurePopulationPressure01",
  "controllerActuatorMs",
  "fieldForceMs"
]) assert(perfMetrics.includes(requiredToken), "perfMetrics missing token: " + requiredToken);

for (const requiredToken of [
  'ecology: "ecology"',
  'ecologyPressurePresetId: "ecology"',
  'ecologyPressurePopulationPressure01: "ecology"',
  'ecologyPressureBirthsThisStep: "ec births"',
  'ecologyPressureBlockedBirthsByCapacity: "ec blocked births"',
  'ecologyPressurePredatorKillsThisStep: "ec kills"',
  "ctrl act",
  "field force"
]) assert(debugOverlay.includes(requiredToken), "debugOverlay missing token: " + requiredToken);

assert(energy.includes("killAgent(world, index)"), "energy deaths must use killAgent so dead slots enter the free-list.");
assert(predatorPrey.includes("killAgent(world, preyIndex)"), "predator/prey kills must use killAgent so dead slots enter the free-list.");
assert(!pixiRenderer.includes("updateEcologyPressureConfig("), "M50-A4 must not add ecology panel or persistence.");
assert(!demoSimulation.includes("addForce(world, index, controllerOutput"), "controller output must not be wired directly into movement forces.");

console.log("demo integration tests passed");
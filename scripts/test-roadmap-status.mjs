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
const roadmap = readText("docs/roadmap.md");
const milestones = readText("docs/milestones.md");
const architectureTracks = readText("docs/architecture_tracks.md");
const projectOverview = readText("docs/project_overview.md");
const integrationM40 = readText("docs/integration_m40.md");
const integrationM41 = readText("docs/integration_m41.md");
const integrationM42 = readText("docs/integration_m42.md");
const integrationM43 = readText("docs/integration_m43.md");
const integrationM44 = readText("docs/integration_m44.md");
const integrationM45 = readText("docs/integration_m45.md");
const integrationM47 = readText("docs/integration_m47.md");
const integrationM48 = readText("docs/integration_m48.md");
const field = readText("src/sim/field.ts");
const fieldRenderSnapshot = readText("src/sim/fieldRenderSnapshot.ts");
const fieldDynamics = readText("src/sim/fieldDynamics.ts");
const fieldSources = readText("src/sim/fieldSources.ts");
const movement = readText("src/sim/movement.ts");
const debugOverlay = readText("src/render/debugOverlay.ts");
const perfMetrics = readText("src/shared/perfMetrics.ts");
const pixiRenderer = readText("src/render/pixiRenderer.ts");
const demoSimulation = readText("src/sim/demoSimulation.ts");
const controller = readText("src/sim/controller.ts");

assert(packageJson.version === EXPECTED_PROJECT_VERSION, `package.json must expose ${EXPECTED_PROJECT_VERSION}.`);
assert(appVersion.includes(`PROJECT_VERSION = "${EXPECTED_PROJECT_VERSION}"`), `appVersion must expose ${EXPECTED_PROJECT_VERSION}.`);
assert(appVersion.includes(`PROJECT_MILESTONE = ${EXPECTED_PROJECT_MILESTONE}`), `appVersion must expose milestone number ${EXPECTED_PROJECT_MILESTONE}.`);
assert(appVersion.includes(`PROJECT_MILESTONE_LABEL = "${EXPECTED_PROJECT_MILESTONE_LABEL}"`), `appVersion must expose ${EXPECTED_PROJECT_MILESTONE_LABEL} label.`);
assert(readme.includes(EXPECTED_PROJECT_STATUS), `README.md must expose ${EXPECTED_PROJECT_STATUS}.`);
assert(readme.includes("docs/roadmap.md"), "README.md must link docs/roadmap.md.");
assert(readme.includes("docs/project_overview.md"), "README.md must link docs/project_overview.md.");
assert(architectureTracks.includes("renderer must not own authoritative simulation state"), "architecture tracks must preserve sim/render boundary.");

for (const requiredToken of [
  "m39 shipped: low-resolution environmental flow field sampled by movement",
  "m40 shipped: environmental field render snapshot and Pixi vector debug layer",
  "m41 shipped: render debug controls",
  "m43 shipped: field sources/sinks foundation",
  "m47 shipped: field-force separation",
  "m48 shipped: controller/brain first pass",
  "M48 closed state",
  "### M49: controller actuator bridge",
  "### M57: performance architecture split"
]) {
  assert(roadmap.includes(requiredToken), "roadmap missing token: " + requiredToken);
}
assert(!roadmap.includes("pending final close"), "roadmap must not leave M48 in pending-final-close state.");
assert(!roadmap.includes("### M48-final"), "roadmap must remove M48-final as a future milestone after close.");

assert(roadmap.includes("m49 planning: controller actuator bridge"), "roadmap must point current milestone to M49 planning.");
assert(milestones.includes("| m47 | Field-force separation and explicit agent response to environmental fields, with core API, tests, benchmark, demo wiring, overlay/readouts, controls, and persistence. | complete |"), "milestones must list m47 as complete.");
assert(milestones.includes("| m48 | Controller/brain first pass:"), "milestones must list M48 controller first pass.");
assert(milestones.includes("Controller intent is not yet actuated into movement. | complete |"), "milestones must close M48 as complete while preserving actuator limit.");

for (const requiredToken of [
  "qubok_evolve project overview",
  "src/sim",
  "src/render",
  "src/ui",
  "src/shared",
  "typed arrays",
  "debug/performance overlay",
  "Current limitations and known technical debt",
  "Controller intent is not yet connected to movement",
  "M49",
  "M50",
  "M51",
  "M52",
  "M53",
  "M54",
  "M55",
  "M56",
  "M57"
]) {
  assert(projectOverview.includes(requiredToken), "project_overview.md missing token: " + requiredToken);
}
assert(!projectOverview.includes("M48 docs/status are partially implemented"), "project_overview.md must not describe M48 as partially implemented after close.");
assert(projectOverview.includes("M48 is closed"), "project_overview.md must document M48 as closed.");

assert(field.includes("FIELD_LAYER_VERSION") && field.includes("sampleFieldAtPosition"), "field must expose field layer and sampling API.");
assert(fieldRenderSnapshot.includes("FIELD_RENDER_SNAPSHOT_VERSION") && fieldRenderSnapshot.includes("makeFieldRenderSnapshot"), "field render snapshot must expose version and builder.");
assert(fieldDynamics.includes("FIELD_DYNAMICS_VERSION") && fieldDynamics.includes("stepEnvironmentalFieldDynamics"), "field dynamics must expose deterministic step API.");
assert(movement.includes("field?: EnvironmentalFieldLayer") && movement.includes("fieldMovementSampleCount"), "movement must preserve field sampling integration.");
assert(debugOverlay.includes("field force"), "debug overlay must expose field force labels.");
assert(perfMetrics.includes("fieldForceMs"), "perf metrics must expose field force metrics.");
assert(pixiRenderer.includes("fieldForceMagnitudeTotal"), "pixiRenderer must expose field force overlay readouts.");
assert(demoSimulation.includes("fieldForceStats") && demoSimulation.includes("updateFieldForceConfig"), "demoSimulation must expose m47 field force wiring and config.");
assert(controller.includes("CONTROLLER_VERSION") && controller.includes("stepAgentController"), "controller must expose M48 controller API.");
assert(demoSimulation.includes("DEFAULT_ENABLE_CONTROLLER = false"), "controller must remain disabled by default.");
assert(!demoSimulation.includes("addForce(world, index, controllerOutput"), "M48 must not wire controller output into movement forces.");
assert(!demoSimulation.includes("stepMovement(world, controllerOutput"), "M48 must not pass controller output into movement.");

assert(integrationM40.includes("environmental field render snapshot"), "integration_m40 must describe environmental field render snapshot.");
assert(integrationM41.includes("overlay grouping"), "integration_m41 must describe overlay grouping.");
assert(integrationM42.includes("decay") && integrationM42.includes("diffusion"), "integration_m42 must describe field decay/diffusion.");
assert(integrationM43.includes("field sources") && integrationM43.includes("sinks"), "integration_m43 must describe field sources/sinks.");
assert(integrationM44.includes("field source semantics tuning") && integrationM44.includes("visualization QA"), "integration_m44 must describe field source semantics tuning and visualization QA.");
assert(integrationM45.includes("## Final status") && integrationM45.includes("M45 is closed"), "integration_m45 must document final closed status.");
assert(integrationM47.includes("M47 is closed") && integrationM47.includes("Final validation set"), "integration_m47 must document m47 closed status and validation set.");
assert(integrationM47.includes("controller/brain logic") && integrationM47.includes("WebGPU compute"), "integration_m47 must document out-of-scope items.");
assert(integrationM48.includes("M48 is closed") && integrationM48.includes("Final validation set"), "integration_m48 must document M48 closed status and validation set.");
assert(integrationM48.includes("does not actuate controller intent into movement"), "integration_m48 must preserve actuator limit.");
assert(packageJson.scripts.test.includes("test:roadmap-status"), "npm run test must include test:roadmap-status.");

for (const requiredToken of ["FIELD_SOURCES_VERSION", "applyFieldSourcesAndSinks", "FieldSourceStepMetrics", "measureTotalFieldMagnitude"]) assert(fieldSources.includes(requiredToken), "fieldSources missing token: " + requiredToken);
for (const requiredToken of ["applyFieldDamping", "fieldDampingStats", "fieldDampingMs", "enableObstacleFieldDamping", "enableTerrainFieldDamping"]) assert(demoSimulation.includes(requiredToken), "demoSimulation missing m45 damping wiring token: " + requiredToken);
for (const requiredToken of ["fieldDampingMs", "fieldDampingObstacleSampleCount", "fieldDampingTerrainSampleCount", "fieldDampingMagnitudeDamped"]) assert(perfMetrics.includes(requiredToken), "perf metrics missing m45 damping token: " + requiredToken);
for (const requiredToken of ["field damp", "field damp obst samples", "field damp terrain samples", "field damp mag"]) assert(debugOverlay.includes(requiredToken), "debugOverlay missing m45 damping label: " + requiredToken);
for (const requiredToken of ["FieldDampingStepMetrics", "fieldDampingStats", "fieldDampingMs"]) assert(pixiRenderer.includes(requiredToken), "pixiRenderer missing m45 damping token: " + requiredToken);

assert(perfMetrics.includes("fieldRenderVectorCount"), "perf metrics must preserve field render vector count assertion.");
console.log("roadmap status tests passed");

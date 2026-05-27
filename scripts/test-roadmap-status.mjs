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
const integrationM49 = readText("docs/integration_m49.md");
const integrationM50 = readText("docs/integration_m50.md");
const movement = readText("src/sim/movement.ts");
const debugOverlay = readText("src/render/debugOverlay.ts");
const perfMetrics = readText("src/shared/perfMetrics.ts");
const pixiRenderer = readText("src/render/pixiRenderer.ts");
const demoSimulation = readText("src/sim/demoSimulation.ts");
const controller = readText("src/sim/controller.ts");
const controllerActuator = readText("src/sim/controllerActuator.ts");

assert(packageJson.version === EXPECTED_PROJECT_VERSION, `package.json must expose ${EXPECTED_PROJECT_VERSION}.`);
assert(appVersion.includes(`PROJECT_VERSION = "${EXPECTED_PROJECT_VERSION}"`), `appVersion must expose ${EXPECTED_PROJECT_VERSION}.`);
assert(appVersion.includes(`PROJECT_MILESTONE = ${EXPECTED_PROJECT_MILESTONE}`), `appVersion must expose milestone number ${EXPECTED_PROJECT_MILESTONE}.`);
assert(appVersion.includes(`PROJECT_MILESTONE_LABEL = "${EXPECTED_PROJECT_MILESTONE_LABEL}"`), `appVersion must expose ${EXPECTED_PROJECT_MILESTONE_LABEL} label.`);
assert(readme.includes(EXPECTED_PROJECT_STATUS), `README.md must expose ${EXPECTED_PROJECT_STATUS}.`);
assert(readme.includes("M50 planning is open"), "README.md must expose M50 planning status.");
assert(readme.includes("docs/roadmap.md"), "README.md must link docs/roadmap.md.");
assert(readme.includes("docs/project_overview.md"), "README.md must link docs/project_overview.md.");
assert(readme.includes("docs/integration_m49.md"), "README.md must link docs/integration_m49.md.");
assert(readme.includes("docs/integration_m50.md"), "README.md must link docs/integration_m50.md.");
assert(architectureTracks.includes("renderer must not own authoritative simulation state"), "architecture tracks must preserve sim/render boundary.");

for (const requiredToken of [
  "m48 shipped: controller/brain first pass",
  "m49 shipped: controller actuator bridge",
  "M49 closed state",
  "### M50: ecology pressure calibration",
  "### M57: performance architecture split"
]) {
  assert(roadmap.includes(requiredToken), "roadmap missing token: " + requiredToken);
}
assert(!roadmap.includes("pending final close"), "roadmap must not leave a pending-final-close state.");
assert(!roadmap.includes("m49 planning"), "roadmap must not leave M49 as planning after close.");

assert(milestones.includes("| m49 | Controller actuator bridge:") && milestones.includes("| complete |"), "milestones must list M49 as complete.");
assert(milestones.includes("| m50 | Ecology pressure calibration planning:"), "milestones must list M50 planning.");
assert(milestones.includes("| planned |"), "milestones must keep M50 as planned.");

for (const requiredToken of [
  "qubok_evolve project overview",
  "src/sim",
  "src/render",
  "src/ui",
  "src/shared",
  "typed arrays",
  "Controller and actuator",
  "M49 closes the explicit controller actuator bridge",
  "Current limitations and known technical debt",
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
assert(projectOverview.includes("M49 is closed"), "project_overview.md must document M49 as closed.");

assert(movement.includes("field?: EnvironmentalFieldLayer") && movement.includes("fieldMovementSampleCount"), "movement must preserve field sampling integration.");
assert(debugOverlay.includes("controllerActuatorMs") && debugOverlay.includes("ctrl act"), "debug overlay must expose controller actuator labels.");
assert(perfMetrics.includes("controllerActuatorMs") && perfMetrics.includes("controllerActuatorForceMagnitudeTotal"), "perf metrics must expose controller actuator metrics.");
assert(pixiRenderer.includes("controllerActuatorStats") && pixiRenderer.includes("controllerActuatorConfig"), "pixiRenderer must expose controller actuator readouts.");
assert(demoSimulation.includes("applyControllerActuator") && demoSimulation.includes("updateControllerActuatorConfig"), "demoSimulation must expose M49 actuator wiring and config.");
assert(controller.includes("CONTROLLER_VERSION") && controller.includes("stepAgentController"), "controller must expose M48 controller API.");
assert(controllerActuator.includes("CONTROLLER_ACTUATOR_VERSION") && controllerActuator.includes("applyControllerActuator"), "controllerActuator must expose M49 actuator API.");
assert(demoSimulation.includes("DEFAULT_ENABLE_CONTROLLER = false"), "controller must remain disabled by default.");
assert(demoSimulation.includes("DEFAULT_ENABLE_CONTROLLER_MOVEMENT_INFLUENCE = false"), "actuator must remain disabled by default.");
assert(!demoSimulation.includes("addForce(world, index, controllerOutput"), "M49 must not wire controller output directly into movement forces.");
assert(!demoSimulation.includes("stepMovement(world, controllerOutput"), "M49 must not pass controller output into movement.");

assert(integrationM49.includes("M49 is closed") && integrationM49.includes("Final validation set"), "integration_m49 must document M49 closed status and validation set.");
assert(integrationM50.includes("Integration m50 - ecology pressure calibration"), "integration_m50 must define ecology pressure planning.");
assert(integrationM50.includes("M50-A0: integration scope document"), "integration_m50 must define M50-A0 docs/guard slice.");
assert(integrationM50.includes("no runtime behavior change"), "integration_m50 must preserve A0 as docs/guard only.");
assert(integrationM50.includes("M50 makes behavior matter"), "integration_m50 must define M50 goal.");
assert(packageJson.scripts.test.includes("test:roadmap-status"), "npm run test must include test:roadmap-status.");
assert(packageJson.scripts["bench:controller-actuator"] === "node scripts/bench-controller-actuator.mjs", "package.json must expose bench:controller-actuator.");

console.log("roadmap status tests passed");

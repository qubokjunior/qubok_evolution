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
const projectOverview = readText("docs/project_overview.md");
const integrationM49 = readText("docs/integration_m49.md");
const controller = readText("src/sim/controller.ts");
const controllerActuator = readText("src/sim/controllerActuator.ts");
const actuatorPersistence = readText("src/sim/controllerActuatorConfigPersistence.ts");
const demoSimulation = readText("src/sim/demoSimulation.ts");
const pixiRenderer = readText("src/render/pixiRenderer.ts");
const debugOverlay = readText("src/render/debugOverlay.ts");
const app = readText("src/ui/App.ts");
const actuatorPanel = readText("src/ui/controllerActuatorPanel.ts");

assert(packageJson.version === EXPECTED_PROJECT_VERSION, `package.json must expose ${EXPECTED_PROJECT_VERSION}.`);
assert(appVersion.includes(`PROJECT_VERSION = "${EXPECTED_PROJECT_VERSION}"`), `appVersion must expose ${EXPECTED_PROJECT_VERSION}.`);
assert(appVersion.includes(`PROJECT_MILESTONE = ${EXPECTED_PROJECT_MILESTONE}`), `appVersion must expose milestone number ${EXPECTED_PROJECT_MILESTONE}.`);
assert(appVersion.includes(`PROJECT_MILESTONE_LABEL = "${EXPECTED_PROJECT_MILESTONE_LABEL}"`), `appVersion must expose ${EXPECTED_PROJECT_MILESTONE_LABEL} label.`);
assert(readme.includes(EXPECTED_PROJECT_STATUS), `README.md must expose ${EXPECTED_PROJECT_STATUS}.`);
assert(readme.includes("controller actuator bridge shipped"), "README.md must expose M49 actuator bridge completion.");
assert(readme.includes("docs/project_overview.md"), "README.md must link docs/project_overview.md.");
assert(readme.includes("docs/integration_m49.md"), "README.md must link docs/integration_m49.md.");

for (const marker of ["| m32 |", "| m33 |", "| m34 |", "| m35 |", "| m36 |", "| m37 |", "| m38 |", "| m39 |", "| m40 |", "| m41 |", "| m42 |", "| m43 |", "| m44 |", "| m45 |", "| m46 |", "| m47 |", "| m48 |", "| m49 |"] ) {
  assert(milestones.includes(marker), "docs/milestones.md missing marker: " + marker);
}
assert(milestones.includes("| m49 | Controller actuator bridge:") && milestones.includes("| complete |"), "docs/milestones.md must close M49 as complete.");
assert(!milestones.includes("| m49 | Controller actuator bridge:") || milestones.includes("| m49 | Controller actuator bridge:") && milestones.includes("| m49 | Controller actuator bridge: explicit intent-to-force boundary"), "docs/milestones.md must keep M49 closed.");
assert(milestones.includes("| m50 | Ecology pressure calibration planning:") && milestones.includes("| planned |"), "docs/milestones.md must keep M50 as planned during M50 work.");

for (const token of [
  "realtime 2D artificial-life ecosystem simulator",
  "src/sim",
  "src/render",
  "src/ui",
  "src/shared",
  "typed arrays",
  "WorldState",
  "spatial hash",
  "resources",
  "energy survival",
  "reproduction",
  "mutation",
  "predator/prey",
  "sector sensors",
  "terrain/material",
  "obstacle mask",
  "field advection",
  "field-force",
  "Controller and actuator",
  "M49 closes the explicit controller actuator bridge",
  "0.1.0-milestone.49",
  "M50",
  "M57"
]) {
  assert(projectOverview.includes(token), "project_overview.md missing required source-material token: " + token);
}
assert(projectOverview.includes("M49 is closed"), "project_overview.md must document M49 as closed.");

assert(integrationM49.includes("M49 is closed") && integrationM49.includes("Final validation set"), "integration_m49 must document M49 closed status and validation set.");
assert(integrationM49.includes("DEFAULT_ENABLE_CONTROLLER_MOVEMENT_INFLUENCE = false"), "integration_m49 must preserve default-disabled actuator limit.");
assert(controller.includes("CONTROLLER_VERSION") && controller.includes("stepAgentController"), "controller must expose M48 core controller API.");
assert(controllerActuator.includes("CONTROLLER_ACTUATOR_VERSION") && controllerActuator.includes("applyControllerActuator"), "controllerActuator must expose M49 actuator API.");
assert(controllerActuator.includes("enableControllerMovementInfluence: false"), "controller actuator must remain disabled by default.");
assert(actuatorPersistence.includes("qubok_evolve.controller_actuator_config.v1"), "controller actuator persistence key must exist.");
assert(demoSimulation.includes("DEFAULT_ENABLE_CONTROLLER = false"), "controller must remain disabled by default.");
assert(demoSimulation.includes("DEFAULT_ENABLE_CONTROLLER_MOVEMENT_INFLUENCE = false"), "controller actuator must remain disabled by default.");
assert(demoSimulation.includes("applyControllerActuator"), "M49 must wire controller actuator into demoSimulation.");
assert(pixiRenderer.includes("controllerActuatorStats"), "pixiRenderer must expose controller actuator readouts.");
assert(debugOverlay.includes("controllerActuatorMs"), "debug overlay must expose controller actuator metrics.");
assert(app.includes("createControllerActuatorControlPanel") && app.includes("saveControllerActuatorConfig"), "App must wire actuator panel and persistence.");
assert(actuatorPanel.includes("enable movement influence"), "controller actuator panel must expose enable movement influence control.");
assert(!demoSimulation.includes("addForce(world, index, controllerOutput"), "M49 must not wire controller output directly into movement forces.");
assert(!demoSimulation.includes("stepMovement(world, controllerOutput"), "M49 must not pass controller output into movement.");

for (const scriptName of [
  "test:repo-status",
  "test:roadmap-status",
  "test:controller",
  "test:controller-actuator",
  "test:controller-integration",
  "test:controller-overlay-qa",
  "test:controller-config-persistence",
  "test:controller-panel",
  "test:demo-integration"
]) {
  assert(packageJson.scripts[scriptName], "package.json must expose " + scriptName + ".");
  assert(packageJson.scripts.test.includes(scriptName), "npm run test must include " + scriptName + ".");
}

assert(packageJson.scripts["bench:controller"] === "node scripts/bench-controller.mjs", "package.json must expose bench:controller.");
assert(packageJson.scripts["bench:controller-actuator"] === "node scripts/bench-controller-actuator.mjs", "package.json must expose bench:controller-actuator.");

console.log("repo status tests passed");

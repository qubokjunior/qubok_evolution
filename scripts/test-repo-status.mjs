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
const integrationM40 = readText("docs/integration_m40.md");
const integrationM41 = readText("docs/integration_m41.md");
const integrationM42 = readText("docs/integration_m42.md");
const integrationM43 = readText("docs/integration_m43.md");
const integrationM44 = readText("docs/integration_m44.md");
const integrationM45 = readText("docs/integration_m45.md");
const integrationM46 = readText("docs/integration_m46.md");
const integrationM47 = readText("docs/integration_m47.md");
const integrationM48 = readText("docs/integration_m48.md");
const fieldDamping = readText("src/sim/fieldDamping.ts");
const fieldAdvection = readText("src/sim/fieldAdvection.ts");
const fieldForce = readText("src/sim/fieldForce.ts");
const controller = readText("src/sim/controller.ts");
const demoSimulation = readText("src/sim/demoSimulation.ts");

assert(packageJson.version === EXPECTED_PROJECT_VERSION, `package.json must expose ${EXPECTED_PROJECT_VERSION}.`);
assert(appVersion.includes(`PROJECT_VERSION = "${EXPECTED_PROJECT_VERSION}"`), `appVersion must expose ${EXPECTED_PROJECT_VERSION}.`);
assert(appVersion.includes(`PROJECT_MILESTONE = ${EXPECTED_PROJECT_MILESTONE}`), `appVersion must expose milestone number ${EXPECTED_PROJECT_MILESTONE}.`);
assert(appVersion.includes(`PROJECT_MILESTONE_LABEL = "${EXPECTED_PROJECT_MILESTONE_LABEL}"`), `appVersion must expose ${EXPECTED_PROJECT_MILESTONE_LABEL} label.`);
assert(readme.includes(EXPECTED_PROJECT_STATUS), `README.md must expose ${EXPECTED_PROJECT_STATUS}.`);
assert(readme.includes("Controller intent is not yet actuated into movement"), "README.md must preserve the M48 behavior-neutral controller limit.");
assert(readme.includes("docs/project_overview.md"), "README.md must link docs/project_overview.md.");

for (const marker of ["| m32 |", "| m33 |", "| m34 |", "| m35 |", "| m36 |", "| m37 |", "| m38 |", "| m39 |", "| m40 |", "| m41 |", "| m42 |", "| m43 |", "| m44 |", "| m45 |", "| m46 |", "| m47 |", "| m48 |"]) {
  assert(milestones.includes(marker), "docs/milestones.md missing marker: " + marker);
}
assert(milestones.includes("| m48 |") && milestones.includes("| complete |"), "docs/milestones.md must close M48 as complete.");
assert(!milestones.includes("pending final close"), "docs/milestones.md must not leave M48 in pending-final-close state.");

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
  "Controller first pass",
  "Controller intent is not yet connected to movement",
  "M49",
  "M57"
]) {
  assert(projectOverview.includes(token), "project_overview.md missing required source-material token: " + token);
}
assert(!projectOverview.includes("M48 docs/status are partially implemented"), "project_overview.md must not describe M48 as partially implemented after close.");

assert(integrationM40.includes("environmental field render snapshot"), "integration_m40 must describe environmental field render snapshot.");
assert(integrationM41.includes("render debug controls"), "integration_m41 must describe render debug controls.");
assert(integrationM42.includes("decay") && integrationM42.includes("diffusion"), "integration_m42 must describe field decay/diffusion.");
assert(integrationM43.includes("field sources") && integrationM43.includes("sinks"), "integration_m43 must describe field sources/sinks.");
assert(integrationM44.includes("field source semantics tuning") && integrationM44.includes("visualization QA"), "integration_m44 must describe field source semantics tuning and visualization QA.");
assert(integrationM45.includes("obstacle/terrain damping sources") && integrationM45.includes("editable debug parameters"), "integration_m45 must describe obstacle/terrain damping sources and editable debug parameters.");
assert(integrationM46.includes("environmental field transport") && integrationM46.includes("advection"), "integration_m46 must describe m46 field transport/advection.");
assert(integrationM46.includes("M46 is closed") && integrationM46.includes("Final validation set"), "integration_m46 must document m46 closed status and validation set.");
assert(integrationM47.includes("M47 is closed") && integrationM47.includes("Final validation set"), "integration_m47 must document m47 closed status and validation set.");
assert(integrationM48.includes("M48 is closed") && integrationM48.includes("Final validation set"), "integration_m48 must document M48 closed status and validation set.");
assert(integrationM48.includes("does not actuate controller intent into movement"), "integration_m48 must preserve the M48 actuator limit.");

assert(fieldDamping.includes("FIELD_DAMPING_VERSION") && fieldDamping.includes("applyFieldDamping"), "fieldDamping must expose m45 core damping API.");
assert(fieldAdvection.includes("FIELD_ADVECTION_VERSION") && fieldAdvection.includes("advectEnvironmentalField"), "fieldAdvection must expose m46 core advection API.");
assert(fieldForce.includes("FIELD_FORCE_VERSION") && fieldForce.includes("applyFieldForces"), "fieldForce must expose m47 core field-force API.");
assert(controller.includes("CONTROLLER_VERSION") && controller.includes("stepAgentController"), "controller must expose M48 core controller API.");
assert(demoSimulation.includes("DEFAULT_ENABLE_CONTROLLER = false"), "M48 controller must remain disabled by default.");
assert(!demoSimulation.includes("addForce(world, index, controllerOutput"), "M48 must not wire controller output into movement forces.");
assert(!demoSimulation.includes("stepMovement(world, controllerOutput"), "M48 must not pass controller output into movement.");

for (const scriptName of [
  "test:repo-status",
  "test:roadmap-status",
  "test:field-advection",
  "test:field-force",
  "test:field-force-integration",
  "test:controller",
  "test:controller-integration",
  "test:controller-overlay-qa",
  "test:controller-config-persistence",
  "test:controller-panel"
]) {
  assert(packageJson.scripts[scriptName], "package.json must expose " + scriptName + ".");
  assert(packageJson.scripts.test.includes(scriptName), "npm run test must include " + scriptName + ".");
}

assert(packageJson.scripts["bench:field-advection"] === "node scripts/bench-field-advection.mjs", "package.json must expose bench:field-advection.");
assert(packageJson.scripts["bench:field-force"] === "node scripts/bench-field-force.mjs", "package.json must expose bench:field-force.");
assert(packageJson.scripts["bench:controller"] === "node scripts/bench-controller.mjs", "package.json must expose bench:controller.");

console.log("repo status tests passed");

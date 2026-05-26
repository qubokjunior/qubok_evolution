import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = (relativePath) => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const appVersion = readText("src/shared/appVersion.ts");
const readme = readText("README.md");
const milestones = readText("docs/milestones.md");
const integrationM40 = readText("docs/integration_m40.md");
const integrationM41 = readText("docs/integration_m41.md");
const integrationM42 = readText("docs/integration_m42.md");
const integrationM43 = readText("docs/integration_m43.md");
const integrationM44 = readText("docs/integration_m44.md");
const integrationM45 = readText("docs/integration_m45.md");
const integrationM46 = readText("docs/integration_m46.md");
const fieldDamping = readText("src/sim/fieldDamping.ts");
const fieldAdvection = readText("src/sim/fieldAdvection.ts");

assert(packageJson.version === "0.1.0-milestone.46", "package.json must expose 0.1.0-milestone.46.");
assert(appVersion.includes("PROJECT_VERSION = \"0.1.0-milestone.46\""), "appVersion must expose milestone.46.");
assert(appVersion.includes("PROJECT_MILESTONE = 46"), "appVersion must expose milestone number 46.");
assert(appVersion.includes("PROJECT_MILESTONE_LABEL = \"m46\""), "appVersion must expose m46 label.");
assert(readme.includes("m46 complete"), "README.md must expose current m46 complete status.");
assert(readme.includes("environmental field transport/advection"), "README.md must expose current field advection track.");
for (const marker of ["| m32 |", "| m33 |", "| m34 |", "| m35 |", "| m36 |", "| m37 |", "| m38 |", "| m39 |", "| m40 |", "| m41 |", "| m42 |", "| m43 |", "| m44 |", "| m45 |", "| m46 |"]) assert(milestones.includes(marker), "docs/milestones.md missing marker: " + marker);
assert(integrationM40.includes("environmental field render snapshot"), "integration_m40 must describe environmental field render snapshot.");
assert(integrationM41.includes("render debug controls"), "integration_m41 must describe render debug controls.");
assert(integrationM42.includes("decay") && integrationM42.includes("diffusion"), "integration_m42 must describe field decay/diffusion.");
assert(packageJson.scripts["test:field-dynamics"] === "node scripts/test-field-dynamics.mjs", "package.json must expose test:field-dynamics.");
assert(packageJson.scripts["test:field-dynamics-integration"] === "node scripts/test-field-dynamics-integration.mjs", "package.json must expose test:field-dynamics-integration.");
assert(packageJson.scripts["bench:field-dynamics"] === "node scripts/bench-field-dynamics.mjs", "package.json must expose bench:field-dynamics.");
assert(packageJson.scripts["test:repo-status"] === "node scripts/test-repo-status.mjs", "package.json must expose test:repo-status.");
assert(packageJson.scripts.test.includes("test:repo-status"), "npm run test must include test:repo-status.");

assert(integrationM43.includes("field sources") && integrationM43.includes("sinks"), "integration_m43 must describe field sources/sinks.");
assert(packageJson.scripts["test:field-sources"] === "node scripts/test-field-sources.mjs", "package.json must expose test:field-sources.");
assert(packageJson.scripts["test:field-sources-integration"] === "node scripts/test-field-sources-integration.mjs", "package.json must expose test:field-sources-integration.");
assert(packageJson.scripts["bench:field-sources"] === "node scripts/bench-field-sources.mjs", "package.json must expose bench:field-sources.");
assert(packageJson.scripts.test.includes("test:field-sources"), "npm run test must include test:field-sources.");
assert(packageJson.scripts.test.includes("test:field-sources-integration"), "npm run test must include test:field-sources-integration.");

assert(integrationM44.includes("field source semantics tuning") && integrationM44.includes("visualization QA"), "integration_m44 must describe field source semantics tuning and visualization QA.");
assert(integrationM45.includes("obstacle/terrain damping sources") && integrationM45.includes("editable debug parameters"), "integration_m45 must describe obstacle/terrain damping sources and editable debug parameters.");
assert(fieldDamping.includes("FIELD_DAMPING_VERSION") && fieldDamping.includes("applyFieldDamping"), "fieldDamping must expose m45 core damping API.");
assert(packageJson.scripts["test:field-damping"] === "node scripts/test-field-damping.mjs", "package.json must expose test:field-damping.");
assert(packageJson.scripts.test.includes("test:field-damping"), "npm run test must include test:field-damping.");
assert(packageJson.scripts["test:field-damping-integration"] === "node scripts/test-field-damping-integration.mjs", "package.json must expose test:field-damping-integration.");
assert(packageJson.scripts.test.includes("test:field-damping-integration"), "npm run test must include test:field-damping-integration.");
assert(integrationM45.includes("fieldDampingStats") && integrationM45.includes("fieldDampingMs"), "integration_m45 must document damping runtime outputs.");

assert(integrationM46.includes("environmental field transport") && integrationM46.includes("advection"), "integration_m46 must describe m46 field transport/advection.");
assert(fieldAdvection.includes("FIELD_ADVECTION_VERSION") && fieldAdvection.includes("advectEnvironmentalField"), "fieldAdvection must expose m46 core advection API.");
assert(packageJson.scripts["test:field-advection"] === "node scripts/test-field-advection.mjs", "package.json must expose test:field-advection.");
assert(packageJson.scripts.test.includes("test:field-advection"), "npm run test must include test:field-advection.");
assert(packageJson.scripts["bench:field-advection"] === "node scripts/bench-field-advection.mjs", "package.json must expose bench:field-advection.");
assert(packageJson.scripts["test:field-advection-integration"] === "node scripts/test-field-advection-integration.mjs", "package.json must expose test:field-advection-integration.");
assert(packageJson.scripts["test:field-advection-overlay-qa"] === "node scripts/test-field-advection-overlay-qa.mjs", "package.json must expose test:field-advection-overlay-qa.");
assert(packageJson.scripts["test:field-advection-panel"] === "node scripts/test-field-advection-panel.mjs", "package.json must expose test:field-advection-panel.");
assert(packageJson.scripts["test:field-advection-config-persistence"] === "node scripts/test-field-advection-config-persistence.mjs", "package.json must expose test:field-advection-config-persistence.");
assert(integrationM46.includes("M46 is closed") && integrationM46.includes("Final validation set"), "integration_m46 must document m46 closed status and validation set.");

console.log("repo status tests passed");

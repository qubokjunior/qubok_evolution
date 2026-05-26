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

assert(packageJson.version === "0.1.0-milestone.42", "package.json must expose 0.1.0-milestone.42.");
assert(appVersion.includes("PROJECT_VERSION = \"0.1.0-milestone.42\""), "appVersion must expose milestone.42.");
assert(appVersion.includes("PROJECT_MILESTONE = 42"), "appVersion must expose milestone number 42.");
assert(appVersion.includes("PROJECT_MILESTONE_LABEL = \"m42\""), "appVersion must expose m42 label.");
assert(readme.includes("0.1.0-milestone.42"), "README.md must expose current milestone version.");
assert(readme.includes("Current status: m42"), "README.md must expose current status m42.");
for (const marker of ["| m32 |", "| m33 |", "| m34 |", "| m35 |", "| m36 |", "| m37 |", "| m38 |", "| m39 |", "| m40 |", "| m41 |", "| m42 |"]) assert(milestones.includes(marker), "docs/milestones.md missing marker: " + marker);
assert(integrationM40.includes("environmental field render snapshot"), "integration_m40 must describe environmental field render snapshot.");
assert(integrationM41.includes("render debug controls"), "integration_m41 must describe render debug controls.");
assert(integrationM42.includes("decay") && integrationM42.includes("diffusion"), "integration_m42 must describe field decay/diffusion.");
assert(packageJson.scripts["test:field-dynamics"] === "node scripts/test-field-dynamics.mjs", "package.json must expose test:field-dynamics.");
assert(packageJson.scripts["test:field-dynamics-integration"] === "node scripts/test-field-dynamics-integration.mjs", "package.json must expose test:field-dynamics-integration.");
assert(packageJson.scripts["bench:field-dynamics"] === "node scripts/bench-field-dynamics.mjs", "package.json must expose bench:field-dynamics.");
assert(packageJson.scripts["test:repo-status"] === "node scripts/test-repo-status.mjs", "package.json must expose test:repo-status.");
assert(packageJson.scripts.test.includes("test:repo-status"), "npm run test must include test:repo-status.");
console.log("repo status tests passed");

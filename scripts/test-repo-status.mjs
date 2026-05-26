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
const integrationM30 = readText("docs/integration_m30.md");

assert(packageJson.version === "0.1.0-milestone.30", "package.json must expose 0.1.0-milestone.30.");
assert(appVersion.includes("PROJECT_VERSION = \"0.1.0-milestone.30\""), "appVersion must expose milestone.30.");
assert(appVersion.includes("PROJECT_MILESTONE = 30"), "appVersion must expose milestone number 30.");
assert(appVersion.includes("PROJECT_MILESTONE_LABEL = \"m30\""), "appVersion must expose m30 label.");
assert(readme.includes("0.1.0-milestone.30"), "README.md must expose current milestone version.");
assert(readme.includes("Current status: m30"), "README.md must expose current status m30.");
assert(readme.includes("docs/milestones.md"), "README.md must point to milestone index.");
assert(!readme.includes("## Milestone 1"), "README.md must not be frozen at Milestone 1.");
assert(!readme.includes("Not implemented yet:"), "README.md must not contain stale m1 not-implemented block.");
for (const marker of ["| m26 |", "| m27 |", "| m28 |", "| m29 |", "| m30 |"]) {
  assert(milestones.includes(marker), `docs/milestones.md missing milestone marker: ${marker}`);
}
assert(integrationM30.includes("repository status sync"), "integration_m30 must describe repo status sync.");
assert(packageJson.scripts["test:repo-status"] === "node scripts/test-repo-status.mjs", "package.json must expose test:repo-status.");
assert(packageJson.scripts.test.includes("test:repo-status"), "npm run test must include test:repo-status.");

console.log("repo status tests passed");

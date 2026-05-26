import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = (relativePath) => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const appVersion = readText("src/shared/appVersion.ts");
const readme = readText("README.md");
const roadmap = readText("docs/roadmap.md");
const architectureTracks = readText("docs/architecture_tracks.md");
const integrationM31 = readText("docs/integration_m31.md");

assert(packageJson.version === "0.1.0-milestone.31", "package.json must expose m31 version.");
assert(appVersion.includes('PROJECT_VERSION = \"0.1.0-milestone.31\"'), "appVersion must expose milestone.31.");
assert(appVersion.includes('PROJECT_MILESTONE_LABEL = \"m31\"'), "appVersion must expose m31 label.");
assert(readme.includes("docs/roadmap.md"), "README.md must link docs/roadmap.md.");
assert(readme.includes("docs/architecture_tracks.md"), "README.md must link docs/architecture_tracks.md.");
for (const token of ["terrain/material track", "fluid-like field track", "morphology/entity editor track", "controller/brain track", "render/performance track", "worker/WebGPU track"]) {
  assert(roadmap.includes(token), "roadmap missing track token: " + token);
}
assert(architectureTracks.includes("renderer must not own authoritative simulation state"), "architecture tracks must preserve render boundary.");
assert(integrationM31.includes("roadmap architecture tracks"), "integration_m31 must describe roadmap architecture tracks.");
assert(packageJson.scripts["test:roadmap-status"] === "node scripts/test-roadmap-status.mjs", "package.json must expose test:roadmap-status.");
assert(packageJson.scripts.test.includes("test:roadmap-status"), "npm run test must include test:roadmap-status.");
console.log("roadmap status tests passed");

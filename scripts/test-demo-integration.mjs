import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const readText = (relativePath) => readFileSync(resolve(projectRoot, relativePath), "utf8");

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const packageJson = JSON.parse(readText("package.json"));
const appVersion = readText("src/shared/appVersion.ts");
const demoSimulation = readText("src/sim/demoSimulation.ts");
const obstacleRenderSnapshot = readText("src/sim/obstacleRenderSnapshot.ts");
const pixiRenderer = readText("src/render/pixiRenderer.ts");
const debugOverlay = readText("src/render/debugOverlay.ts");
const perfMetrics = readText("src/shared/perfMetrics.ts");
const energy = readText("src/sim/energy.ts");
const predatorPrey = readText("src/sim/predatorPrey.ts");
const lifecyclePressureTest = readText("scripts/test-lifecycle-pressure.mjs");
const readme = readText("README.md");
const milestones = readText("docs/milestones.md");
const repoStatusTest = readText("scripts/test-repo-status.mjs");
const roadmap = readText("docs/roadmap.md");
const architectureTracks = readText("docs/architecture_tracks.md");
const roadmapStatusTest = readText("scripts/test-roadmap-status.mjs");
const terrain = readText("src/sim/terrain.ts");
const terrainTest = readText("scripts/test-terrain.mjs");
const terrainBench = readText("scripts/bench-terrain.mjs");
const deathPathAuditTest = readText("scripts/test-death-path-audit.mjs");

assert(packageJson.version === "0.1.0-milestone.32", "package.json version must be 0.1.0-milestone.32.");
assert(appVersion.includes('PROJECT_VERSION = "0.1.0-milestone.32"'), "appVersion must expose milestone.32.");
assert(appVersion.includes('PROJECT_MILESTONE_LABEL = "m32"'), "appVersion must expose m32 overlay label.");
assert(energy.includes("killAgent(world, index)"), "energy deaths must use killAgent so dead slots enter the free-list.");
assert(predatorPrey.includes("killAgent(world, preyIndex)"), "predator/prey kills must use killAgent so dead slots enter the free-list.");
assert(lifecyclePressureTest.includes("death -> reusable slot -> birth"), "lifecycle pressure test must document the m32 loop.");
assert(deathPathAuditTest.includes("direct alive-zero writes"), "death path audit must scan direct alive-zero writes.");
assert(deathPathAuditTest.includes("energy.ts must route death through killAgent"), "death path audit must lock energy death routing.");
assert(deathPathAuditTest.includes("predatorPrey.ts must route kills through killAgent"), "death path audit must lock predator/prey kill routing.");
assert(packageJson.scripts["test:death-path-audit"] === "node scripts/test-death-path-audit.mjs", "package.json must expose test:death-path-audit.");
assert(packageJson.scripts.test.includes("test:death-path-audit"), "npm run test must include death path audit.");
assert(readme.includes("0.1.0-milestone.32"), "README must expose the current milestone version.");
assert(readme.includes("docs/milestones.md"), "README must link the milestone index.");
assert(milestones.includes("| m32 |"), "milestones index must include m32.");
assert(repoStatusTest.includes("README.md"), "repo status test must validate README status sync.");
assert(packageJson.scripts["test:repo-status"] === "node scripts/test-repo-status.mjs", "package.json must expose test:repo-status.");
assert(packageJson.scripts.test.includes("test:repo-status"), "npm run test must include repo status test.");
assert(readme.includes("0.1.0-milestone.32"), "README must expose the current m32 milestone version.");
assert(readme.includes("docs/roadmap.md"), "README must link roadmap docs.");
assert(roadmap.includes("terrain/material track"), "roadmap must include terrain/material track.");
assert(roadmap.includes("controller/brain track"), "roadmap must include controller/brain track.");
assert(architectureTracks.includes("renderer must not own authoritative simulation state"), "architecture tracks must preserve sim/render boundary.");
assert(roadmapStatusTest.includes("docs/roadmap.md"), "roadmap status test must validate roadmap docs.");
assert(packageJson.scripts["test:roadmap-status"] === "node scripts/test-roadmap-status.mjs", "package.json must expose test:roadmap-status.");
assert(packageJson.scripts.test.includes("test:roadmap-status"), "npm run test must include roadmap status test.");
assert(packageJson.scripts["test:terrain"] === "node scripts/test-terrain.mjs", "package.json must expose test:terrain.");
assert(packageJson.scripts["bench:terrain"] === "node scripts/bench-terrain.mjs", "package.json must expose bench:terrain.");
assert(packageJson.scripts.test.includes("test:terrain"), "npm run test must include terrain tests.");
assert(terrain.includes("TERRAIN_LAYER_VERSION"), "terrain module must expose version token.");
assert(terrain.includes("sampleTerrainAtPosition"), "terrain module must expose position sampling query.");
assert(terrainTest.includes("terrain tests passed"), "terrain test must expose pass token.");
assert(terrainBench.includes("bench-terrain:m32"), "terrain benchmark must expose m32 bench token.");

for (const forbiddenImport of ["../render/", "./render/", "../ui/", "./ui/", "pixi.js", "react"]) {
  assert(!demoSimulation.includes(forbiddenImport), `demoSimulation must not import forbidden boundary token: ${forbiddenImport}`);
}

for (const requiredDemoToken of [
  "makeObstacleMaskRenderSnapshot",
  "ObstacleMaskRenderSnapshot",
  "obstacleMaskSnapshot"
]) {
  assert(demoSimulation.includes(requiredDemoToken), `demoSimulation is missing obstacle render token: ${requiredDemoToken}`);
}

for (const requiredSnapshotToken of [
  "OBSTACLE_RENDER_SNAPSHOT_VERSION",
  "makeObstacleMaskRenderSnapshot",
  "occupiedCellIds",
  "occupiedCellCount"
]) {
  assert(obstacleRenderSnapshot.includes(requiredSnapshotToken), `obstacle render snapshot module is missing token: ${requiredSnapshotToken}`);
}

for (const requiredRendererToken of [
  "obstacleLayer",
  "renderObstacleMask",
  "obstacleRenderMs",
  "obstacleRenderCellCount",
  "ObstacleMaskRenderSnapshot"
]) {
  assert(pixiRenderer.includes(requiredRendererToken), `pixiRenderer missing obstacle render token: ${requiredRendererToken}`);
}

for (const requiredMetricToken of [
  "obstacleRenderMs",
  "obstacleRenderCellCount"
]) {
  assert(perfMetrics.includes(requiredMetricToken), `perf metrics missing obstacle render metric: ${requiredMetricToken}`);
  assert(pixiRenderer.includes(requiredMetricToken), `pixiRenderer missing obstacle render metric: ${requiredMetricToken}`);
}

for (const requiredOverlayToken of [
  "obstacleRenderMs",
  "obstacleRenderCellCount",
  "obs render",
  "obs cells"
]) {
  assert(debugOverlay.includes(requiredOverlayToken), `debugOverlay missing obstacle render token: ${requiredOverlayToken}`);
}


for (const requiredWorldSlotTelemetryToken of [
  "reusableSlotCount",
  "spawnReusedSlotCount",
  "spawnAppendedSlotCount"
]) {
  assert(perfMetrics.includes(requiredWorldSlotTelemetryToken), "perf metrics missing world slot telemetry token: " + requiredWorldSlotTelemetryToken);
  assert(pixiRenderer.includes(requiredWorldSlotTelemetryToken), "pixiRenderer missing world slot telemetry token: " + requiredWorldSlotTelemetryToken);
  assert(debugOverlay.includes(requiredWorldSlotTelemetryToken), "debugOverlay missing world slot telemetry token: " + requiredWorldSlotTelemetryToken);
}

for (const requiredWorldSlotOverlayLabel of ["free slots", "spawn reused", "spawn append"]) {
  assert(debugOverlay.includes(requiredWorldSlotOverlayLabel), "debugOverlay missing world slot overlay label: " + requiredWorldSlotOverlayLabel);
}

console.log("demo integration tests passed");

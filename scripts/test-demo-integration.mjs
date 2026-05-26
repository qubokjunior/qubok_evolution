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
const roadmap = readText("docs/roadmap.md");
const architectureTracks = readText("docs/architecture_tracks.md");
const integrationM40 = readText("docs/integration_m40.md");
const integrationM41 = readText("docs/integration_m41.md");
const repoStatusTest = readText("scripts/test-repo-status.mjs");
const roadmapStatusTest = readText("scripts/test-roadmap-status.mjs");

const demoSimulation = readText("src/sim/demoSimulation.ts");
const field = readText("src/sim/field.ts");
const fieldRenderSnapshot = readText("src/sim/fieldRenderSnapshot.ts");
const movement = readText("src/sim/movement.ts");
const reproduction = readText("src/sim/reproduction.ts");
const sensors = readText("src/sim/sensors.ts");
const obstacleRenderSnapshot = readText("src/sim/obstacleRenderSnapshot.ts");
const terrain = readText("src/sim/terrain.ts");
const terrainRenderSnapshot = readText("src/sim/terrainRenderSnapshot.ts");
const pixiRenderer = readText("src/render/pixiRenderer.ts");
const debugOverlay = readText("src/render/debugOverlay.ts");
const perfMetrics = readText("src/shared/perfMetrics.ts");
const energy = readText("src/sim/energy.ts");
const predatorPrey = readText("src/sim/predatorPrey.ts");

assert(packageJson.version === "0.1.0-milestone.41", "package.json version must be 0.1.0-milestone.41.");
assert(appVersion.includes('PROJECT_VERSION = "0.1.0-milestone.41"'), "appVersion must expose milestone.41.");
assert(appVersion.includes("PROJECT_MILESTONE = 41"), "appVersion must expose milestone number 41.");
assert(appVersion.includes('PROJECT_MILESTONE_LABEL = "m41"'), "appVersion must expose m41 overlay label.");

assert(readme.includes("Current status: m41"), "README must expose current status m41.");
assert(readme.includes("0.1.0-milestone.41"), "README must expose the current milestone version.");
assert(readme.includes("docs/milestones.md"), "README must link the milestone index.");
assert(readme.includes("docs/roadmap.md"), "README must link roadmap docs.");
assert(readme.includes("docs/integration_m40.md"), "README must keep m40 integration doc link.");
assert(readme.includes("docs/integration_m41.md"), "README must link m41 integration doc.");

for (const marker of ["| m36 |", "| m37 |", "| m38 |", "| m39 |", "| m40 |", "| m41 |"]) {
  assert(milestones.includes(marker), "milestones index missing marker: " + marker);
}
assert(roadmap.includes("m40 shipped: environmental field render snapshot and Pixi vector debug layer"), "roadmap must include m40 shipped note.");
assert(roadmap.includes("m41 field render controls / overlay grouping / visibility toggle"), "roadmap must include m41 current milestone.");
assert(architectureTracks.includes("renderer must not own authoritative simulation state"), "architecture tracks must preserve sim/render boundary.");
assert(integrationM40.includes("environmental field render snapshot"), "integration_m40 must describe field render snapshot.");
assert(integrationM41.includes("render debug controls"), "integration_m41 must describe render debug controls.");
assert(integrationM41.includes("overlay grouping"), "integration_m41 must describe overlay grouping.");
assert(repoStatusTest.includes("0.1.0-milestone.41"), "repo status test must validate m41 status sync.");
assert(roadmapStatusTest.includes("fieldRenderVectorCount"), "roadmap status test must preserve field render metric assertion.");

for (const [scriptName, command] of [
  ["test:repo-status", "node scripts/test-repo-status.mjs"],
  ["test:roadmap-status", "node scripts/test-roadmap-status.mjs"],
  ["test:demo-integration", "node scripts/test-demo-integration.mjs"],
  ["test:field", "node scripts/test-field.mjs"],
  ["test:field-render-snapshot", "node scripts/test-field-render-snapshot.mjs"],
  ["test:terrain", "node scripts/test-terrain.mjs"],
  ["test:terrain-render-snapshot", "node scripts/test-terrain-render-snapshot.mjs"],
  ["test:terrain-debug-render-layer", "node scripts/test-terrain-debug-render-layer.mjs"],
  ["test:terrain-movement-query", "node scripts/test-terrain-movement-query.mjs"],
  ["test:terrain-resource-affinity", "node scripts/test-terrain-resource-affinity.mjs"],
  ["test:terrain-sensor-sampling", "node scripts/test-terrain-sensor-sampling.mjs"],
  ["test:terrain-reproduction-placement", "node scripts/test-terrain-reproduction-placement.mjs"],
  ["test:death-path-audit", "node scripts/test-death-path-audit.mjs"]
]) {
  assert(packageJson.scripts[scriptName] === command, `package.json must expose ${scriptName}.`);
  assert(packageJson.scripts.test.includes(scriptName), `npm run test must include ${scriptName}.`);
}

for (const requiredToken of ["DEMO_SIMULATION_VERSION", "terrainRenderSnapshot", "fieldRenderSnapshot", "makeFieldRenderSnapshot", "fieldRenderStride", "createEnvironmentalFieldLayer", "seedDemoField", "sensorTerrainTickInterval", "offspringTerrainMaxAttempts", "makeObstacleMaskRenderSnapshot"]) {
  assert(demoSimulation.includes(requiredToken), "demoSimulation missing token: " + requiredToken);
}
for (const forbiddenImport of ["../render/", "./render/", "../ui/", "./ui/", "pixi.js", "react"]) {
  assert(!demoSimulation.includes(forbiddenImport), `demoSimulation must not import forbidden boundary token: ${forbiddenImport}`);
}

assert(energy.includes("killAgent(world, index)"), "energy deaths must use killAgent so dead slots enter the free-list.");
assert(predatorPrey.includes("killAgent(world, preyIndex)"), "predator/prey kills must use killAgent so dead slots enter the free-list.");

for (const requiredToken of ["FIELD_LAYER_VERSION", "createEnvironmentalFieldLayer", "sampleFieldAtPosition", "flowX", "flowY"]) {
  assert(field.includes(requiredToken), "field module missing token: " + requiredToken);
}
for (const requiredToken of ["FIELD_RENDER_SNAPSHOT_VERSION", "makeFieldRenderSnapshot", "analyzeFieldRenderSnapshot", "sampleVectorCount", "truncated"]) {
  assert(fieldRenderSnapshot.includes(requiredToken), "field render snapshot missing token: " + requiredToken);
}
for (const requiredToken of ["field?: EnvironmentalFieldLayer", "fieldForceScale", "sampleFieldAtPosition", "fieldMovementSampleCount", "fieldFlowMagnitudeSum", "terrainMovementSampleCount"]) {
  assert(movement.includes(requiredToken), "movement missing token: " + requiredToken);
}
for (const requiredToken of ["TERRAIN_LAYER_VERSION", "sampleTerrainAtPosition"]) {
  assert(terrain.includes(requiredToken), "terrain module missing token: " + requiredToken);
}
for (const requiredToken of ["TERRAIN_RENDER_SNAPSHOT_VERSION", "makeTerrainRenderSnapshot", "analyzeTerrainRenderSnapshot"]) {
  assert(terrainRenderSnapshot.includes(requiredToken), "terrain render snapshot missing token: " + requiredToken);
}
for (const requiredToken of ["OBSTACLE_RENDER_SNAPSHOT_VERSION", "makeObstacleMaskRenderSnapshot", "occupiedCellIds", "occupiedCellCount"]) {
  assert(obstacleRenderSnapshot.includes(requiredToken), "obstacle render snapshot module missing token: " + requiredToken);
}
for (const requiredToken of ["terrainTickInterval", "terrainSensorSampleCount", "sampleTerrainAtPosition"]) {
  assert(sensors.includes(requiredToken), "sensors missing token: " + requiredToken);
}
for (const requiredToken of ["REPRODUCTION_SYSTEM_VERSION", "offspringTerrainMaxAttempts", "terrainOffspringSampleCount", "sampleTerrainAtPosition"]) {
  assert(reproduction.includes(requiredToken), "reproduction missing token: " + requiredToken);
}

for (const requiredToken of ["fieldLayer", "renderFieldVectorLayer", "fieldRenderVectorCount", "terrainLayer", "renderTerrainLayer", "obstacleLayer", "renderObstacleMask", "reusableSlotCount", "spawnReusedSlotCount", "spawnAppendedSlotCount"]) {
  assert(pixiRenderer.includes(requiredToken), "pixiRenderer missing token: " + requiredToken);
}
for (const requiredToken of ["field render", "field vectors", "field trunc", "terrain render", "terrain move samples", "terrain food samples", "terrain sensor samples", "terrain child samples", "obstacleRenderMs", "obstacleRenderCellCount", "reusableSlotCount"]) {
  assert(debugOverlay.includes(requiredToken), "debugOverlay missing token: " + requiredToken);
}
for (const requiredToken of ["fieldRenderMs", "fieldRenderVectorCount", "fieldRenderTruncated", "terrainRenderTruncated", "terrainMovementSampleCount", "terrainResourceSampleCount", "terrainSensorResourceAffinitySum", "terrainOffspringAffinitySum", "obstacleRenderMs", "obstacleRenderCellCount", "reusableSlotCount", "spawnReusedSlotCount", "spawnAppendedSlotCount"]) {
  assert(perfMetrics.includes(requiredToken), "perf metrics missing token: " + requiredToken);
}

console.log("demo integration tests passed");

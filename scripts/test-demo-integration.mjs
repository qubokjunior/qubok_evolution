import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = (relativePath) => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const appVersion = readText("src/shared/appVersion.ts");
const demoSimulation = readText("src/sim/demoSimulation.ts");
const field = readText("src/sim/field.ts");
const fieldRenderSnapshot = readText("src/sim/fieldRenderSnapshot.ts");
const movement = readText("src/sim/movement.ts");
const reproduction = readText("src/sim/reproduction.ts");
const sensors = readText("src/sim/sensors.ts");
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
const fieldTest = readText("scripts/test-field.mjs");
const fieldRenderSnapshotTest = readText("scripts/test-field-render-snapshot.mjs");
const terrainRenderSnapshot = readText("src/sim/terrainRenderSnapshot.ts");
const terrainRenderSnapshotTest = readText("scripts/test-terrain-render-snapshot.mjs");
const terrainRenderSnapshotBench = readText("scripts/bench-terrain-render-snapshot.mjs");
const terrainDebugRenderLayerTest = readText("scripts/test-terrain-debug-render-layer.mjs");
const terrainMovementQueryTest = readText("scripts/test-terrain-movement-query.mjs");
const terrainResourceAffinityTest = readText("scripts/test-terrain-resource-affinity.mjs");
const terrainSensorSamplingTest = readText("scripts/test-terrain-sensor-sampling.mjs");
const terrainReproductionPlacementTest = readText("scripts/test-terrain-reproduction-placement.mjs");
const deathPathAuditTest = readText("scripts/test-death-path-audit.mjs");
const integrationM39 = readText("docs/integration_m39.md");
const integrationM40 = readText("docs/integration_m40.md");

assert(packageJson.version === "0.1.0-milestone.40", "package.json version must be 0.1.0-milestone.40.");
assert(appVersion.includes('PROJECT_VERSION = "0.1.0-milestone.40"'), "appVersion must expose milestone.40.");
assert(appVersion.includes('PROJECT_MILESTONE_LABEL = "m40"'), "appVersion must expose m40 overlay label.");
assert(demoSimulation.includes('DEMO_SIMULATION_VERSION = "qubok_evolve.demo_simulation.v22"'), "demo simulation must expose v22.");
assert(demoSimulation.includes('qubok_evolve:demo:m40'), "demo seed must expose m40.");

assert(energy.includes("killAgent(world, index)"), "energy deaths must use killAgent so dead slots enter the free-list.");
assert(predatorPrey.includes("killAgent(world, preyIndex)"), "predator/prey kills must use killAgent so dead slots enter the free-list.");
assert(lifecyclePressureTest.includes("death -> reusable slot -> birth"), "lifecycle pressure test must document the lifecycle loop.");
assert(deathPathAuditTest.includes("direct alive-zero writes"), "death path audit must scan direct alive-zero writes.");
assert(packageJson.scripts["test:death-path-audit"] === "node scripts/test-death-path-audit.mjs", "package.json must expose test:death-path-audit.");
assert(packageJson.scripts.test.includes("test:death-path-audit"), "npm run test must include death path audit.");

assert(readme.includes("0.1.0-milestone.40"), "README must expose the current milestone version.");
assert(readme.includes("docs/milestones.md"), "README must link the milestone index.");
assert(readme.includes("docs/integration_m40.md"), "README must link m40 integration doc.");
assert(milestones.includes("| m40 |"), "milestones index must include m40.");
assert(repoStatusTest.includes("0.1.0-milestone.40"), "repo status test must validate m40 status sync.");
assert(packageJson.scripts["test:repo-status"] === "node scripts/test-repo-status.mjs", "package.json must expose test:repo-status.");
assert(packageJson.scripts.test.includes("test:repo-status"), "npm run test must include repo status test.");
assert(readme.includes("docs/roadmap.md"), "README must link roadmap docs.");
assert(roadmap.includes("terrain/material track"), "roadmap must include terrain/material track.");
assert(roadmap.includes("fluid-like field track"), "roadmap must include fluid-like field track.");
assert(roadmap.includes("controller/brain track"), "roadmap must include controller/brain track.");
assert(roadmap.includes("m40 shipped: environmental field render snapshot and Pixi vector debug layer"), "roadmap must include m40 shipped note.");
assert(roadmap.includes("m41 field render controls / overlay grouping / visibility toggle"), "roadmap must include m41 next candidate.");
assert(architectureTracks.includes("renderer must not own authoritative simulation state"), "architecture tracks must preserve sim/render boundary.");
assert(roadmapStatusTest.includes("fieldRenderVectorCount"), "roadmap status test must validate field render metrics.");
assert(packageJson.scripts["test:roadmap-status"] === "node scripts/test-roadmap-status.mjs", "package.json must expose test:roadmap-status.");
assert(packageJson.scripts.test.includes("test:roadmap-status"), "npm run test must include roadmap status test.");

assert(packageJson.scripts["test:terrain"] === "node scripts/test-terrain.mjs", "package.json must expose test:terrain.");
assert(packageJson.scripts["bench:terrain"] === "node scripts/bench-terrain.mjs", "package.json must expose bench:terrain.");
assert(packageJson.scripts.test.includes("test:terrain"), "npm run test must include terrain tests.");
assert(terrain.includes("TERRAIN_LAYER_VERSION"), "terrain module must expose version token.");
assert(terrain.includes("sampleTerrainAtPosition"), "terrain module must expose position sampling query.");
assert(terrainTest.includes("terrain tests passed"), "terrain test must expose pass token.");
assert(terrainBench.includes("bench-terrain:m32"), "terrain benchmark must expose m32 bench token.");

assert(packageJson.scripts["test:field"] === "node scripts/test-field.mjs", "package.json must expose test:field.");
assert(packageJson.scripts.test.includes("test:field"), "npm run test must include field tests.");
assert(field.includes("FIELD_LAYER_VERSION"), "field module must expose version token.");
assert(field.includes("createEnvironmentalFieldLayer"), "field module must expose field creation.");
assert(field.includes("sampleFieldAtPosition"), "field module must expose position sampling query.");
assert(field.includes("flowX"), "field module must expose flowX channel.");
assert(field.includes("flowY"), "field module must expose flowY channel.");
assert(fieldTest.includes("environmental field tests passed"), "field test must expose pass token.");
assert(integrationM39.includes("environmental flow field"), "integration_m39 must describe environmental flow field.");

assert(packageJson.scripts["test:field-render-snapshot"] === "node scripts/test-field-render-snapshot.mjs", "package.json must expose test:field-render-snapshot.");
assert(packageJson.scripts.test.includes("test:field-render-snapshot"), "npm run test must include field render snapshot tests.");
assert(fieldRenderSnapshot.includes("FIELD_RENDER_SNAPSHOT_VERSION"), "field render snapshot must expose version token.");
assert(fieldRenderSnapshot.includes("makeFieldRenderSnapshot"), "field render snapshot must expose snapshot builder.");
assert(fieldRenderSnapshot.includes("analyzeFieldRenderSnapshot"), "field render snapshot must expose analyzer.");
assert(fieldRenderSnapshot.includes("sampleVectorCount"), "field render snapshot must expose vector count.");
assert(fieldRenderSnapshot.includes("truncated"), "field render snapshot must expose truncation flag.");
assert(fieldRenderSnapshotTest.includes("field render snapshot tests passed"), "field render snapshot test must expose pass token.");
assert(integrationM40.includes("environmental field render snapshot"), "integration_m40 must describe field render snapshot.");

assert(packageJson.scripts["test:terrain-render-snapshot"] === "node scripts/test-terrain-render-snapshot.mjs", "package.json must expose test:terrain-render-snapshot.");
assert(packageJson.scripts["bench:terrain-render-snapshot"] === "node scripts/bench-terrain-render-snapshot.mjs", "package.json must expose bench:terrain-render-snapshot.");
assert(packageJson.scripts.test.includes("test:terrain-render-snapshot"), "npm run test must include terrain render snapshot tests.");
assert(terrainRenderSnapshot.includes("TERRAIN_RENDER_SNAPSHOT_VERSION"), "terrain render snapshot module must expose version token.");
assert(terrainRenderSnapshot.includes("makeTerrainRenderSnapshot"), "terrain render snapshot module must expose snapshot builder.");
assert(terrainRenderSnapshot.includes("analyzeTerrainRenderSnapshot"), "terrain render snapshot module must expose snapshot analyzer.");
assert(terrainRenderSnapshotTest.includes("terrain render snapshot tests passed"), "terrain render snapshot test must expose pass token.");
assert(terrainRenderSnapshotBench.includes("bench-terrain-render-snapshot:m33"), "terrain render snapshot bench must expose m33 bench token.");

assert(packageJson.scripts["test:terrain-debug-render-layer"] === "node scripts/test-terrain-debug-render-layer.mjs", "package.json must expose test:terrain-debug-render-layer.");
assert(packageJson.scripts.test.includes("test:terrain-debug-render-layer"), "npm run test must include terrain debug render layer test.");
assert(demoSimulation.includes("terrainRenderSnapshot"), "demoSimulation must emit terrainRenderSnapshot.");
assert(pixiRenderer.includes("renderTerrainLayer"), "pixiRenderer must expose terrain render layer function.");
assert(pixiRenderer.includes("terrainLayer"), "pixiRenderer must own terrainLayer.");
assert(debugOverlay.includes("terrain render"), "debugOverlay must expose terrain render label.");
assert(perfMetrics.includes("terrainRenderTruncated"), "perf metrics must expose terrainRenderTruncated.");
assert(terrainDebugRenderLayerTest.includes("terrain debug render layer tests passed"), "terrain debug render layer test must expose pass token.");

assert(packageJson.scripts["test:terrain-movement-query"] === "node scripts/test-terrain-movement-query.mjs", "package.json must expose test:terrain-movement-query.");
assert(packageJson.scripts.test.includes("test:terrain-movement-query"), "npm run test must include terrain movement query test.");
assert(perfMetrics.includes("terrainMovementSampleCount"), "perf metrics must expose terrainMovementSampleCount.");
assert(pixiRenderer.includes("terrainMovementCostSum"), "pixiRenderer must record terrain movement cost metric.");
assert(debugOverlay.includes("terrain move samples"), "debugOverlay must expose terrain movement labels.");
assert(terrainMovementQueryTest.includes("terrain movement query tests passed"), "terrain movement query test must expose pass token.");

assert(movement.includes('MOVEMENT_SYSTEM_VERSION = "qubok_evolve.movement.v3"'), "movement must expose v3.");
assert(movement.includes("field?: EnvironmentalFieldLayer"), "movement must accept environmental field.");
assert(movement.includes("fieldForceScale"), "movement must expose fieldForceScale.");
assert(movement.includes("sampleFieldAtPosition"), "movement must sample field.");
assert(movement.includes("fieldMovementSampleCount"), "movement must expose field movement stats.");
assert(movement.includes("fieldFlowMagnitudeSum"), "movement must expose field flow magnitude stats.");
assert(demoSimulation.includes("createEnvironmentalFieldLayer"), "demoSimulation must create field.");
assert(demoSimulation.includes("seedDemoField"), "demoSimulation must seed demo field.");
assert(demoSimulation.includes("fieldForceScale"), "demoSimulation must expose field force scale.");
assert(demoSimulation.includes("fieldRenderSnapshot"), "demoSimulation must emit field render snapshot.");
assert(demoSimulation.includes("fieldRenderStride"), "demoSimulation must expose fieldRenderStride.");
assert(demoSimulation.includes("makeFieldRenderSnapshot"), "demoSimulation must build field render snapshot.");
assert(perfMetrics.includes("fieldMovementSampleCount"), "perf metrics must expose fieldMovementSampleCount.");
assert(perfMetrics.includes("fieldFlowMagnitudeSum"), "perf metrics must expose fieldFlowMagnitudeSum.");
assert(perfMetrics.includes("fieldRenderMs"), "perf metrics must expose fieldRenderMs.");
assert(perfMetrics.includes("fieldRenderVectorCount"), "perf metrics must expose fieldRenderVectorCount.");
assert(perfMetrics.includes("fieldRenderTruncated"), "perf metrics must expose fieldRenderTruncated.");
assert(pixiRenderer.includes("fieldMovementSampleCount"), "pixiRenderer must record fieldMovementSampleCount.");
assert(pixiRenderer.includes("fieldFlowMagnitudeSum"), "pixiRenderer must record fieldFlowMagnitudeSum.");
assert(pixiRenderer.includes("FieldRenderSnapshot"), "pixiRenderer must import FieldRenderSnapshot.");
assert(pixiRenderer.includes("fieldRenderSnapshot"), "pixiRenderer must receive fieldRenderSnapshot.");
assert(pixiRenderer.includes("fieldLayer"), "pixiRenderer must own fieldLayer.");
assert(pixiRenderer.includes("renderFieldVectorLayer"), "pixiRenderer must render field vectors.");
assert(pixiRenderer.includes("fieldRenderVectorCount"), "pixiRenderer must record fieldRenderVectorCount.");
assert(debugOverlay.includes("field move samples"), "debugOverlay must expose field move label.");
assert(debugOverlay.includes("field flow mag"), "debugOverlay must expose field flow magnitude label.");
assert(debugOverlay.includes("field render"), "debugOverlay must expose field render label.");
assert(debugOverlay.includes("field vectors"), "debugOverlay must expose field vectors label.");
assert(debugOverlay.includes("field trunc"), "debugOverlay must expose field trunc label.");

assert(packageJson.scripts["test:terrain-resource-affinity"] === "node scripts/test-terrain-resource-affinity.mjs", "package.json must expose test:terrain-resource-affinity.");
assert(packageJson.scripts.test.includes("test:terrain-resource-affinity"), "npm run test must include terrain resource affinity test.");
assert(perfMetrics.includes("terrainResourceSampleCount"), "perf metrics must expose terrainResourceSampleCount.");
assert(debugOverlay.includes("terrain food samples"), "debugOverlay must expose terrain resource labels.");
assert(terrainResourceAffinityTest.includes("terrain resource affinity tests passed"), "terrain resource affinity test must expose pass token.");

assert(packageJson.scripts["test:terrain-sensor-sampling"] === "node scripts/test-terrain-sensor-sampling.mjs", "package.json must expose test:terrain-sensor-sampling.");
assert(packageJson.scripts.test.includes("test:terrain-sensor-sampling"), "npm run test must include terrain sensor sampling test.");
assert(sensors.includes("terrainTickInterval"), "sensors must expose terrainTickInterval.");
assert(sensors.includes("terrainSensorSampleCount"), "sensors must expose terrain sensor sample stats.");
assert(sensors.includes("sampleTerrainAtPosition"), "sensors must sample terrain.");
assert(demoSimulation.includes("sensorTerrainTickInterval"), "demoSimulation must expose sensorTerrainTickInterval.");
assert(demoSimulation.includes("terrainTickInterval: sensorTerrainTickInterval"), "demoSimulation must pass terrainTickInterval to sensors.");
assert(perfMetrics.includes("terrainSensorResourceAffinitySum"), "perf metrics must expose terrain sensor affinity sum.");
assert(pixiRenderer.includes("terrainSensorSampleCount"), "pixiRenderer must record terrain sensor metrics.");
assert(debugOverlay.includes("terrain sensor samples"), "debugOverlay must expose terrain sensor labels.");
assert(terrainSensorSamplingTest.includes("terrain sensor sampling tests passed"), "terrain sensor sampling test must expose pass token.");

assert(packageJson.scripts["test:terrain-reproduction-placement"] === "node scripts/test-terrain-reproduction-placement.mjs", "package.json must expose test:terrain-reproduction-placement.");
assert(packageJson.scripts.test.includes("test:terrain-reproduction-placement"), "npm run test must include terrain reproduction placement test.");
assert(reproduction.includes("REPRODUCTION_SYSTEM_VERSION = \"qubok_evolve.reproduction.v4\""), "reproduction must expose v4.");
assert(reproduction.includes("offspringTerrainMaxAttempts"), "reproduction must expose offspringTerrainMaxAttempts.");
assert(reproduction.includes("terrainOffspringSampleCount"), "reproduction must expose terrain offspring sample stats.");
assert(reproduction.includes("sampleTerrainAtPosition"), "reproduction must sample terrain.");
assert(demoSimulation.includes("offspringTerrainMaxAttempts"), "demoSimulation must expose offspringTerrainMaxAttempts.");
assert(demoSimulation.includes("terrain, offspringSpawnMaxAttempts"), "demoSimulation must pass terrain to reproduction.");
assert(perfMetrics.includes("terrainOffspringAffinitySum"), "perf metrics must expose terrain offspring affinity sum.");
assert(pixiRenderer.includes("terrainOffspringSampleCount"), "pixiRenderer must record terrain offspring metrics.");
assert(debugOverlay.includes("terrain child samples"), "debugOverlay must expose terrain child labels.");
assert(terrainReproductionPlacementTest.includes("terrain reproduction placement tests passed"), "terrain reproduction placement test must expose pass token.");

for (const forbiddenImport of ["../render/", "./render/", "../ui/", "./ui/", "pixi.js", "react"]) {
  assert(!demoSimulation.includes(forbiddenImport), `demoSimulation must not import forbidden boundary token: ${forbiddenImport}`);
}

for (const requiredDemoToken of ["makeObstacleMaskRenderSnapshot", "ObstacleMaskRenderSnapshot", "obstacleMaskSnapshot"]) {
  assert(demoSimulation.includes(requiredDemoToken), `demoSimulation is missing obstacle render token: ${requiredDemoToken}`);
}

for (const requiredSnapshotToken of ["OBSTACLE_RENDER_SNAPSHOT_VERSION", "makeObstacleMaskRenderSnapshot", "occupiedCellIds", "occupiedCellCount"]) {
  assert(obstacleRenderSnapshot.includes(requiredSnapshotToken), `obstacle render snapshot module is missing token: ${requiredSnapshotToken}`);
}

for (const requiredRendererToken of ["obstacleLayer", "renderObstacleMask", "obstacleRenderMs", "obstacleRenderCellCount", "ObstacleMaskRenderSnapshot"]) {
  assert(pixiRenderer.includes(requiredRendererToken), `pixiRenderer missing obstacle render token: ${requiredRendererToken}`);
}

for (const requiredMetricToken of ["obstacleRenderMs", "obstacleRenderCellCount"]) {
  assert(perfMetrics.includes(requiredMetricToken), `perf metrics missing obstacle render metric: ${requiredMetricToken}`);
  assert(pixiRenderer.includes(requiredMetricToken), `pixiRenderer missing obstacle render metric: ${requiredMetricToken}`);
}

for (const requiredOverlayToken of ["obstacleRenderMs", "obstacleRenderCellCount"]) {
  assert(debugOverlay.includes(requiredOverlayToken), `debugOverlay missing obstacle render token: ${requiredOverlayToken}`);
}

for (const requiredWorldSlotTelemetryToken of ["reusableSlotCount", "spawnReusedSlotCount", "spawnAppendedSlotCount"]) {
  assert(perfMetrics.includes(requiredWorldSlotTelemetryToken), "perf metrics missing world slot telemetry token: " + requiredWorldSlotTelemetryToken);
  assert(pixiRenderer.includes(requiredWorldSlotTelemetryToken), "pixiRenderer missing world slot telemetry token: " + requiredWorldSlotTelemetryToken);
  assert(debugOverlay.includes(requiredWorldSlotTelemetryToken), "debugOverlay missing world slot telemetry token: " + requiredWorldSlotTelemetryToken);
}

console.log("demo integration tests passed");

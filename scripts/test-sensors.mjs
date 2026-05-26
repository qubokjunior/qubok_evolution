import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_sensors_test");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

for (const moduleName of ["arrays.ts", "world.ts", "spatialHash.ts", "neighborQuery.ts", "resources.ts", "obstacleMask.ts", "terrain.ts", "sensors.ts"]) {
  await transpileSimModule(moduleName, moduleName.replace(".ts", ".mjs"));
}

const { createWorldState, getSectorOffset, spawnAgent } = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);
const { buildSpatialHashGrid, createSpatialHashGrid } = await import(pathToFileURL(join(temporaryDirectory, "spatialHash.mjs")).href);
const { createResourceLayer, rebuildResourceGrid, spawnResource } = await import(pathToFileURL(join(temporaryDirectory, "resources.mjs")).href);
const { createObstacleMask, setObstacleCell } = await import(pathToFileURL(join(temporaryDirectory, "obstacleMask.mjs")).href);
const {
  SENSOR_SYSTEM_VERSION,
  applyAgentSensors,
  clearAgentSensorOutputs,
  getSensorSectorIndex
} = await import(pathToFileURL(join(temporaryDirectory, "sensors.mjs")).href);

assertEqual(SENSOR_SYSTEM_VERSION, "qubok_evolve.sensors.v5", "sensor system version");
assertEqual(getSensorSectorIndex(1, 0, 1, 0, 8), 0, "forward sector");
assertEqual(getSensorSectorIndex(1, 0, 0, 1, 8), 2, "left sector");
assertEqual(getSensorSectorIndex(1, 0, -1, 0, 8), 4, "back sector");
assertEqual(getSensorSectorIndex(1, 0, 0, -1, 8), 6, "right sector");

const world = createWorldState({ capacity: 12, worldWidth: 200, worldHeight: 200, sectorCount: 8 });
const grid = createSpatialHashGrid({ capacity: 12, worldWidth: 200, worldHeight: 200, cellSize: 20 });
const resources = createResourceLayer({ capacity: 8, worldWidth: 200, worldHeight: 200, cellSize: 20 });
const obstacleMask = createObstacleMask({ worldWidth: 200, worldHeight: 200, cellSize: 10 });

const center = spawnAgent(world, { x: 50, y: 50, headingX: 1, headingY: 0, visionRadius: 40, visionCosHalfCone: Math.cos(Math.PI / 4), speciesId: 1 });
spawnAgent(world, { x: 60, y: 50, headingX: 0, headingY: 1, visionRadius: 0, speciesId: 1 });
spawnAgent(world, { x: 65, y: 55, headingX: 1, headingY: 0, visionRadius: 0, speciesId: 2, mouthPower: 8, maxSpeed: 100, armor: 0.5 });
spawnAgent(world, { x: 40, y: 50, visionRadius: 0, speciesId: 2 });
spawnAgent(world, { x: 100, y: 50, visionRadius: 0, speciesId: 2 });
const edge = spawnAgent(world, { x: 190, y: 100, headingX: 1, headingY: 0, visionRadius: 40, visionCosHalfCone: Math.cos(Math.PI / 3), speciesId: 3 });

spawnResource(resources, { x: 65, y: 50, energy: 18, radius: 3, kindId: 0 });
spawnResource(resources, { x: 30, y: 50, energy: 18, radius: 3, kindId: 0 });
rebuildResourceGrid(resources);

setObstacleCell(obstacleMask, 7, 5, true);
setObstacleCell(obstacleMask, 3, 5, true);
setObstacleCell(obstacleMask, 19, 10, true);

buildSpatialHashGrid(grid, world);
const stats = applyAgentSensors(world, grid, { resources, obstacleMask, tick: 0, foodTickInterval: 4, obstacleTickInterval: 2 });

assertEqual(stats.checkedCount, 2, "checked count");
assertEqual(stats.skippedNoVisionCount, 4, "skipped no vision count");
assertEqual(stats.visibleNeighborCount, 2, "visible neighbor count");
assertEqual(stats.foodSensorScheduled, true, "food scheduled on tick 0");
assertEqual(stats.obstacleSensorScheduled, true, "obstacle scheduled on tick 0");
assertEqual(stats.foodSkippedByCadence, false, "food not skipped on tick 0");
assertEqual(stats.obstacleSkippedByCadence, false, "obstacle not skipped on tick 0");
assertGreater(stats.foodVisibleCount, 0, "food visible count");
assertGreater(stats.foodSectorWrites, 0, "food sector writes");
assertGreater(stats.obstacleSectorWrites, 0, "obstacle sector writes");
assertGreater(stats.obstacleMaskCellChecks, 0, "obstacle mask cell checks");
assertGreater(stats.obstacleMaskHits, 0, "obstacle mask hits");
assertGreater(stats.obstacleMaskSectorWrites, 0, "obstacle mask sector writes");
assertGreater(stats.foodSignalSum, 0, "food signal sum");
assertGreater(stats.obstacleSignalSum, 0, "obstacle signal sum");

const forwardOffset = getSectorOffset(world, center, 0);
const backOffset = getSectorOffset(world, center, 4);
const edgeForwardOffset = getSectorOffset(world, edge, 0);
assertGreater(world.sectorAlly[forwardOffset], 0, "forward ally signal");
assertGreater(world.sectorThreat[forwardOffset], 0, "forward threat signal");
assertGreater(world.sectorFood[forwardOffset], 0, "forward food signal");
assertGreater(world.sectorObstacle[forwardOffset], 0, "forward obstacle mask signal");
assertGreater(world.sectorObstacle[edgeForwardOffset], 0, "edge obstacle signal");
assertEqual(world.sectorFood[backOffset], 0, "behind food rejected by cone");
assertEqual(world.sectorThreat[backOffset], 0, "behind threat rejected by cone");
assertAlmostEqual(world.localCentroidX[center], 62.5, 0.0001, "local centroid x");
assertAlmostEqual(world.localCentroidY[center], 52.5, 0.0001, "local centroid y");
assertGreater(-world.separationX[center], 0, "separation x pushes away from forward neighbors");

const preservedFood = world.sectorFood[forwardOffset];
const preservedObstacle = world.sectorObstacle[forwardOffset];
const skippedStats = applyAgentSensors(world, grid, { resources, obstacleMask, tick: 1, foodTickInterval: 4, obstacleTickInterval: 2 });

assertEqual(skippedStats.foodSensorScheduled, false, "food not scheduled on tick 1");
assertEqual(skippedStats.obstacleSensorScheduled, false, "obstacle not scheduled on tick 1");
assertEqual(skippedStats.foodSkippedByCadence, true, "food skipped by cadence");
assertEqual(skippedStats.obstacleSkippedByCadence, true, "obstacle skipped by cadence");
assertEqual(skippedStats.foodSectorWrites, 0, "no food writes on skipped tick");
assertEqual(skippedStats.obstacleSectorWrites, 0, "no obstacle writes on skipped tick");
assertAlmostEqual(world.sectorFood[forwardOffset], preservedFood, 0.000001, "skipped food buffer preserved");
assertAlmostEqual(world.sectorObstacle[forwardOffset], preservedObstacle, 0.000001, "skipped obstacle buffer preserved");

applyAgentSensors(world, grid, { resources, obstacleMask, tick: 1, foodTickInterval: 4, obstacleTickInterval: 2, preserveSkippedSectorChannels: false });
assertEqual(world.sectorFood[forwardOffset], 0, "skipped food buffer cleared when preserve is false");
assertEqual(world.sectorObstacle[forwardOffset], 0, "skipped obstacle buffer cleared when preserve is false");

clearAgentSensorOutputs(world);
assertEqual(world.sectorAlly[forwardOffset], 0, "clear ally buffer");
assertEqual(world.sectorThreat[forwardOffset], 0, "clear threat buffer");
assertEqual(world.sectorFood[forwardOffset], 0, "clear food buffer");
assertEqual(world.sectorObstacle[edgeForwardOffset], 0, "clear obstacle buffer");
assertEqual(world.localCentroidX[center], 0, "clear centroid x");

assertThrows(() => getSensorSectorIndex(1, 0, 1, 0, 0), "invalid sector count");
assertThrows(() => applyAgentSensors(world, grid, { radiusScale: 0 }), "invalid radius scale");
assertThrows(() => applyAgentSensors(world, grid, { foodTickInterval: 0 }), "invalid food interval");
assertThrows(() => applyAgentSensors(world, grid, { obstacleTickInterval: 0 }), "invalid obstacle interval");
assertThrows(() => applyAgentSensors(world, grid, { obstacleMask: createObstacleMask({ worldWidth: 100, worldHeight: 100, cellSize: 10 }) }), "incompatible obstacle mask");

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("sensors tests passed");

async function transpileSimModule(sourceName, outputName) {
  const sourcePath = join(projectRoot, "src", "sim", sourceName);
  const outputPath = join(temporaryDirectory, outputName);
  const sourceText = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(sourceText, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true } });
  const outputText = transpiled.outputText
    .replaceAll('from "./arrays"', 'from "./arrays.mjs"')
    .replaceAll("from './arrays'", "from './arrays.mjs'")
    .replaceAll('from "./world"', 'from "./world.mjs"')
    .replaceAll("from './world'", "from './world.mjs'")
    .replaceAll('from "./spatialHash"', 'from "./spatialHash.mjs"')
    .replaceAll("from './spatialHash'", "from './spatialHash.mjs'")
    .replaceAll('from "./neighborQuery"', 'from "./neighborQuery.mjs"')
    .replaceAll("from './neighborQuery'", "from './neighborQuery.mjs'")
    .replaceAll('from "./resources"', 'from "./resources.mjs"')
    .replaceAll("from './resources'", "from './resources.mjs'")
    .replaceAll('from "./obstacleMask"', 'from "./obstacleMask.mjs"')
    .replaceAll("from './obstacleMask'", "from './obstacleMask.mjs'")
    .replaceAll('from "./terrain"', 'from "./terrain.mjs"')
    .replaceAll("from './terrain'", "from './terrain.mjs'")
    .replaceAll('from "./sensors"', 'from "./sensors.mjs"')
    .replaceAll("from './sensors'", "from './sensors.mjs'");
  await writeFile(outputPath, outputText, "utf8");
}

function assertEqual(actual, expected, label) { if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`); }
function assertAlmostEqual(actual, expected, epsilon, label) { if (Math.abs(actual - expected) > epsilon) throw new Error(`${label}: expected ${expected} +/- ${epsilon}, got ${actual}`); }
function assertGreater(actual, threshold, label) { if (!(actual > threshold)) throw new Error(`${label}: expected ${actual} > ${threshold}`); }
function assertThrows(fn, label) { let thrown = false; try { fn(); } catch { thrown = true; } if (!thrown) throw new Error(`${label}: expected function to throw`); }

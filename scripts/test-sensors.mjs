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

await transpileSimModule("arrays.ts", "arrays.mjs");
await transpileSimModule("world.ts", "world.mjs");
await transpileSimModule("spatialHash.ts", "spatialHash.mjs");
await transpileSimModule("neighborQuery.ts", "neighborQuery.mjs");
await transpileSimModule("resources.ts", "resources.mjs");
await transpileSimModule("sensors.ts", "sensors.mjs");

const { createWorldState, getSectorOffset, spawnAgent } = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);
const { buildSpatialHashGrid, createSpatialHashGrid } = await import(pathToFileURL(join(temporaryDirectory, "spatialHash.mjs")).href);
const { createResourceLayer, rebuildResourceGrid, spawnResource } = await import(pathToFileURL(join(temporaryDirectory, "resources.mjs")).href);
const {
  SENSOR_SYSTEM_VERSION,
  applyAgentSensors,
  clearAgentSensorOutputs,
  getSensorSectorIndex
} = await import(pathToFileURL(join(temporaryDirectory, "sensors.mjs")).href);

assertEqual(SENSOR_SYSTEM_VERSION, "qubok_evolve.sensors.v2", "sensor system version");
assertEqual(getSensorSectorIndex(1, 0, 1, 0, 8), 0, "forward sector");
assertEqual(getSensorSectorIndex(1, 0, 0, 1, 8), 2, "left sector");
assertEqual(getSensorSectorIndex(1, 0, -1, 0, 8), 4, "back sector");
assertEqual(getSensorSectorIndex(1, 0, 0, -1, 8), 6, "right sector");

const world = createWorldState({ capacity: 10, worldWidth: 200, worldHeight: 200, sectorCount: 8 });
const grid = createSpatialHashGrid({ capacity: 10, worldWidth: 200, worldHeight: 200, cellSize: 20 });
const resources = createResourceLayer({ capacity: 8, worldWidth: 200, worldHeight: 200, cellSize: 20 });

const center = spawnAgent(world, {
  x: 50,
  y: 50,
  headingX: 1,
  headingY: 0,
  visionRadius: 40,
  visionCosHalfCone: Math.cos(Math.PI / 4),
  speciesId: 1,
  energy: 80,
  maxEnergy: 100
});

spawnAgent(world, {
  x: 60,
  y: 50,
  headingX: 0,
  headingY: 1,
  visionRadius: 0,
  speciesId: 1,
  energy: 100,
  maxEnergy: 100
});

spawnAgent(world, {
  x: 65,
  y: 55,
  headingX: 1,
  headingY: 0,
  visionRadius: 0,
  speciesId: 2,
  mouthPower: 12,
  maxSpeed: 120,
  armor: 0.5
});

spawnAgent(world, {
  x: 40,
  y: 50,
  visionRadius: 0,
  speciesId: 2
});

const boundaryObserver = spawnAgent(world, {
  x: 190,
  y: 100,
  headingX: 1,
  headingY: 0,
  visionRadius: 30,
  visionCosHalfCone: Math.cos(Math.PI / 2),
  speciesId: 7
});

spawnResource(resources, { x: 70, y: 50, energy: 18, radius: 4, kindId: 1 });
spawnResource(resources, { x: 30, y: 50, energy: 18, radius: 4, kindId: 1 });

buildSpatialHashGrid(grid, world);
rebuildResourceGrid(resources);
const stats = applyAgentSensors(world, grid, {
  resources,
  obstacleDetectionRadius: 30
});

assertEqual(stats.checkedCount, 2, "checked count");
assertEqual(stats.skippedNoVisionCount, 3, "skipped no vision count");
assertEqual(stats.visibleNeighborCount, 2, "visible neighbor count");
assertEqual(stats.foodVisibleCount, 1, "visible food count");
assertEqual(stats.foodSectorWrites, 1, "food sector writes");
assertEqual(stats.obstacleSectorWrites, 1, "obstacle sector writes");
assertEqual(stats.sectorWrites, 4, "total sector writes");
assertEqual(stats.agentsWithVisibleNeighbors, 1, "agents with visible neighbors");
assertEqual(stats.maxVisibleNeighborsForAgent, 2, "max visible neighbors");

const centerForwardOffset = getSectorOffset(world, center, 0);
const centerBackOffset = getSectorOffset(world, center, 4);
const obstacleForwardOffset = getSectorOffset(world, boundaryObserver, 0);

assertGreater(world.sectorAlly[centerForwardOffset], 0, "forward ally signal");
assertGreater(world.sectorThreat[centerForwardOffset], 0, "forward threat signal");
assertGreater(world.sectorFood[centerForwardOffset], 0, "forward food signal");
assertGreater(world.sectorObstacle[obstacleForwardOffset], 0, "forward obstacle signal");
assertEqual(world.sectorThreat[centerBackOffset], 0, "behind threat rejected by cone");
assertEqual(world.sectorFood[centerBackOffset], 0, "behind food rejected by cone");
assertAlmostEqual(world.localCentroidX[center], 62.5, 0.0001, "local centroid x");
assertAlmostEqual(world.localCentroidY[center], 52.5, 0.0001, "local centroid y");
assertGreater(-world.separationX[center], 0, "separation x pushes away from forward neighbors");
assertGreater(stats.allySignalSum, 0, "weighted ally signal sum");
assertGreater(stats.threatSignalSum, 0, "weighted threat signal sum");
assertGreater(stats.foodSignalSum, 0, "weighted food signal sum");
assertGreater(stats.obstacleSignalSum, 0, "weighted obstacle signal sum");

clearAgentSensorOutputs(world);
assertEqual(world.sectorAlly[centerForwardOffset], 0, "clear ally buffer");
assertEqual(world.sectorThreat[centerForwardOffset], 0, "clear threat buffer");
assertEqual(world.sectorFood[centerForwardOffset], 0, "clear food buffer");
assertEqual(world.sectorObstacle[obstacleForwardOffset], 0, "clear obstacle buffer");
assertEqual(world.localCentroidX[center], 0, "clear centroid x");

assertThrows(() => getSensorSectorIndex(1, 0, 1, 0, 0), "invalid sector count");
assertThrows(() => applyAgentSensors(world, grid, { radiusScale: 0 }), "invalid radius scale");
assertThrows(() => applyAgentSensors(world, grid, { obstacleDetectionRadius: 0 }), "invalid obstacle radius");

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("sensors tests passed");

async function transpileSimModule(sourceName, outputName) {
  const sourcePath = join(projectRoot, "src", "sim", sourceName);
  const outputPath = join(temporaryDirectory, outputName);
  const sourceText = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(sourceText, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      strict: true
    }
  });

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
    .replaceAll('from "./sensors"', 'from "./sensors.mjs"')
    .replaceAll("from './sensors'", "from './sensors.mjs'");

  await writeFile(outputPath, outputText, "utf8");
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertAlmostEqual(actual, expected, epsilon, label) {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`${label}: expected ${expected} +/- ${epsilon}, got ${actual}`);
  }
}

function assertGreater(actual, threshold, label) {
  if (!(actual > threshold)) {
    throw new Error(`${label}: expected ${actual} > ${threshold}`);
  }
}

function assertThrows(fn, label) {
  let thrown = false;
  try {
    fn();
  } catch {
    thrown = true;
  }

  if (!thrown) {
    throw new Error(`${label}: expected function to throw`);
  }
}
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
await transpileSimModule("sensors.ts", "sensors.mjs");

const { createWorldState, getSectorOffset, spawnAgent } = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);
const { buildSpatialHashGrid, createSpatialHashGrid } = await import(pathToFileURL(join(temporaryDirectory, "spatialHash.mjs")).href);
const {
  SENSOR_SYSTEM_VERSION,
  applyAgentSensors,
  clearAgentSensorOutputs,
  getSensorSectorIndex
} = await import(pathToFileURL(join(temporaryDirectory, "sensors.mjs")).href);

assertEqual(SENSOR_SYSTEM_VERSION, "qubok_evolve.sensors.v1", "sensor system version");
assertEqual(getSensorSectorIndex(1, 0, 1, 0, 8), 0, "forward sector");
assertEqual(getSensorSectorIndex(1, 0, 0, 1, 8), 2, "left sector");
assertEqual(getSensorSectorIndex(1, 0, -1, 0, 8), 4, "back sector");
assertEqual(getSensorSectorIndex(1, 0, 0, -1, 8), 6, "right sector");

const world = createWorldState({ capacity: 8, worldWidth: 200, worldHeight: 200, sectorCount: 8 });
const grid = createSpatialHashGrid({ capacity: 8, worldWidth: 200, worldHeight: 200, cellSize: 20 });

const center = spawnAgent(world, {
  x: 50,
  y: 50,
  headingX: 1,
  headingY: 0,
  visionRadius: 30,
  visionCosHalfCone: Math.cos(Math.PI / 4),
  speciesId: 1
});

spawnAgent(world, {
  x: 60,
  y: 50,
  headingX: 0,
  headingY: 1,
  visionRadius: 0,
  speciesId: 1
});

spawnAgent(world, {
  x: 65,
  y: 55,
  headingX: 1,
  headingY: 0,
  visionRadius: 0,
  speciesId: 2
});

spawnAgent(world, {
  x: 40,
  y: 50,
  visionRadius: 0,
  speciesId: 2
});

spawnAgent(world, {
  x: 100,
  y: 50,
  visionRadius: 0,
  speciesId: 2
});

buildSpatialHashGrid(grid, world);
const stats = applyAgentSensors(world, grid);

assertEqual(stats.checkedCount, 1, "checked count");
assertEqual(stats.skippedNoVisionCount, 4, "skipped no vision count");
assertEqual(stats.visibleNeighborCount, 2, "visible neighbor count");
assertEqual(stats.agentsWithVisibleNeighbors, 1, "agents with visible neighbors");
assertEqual(stats.maxVisibleNeighborsForAgent, 2, "max visible neighbors");

const forwardOffset = getSectorOffset(world, center, 0);
const backOffset = getSectorOffset(world, center, 4);
assertGreater(world.sectorAlly[forwardOffset], 0, "forward ally signal");
assertGreater(world.sectorThreat[forwardOffset], 0, "forward threat signal");
assertEqual(world.sectorThreat[backOffset], 0, "behind threat rejected by cone");
assertAlmostEqual(world.localCentroidX[center], 62.5, 0.0001, "local centroid x");
assertAlmostEqual(world.localCentroidY[center], 52.5, 0.0001, "local centroid y");
assertGreater(-world.separationX[center], 0, "separation x pushes away from forward neighbors");

clearAgentSensorOutputs(world);
assertEqual(world.sectorAlly[forwardOffset], 0, "clear ally buffer");
assertEqual(world.sectorThreat[forwardOffset], 0, "clear threat buffer");
assertEqual(world.localCentroidX[center], 0, "clear centroid x");

assertThrows(() => getSensorSectorIndex(1, 0, 1, 0, 0), "invalid sector count");
assertThrows(() => applyAgentSensors(world, grid, { radiusScale: 0 }), "invalid radius scale");

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
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_sensors_bench");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

for (const moduleName of ["arrays.ts", "rng.ts", "world.ts", "spatialHash.ts", "neighborQuery.ts", "resources.ts", "sensors.ts"]) {
  await transpileSimModule(moduleName, moduleName.replace(".ts", ".mjs"));
}

const { createRng } = await import(pathToFileURL(join(temporaryDirectory, "rng.mjs")).href);
const { createWorldState, spawnRandomAgents } = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);
const { buildSpatialHashGrid, createSpatialHashGrid } = await import(pathToFileURL(join(temporaryDirectory, "spatialHash.mjs")).href);
const { createResourceLayer, rebuildResourceGrid, spawnRandomResources } = await import(pathToFileURL(join(temporaryDirectory, "resources.mjs")).href);
const { applyAgentSensors } = await import(pathToFileURL(join(temporaryDirectory, "sensors.mjs")).href);

const entityCount = 5000;
const resourceCount = 2500;
const world = createWorldState({ capacity: entityCount, worldWidth: 1024, worldHeight: 1024, sectorCount: 8 });
const grid = createSpatialHashGrid({ capacity: entityCount, worldWidth: 1024, worldHeight: 1024, cellSize: 48 });
const resources = createResourceLayer({ capacity: resourceCount, worldWidth: 1024, worldHeight: 1024, cellSize: 48 });
const rng = createRng("qubok_evolve:bench:sensors:m18");
spawnRandomAgents(world, entityCount, rng);
spawnRandomResources(resources, resourceCount, rng);

const gridStart = performance.now();
const gridStats = buildSpatialHashGrid(grid, world);
const gridBuildMs = performance.now() - gridStart;

const resourceGridStart = performance.now();
const resourceStats = rebuildResourceGrid(resources);
const resourceGridBuildMs = performance.now() - resourceGridStart;

const fullStart = performance.now();
const fullStats = applyAgentSensors(world, grid, {
  resources,
  tick: 0,
  foodTickInterval: 1,
  obstacleTickInterval: 1
});
const fullSensorMs = performance.now() - fullStart;

const scheduledStart = performance.now();
const scheduledStats = applyAgentSensors(world, grid, {
  resources,
  tick: 4,
  foodTickInterval: 4,
  obstacleTickInterval: 8
});
const scheduledSensorMs = performance.now() - scheduledStart;

const skippedStart = performance.now();
const skippedStats = applyAgentSensors(world, grid, {
  resources,
  tick: 5,
  foodTickInterval: 4,
  obstacleTickInterval: 8
});
const skippedSensorMs = performance.now() - skippedStart;

await rm(temporaryDirectory, { force: true, recursive: true });

console.log(JSON.stringify({
  bench: "sensors:m18",
  entityCount,
  resourceCount,
  gridBuildMs: round3(gridBuildMs),
  resourceGridBuildMs: round3(resourceGridBuildMs),
  fullSensorMs: round3(fullSensorMs),
  scheduledSensorMs: round3(scheduledSensorMs),
  skippedSensorMs: round3(skippedSensorMs),
  skippedVsFullRatio: round3(skippedSensorMs / Math.max(fullSensorMs, 0.000001)),
  insertedCount: gridStats.insertedCount,
  insertedResourceCount: resourceStats.insertedCount,
  checkedCount: fullStats.checkedCount,
  neighborCandidates: fullStats.neighborCandidates,
  radiusNeighborCount: fullStats.radiusNeighborCount,
  visibleNeighborCount: fullStats.visibleNeighborCount,
  foodVisibleCount: fullStats.foodVisibleCount,
  sectorWritesFull: fullStats.sectorWrites,
  sectorWritesScheduled: scheduledStats.sectorWrites,
  sectorWritesSkipped: skippedStats.sectorWrites,
  foodSectorWritesFull: fullStats.foodSectorWrites,
  foodSectorWritesScheduled: scheduledStats.foodSectorWrites,
  foodSectorWritesSkipped: skippedStats.foodSectorWrites,
  obstacleSectorWritesFull: fullStats.obstacleSectorWrites,
  obstacleSectorWritesScheduled: scheduledStats.obstacleSectorWrites,
  obstacleSectorWritesSkipped: skippedStats.obstacleSectorWrites,
  foodSensorScheduledOnScheduledTick: scheduledStats.foodSensorScheduled,
  obstacleSensorScheduledOnScheduledTick: scheduledStats.obstacleSensorScheduled,
  foodSkippedByCadence: skippedStats.foodSkippedByCadence,
  obstacleSkippedByCadence: skippedStats.obstacleSkippedByCadence,
  allySignalSum: round3(fullStats.allySignalSum),
  threatSignalSum: round3(fullStats.threatSignalSum),
  foodSignalSum: round3(fullStats.foodSignalSum),
  obstacleSignalSum: round3(fullStats.obstacleSignalSum),
  averageVisibleNeighborsPerCheckedAgent: round3(fullStats.averageVisibleNeighborsPerCheckedAgent),
  averageCandidatesPerCheckedAgent: round3(fullStats.averageCandidatesPerCheckedAgent),
  maxVisibleNeighborsForAgent: fullStats.maxVisibleNeighborsForAgent
}, null, 2));

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
    .replaceAll('from "./rng"', 'from "./rng.mjs"')
    .replaceAll("from './rng'", "from './rng.mjs'")
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

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_terrain_sensor_sampling_test");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

for (const moduleName of ["arrays.ts", "world.ts", "spatialHash.ts", "neighborQuery.ts", "resources.ts", "obstacleMask.ts", "terrain.ts", "sensors.ts"]) {
  await transpileSimModule(moduleName, moduleName.replace(".ts", ".mjs"));
}

const { createWorldState, spawnAgent } = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);
const { createSpatialHashGrid, buildSpatialHashGrid } = await import(pathToFileURL(join(temporaryDirectory, "spatialHash.mjs")).href);
const { createTerrainLayer, setTerrainCellMaterial } = await import(pathToFileURL(join(temporaryDirectory, "terrain.mjs")).href);
const { SENSOR_SYSTEM_VERSION, applyAgentSensors } = await import(pathToFileURL(join(temporaryDirectory, "sensors.mjs")).href);

assertEqual(SENSOR_SYSTEM_VERSION, "qubok_evolve.sensors.v5", "sensor system version");

const world = createWorldState({ capacity: 4, worldWidth: 40, worldHeight: 20, sectorCount: 8 });
const grid = createSpatialHashGrid({ capacity: 4, worldWidth: 40, worldHeight: 20, cellSize: 10 });
const terrain = createTerrainLayer({ worldWidth: 40, worldHeight: 20, cellSize: 10 });

setTerrainCellMaterial(terrain, 1, 0, 2);
setTerrainCellMaterial(terrain, 2, 0, 3);

const first = spawnAgent(world, { x: 15, y: 5, visionRadius: 0 });
const second = spawnAgent(world, { x: 25, y: 5, visionRadius: 0 });
const third = spawnAgent(world, { x: 35, y: 5, visionRadius: 0 });
world.alive[third] = 0;

buildSpatialHashGrid(grid, world);

const stats = applyAgentSensors(world, grid, { terrain, tick: 0, terrainTickInterval: 2 });

assertEqual(stats.checkedCount, 0, "checked count remains vision-based");
assertEqual(stats.skippedNoVisionCount, 2, "no-vision alive agents skipped after terrain sample");
assertEqual(stats.skippedDeadCount, 1, "dead count");
assertEqual(stats.terrainSensorScheduled, true, "terrain scheduled");
assertEqual(stats.terrainSkippedByCadence, false, "terrain not skipped");
assertEqual(stats.terrainSensorSampleCount, 2, "terrain sample count only alive agents");
assertEqual(world.terrainCellId[first], 1, "first terrain cell id");
assertEqual(world.terrainCellId[second], 2, "second terrain cell id");
assertAlmostEqual(stats.terrainSensorMovementCostSum, 2.85, 0.00001, "terrain movement cost sum");
assertAlmostEqual(stats.terrainSensorFrictionSum, 1.73, 0.00001, "terrain friction sum");
assertAlmostEqual(stats.terrainSensorDragSum, 0.26, 0.00001, "terrain drag sum");
assertAlmostEqual(stats.terrainSensorResourceAffinitySum, 1.2, 0.00001, "terrain resource affinity sum");

const skipped = applyAgentSensors(world, grid, { terrain, tick: 1, terrainTickInterval: 2 });
assertEqual(skipped.terrainSensorScheduled, false, "terrain not scheduled on cadence skip");
assertEqual(skipped.terrainSkippedByCadence, true, "terrain skipped by cadence");
assertEqual(skipped.terrainSensorSampleCount, 0, "no terrain samples on skipped tick");
assertEqual(world.terrainCellId[first], 1, "first terrain cell preserved on skipped tick");
assertEqual(world.terrainCellId[second], 2, "second terrain cell preserved on skipped tick");

assertThrows(() => applyAgentSensors(world, grid, { terrain, terrainTickInterval: 0 }), "invalid terrain interval");

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("terrain sensor sampling tests passed");

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

function assertEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

function assertAlmostEqual(actual, expected, epsilon, label) {
  if (Math.abs(actual - expected) > epsilon) throw new Error(`${label}: expected ${expected} +/- ${epsilon}, got ${actual}`);
}

function assertThrows(fn, label) {
  let thrown = false;
  try { fn(); } catch { thrown = true; }
  if (!thrown) throw new Error(`${label}: expected function to throw`);
}

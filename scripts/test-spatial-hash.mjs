import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_spatial_hash_test");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

await transpileSimModule("arrays.ts", "arrays.mjs");
await transpileSimModule("world.ts", "world.mjs");
await transpileSimModule("spatialHash.ts", "spatialHash.mjs");

const worldModule = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);
const spatialModule = await import(pathToFileURL(join(temporaryDirectory, "spatialHash.mjs")).href);

const {
  createWorldState,
  killAgent,
  spawnAgent
} = worldModule;

const {
  SPATIAL_HASH_VERSION,
  buildSpatialHashGrid,
  clearSpatialHashGrid,
  collectAgentsInCell,
  createSpatialHashGrid,
  getCellCoordinatesForPosition,
  getCellIdForCoordinates,
  getCellIdForPosition,
  getSpatialHashMemoryBytes
} = spatialModule;

assertEqual(SPATIAL_HASH_VERSION, "qubok_evolve.spatial_hash.v1", "spatial hash version");

const world = createWorldState({ capacity: 8, worldWidth: 100, worldHeight: 100, sectorCount: 8 });
const grid = createSpatialHashGrid({ capacity: 8, worldWidth: 100, worldHeight: 100, cellSize: 10 });

assertEqual(grid.columns, 10, "columns");
assertEqual(grid.rows, 10, "rows");
assertEqual(grid.cellCount, 100, "cell count");
assertEqual(grid.cellHeads[0], -1, "initial empty head");

const a0 = spawnAgent(world, { x: 5, y: 5 });
const a1 = spawnAgent(world, { x: 15, y: 5 });
const a2 = spawnAgent(world, { x: 95, y: 95 });
const a3 = spawnAgent(world, { x: -5, y: 105 });
killAgent(world, a1);

const statsA = buildSpatialHashGrid(grid, world);
assertEqual(statsA.insertedCount, 3, "inserted count A");
assertEqual(statsA.skippedDeadCount, 1, "skipped dead A");
assertEqual(statsA.clampedPositionCount, 1, "clamped positions A");
assertEqual(statsA.usedCellCount, 3, "used cell count A");
assertEqual(statsA.maxCellOccupancy, 1, "max occupancy A");

assertEqual(getCellIdForPosition(grid, 5, 5), 0, "cell id 5,5");
assertEqual(getCellIdForPosition(grid, 15, 5), 1, "cell id 15,5");
assertEqual(getCellIdForPosition(grid, 95, 95), 99, "cell id 95,95");
assertEqual(getCellIdForPosition(grid, -5, 105), 90, "clamped cell id");
assertEqual(getCellIdForCoordinates(grid, -1, 0), -1, "outside coord x");
assertEqual(getCellIdForCoordinates(grid, 0, 10), -1, "outside coord y");
assertEqual(getCellIdForCoordinates(grid, 3, 2), 23, "coord id 3,2");

const clamped = getCellCoordinatesForPosition(grid, -1, 1000);
assertEqual(clamped.cellX, 0, "clamped x coordinate");
assertEqual(clamped.cellY, 9, "clamped y coordinate");
assertEqual(clamped.clamped, true, "clamped flag");

assertArrayEqual(collectAgentsInCell(grid, 0), [a0], "cell 0 contents A");
assertArrayEqual(collectAgentsInCell(grid, 90), [a3], "cell 90 contents A");
assertArrayEqual(collectAgentsInCell(grid, 99), [a2], "cell 99 contents A");
assertArrayEqual(collectAgentsInCell(grid, 1), [], "dead agent not inserted");

const a4 = spawnAgent(world, { x: 7, y: 8 });
const statsB = buildSpatialHashGrid(grid, world);
assertEqual(statsB.insertedCount, 4, "inserted count B");
assertEqual(statsB.usedCellCount, 3, "used cell count B");
assertEqual(statsB.maxCellOccupancy, 2, "max occupancy B");
assertArrayEqual(collectAgentsInCell(grid, 0), [a4, a0], "cell 0 linked list LIFO order");
assertEqual(grid.cellIds[a4], 0, "agent cell id stored");
assertEqual(grid.cellOccupancy[0], 2, "cell 0 occupancy");

const memoryBytes = getSpatialHashMemoryBytes(grid);
if (memoryBytes <= 0) throw new Error(`spatial hash memory must be positive, got ${memoryBytes}`);

clearSpatialHashGrid(grid);
assertEqual(grid.cellHeads[0], -1, "clear cell head");
assertEqual(grid.cellOccupancy[0], 0, "clear occupancy");
assertEqual(grid.cellIds[a0], -1, "clear cell id");

assertThrows(() => createSpatialHashGrid({ capacity: 0, worldWidth: 100, worldHeight: 100, cellSize: 10 }), "invalid capacity");
assertThrows(() => createSpatialHashGrid({ capacity: 8, worldWidth: 100, worldHeight: 100, cellSize: 0 }), "invalid cell size");
assertThrows(() => buildSpatialHashGrid(createSpatialHashGrid({ capacity: 4, worldWidth: 100, worldHeight: 100, cellSize: 10 }), world), "grid too small");
assertThrows(() => buildSpatialHashGrid(createSpatialHashGrid({ capacity: 8, worldWidth: 200, worldHeight: 100, cellSize: 10 }), world), "world mismatch");

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("spatial hash tests passed");

async function transpileSimModule(sourceName, outputName) {
  const sourcePath = join(projectRoot, "src", "sim", sourceName);
  const outputPath = join(temporaryDirectory, outputName);
  const sourceText = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(sourceText, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true }
  });
  const outputText = transpiled.outputText
    .replaceAll('from "./arrays"', 'from "./arrays.mjs"')
    .replaceAll("from './arrays'", "from './arrays.mjs'")
    .replaceAll('from "./world"', 'from "./world.mjs"')
    .replaceAll("from './world'", "from './world.mjs'");
  await writeFile(outputPath, outputText, "utf8");
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

function assertArrayEqual(actual, expected, label) {
  if (actual.length !== expected.length) throw new Error(`${label}: length mismatch ${actual.length} !== ${expected.length}`);
  for (let index = 0; index < actual.length; index += 1) {
    if (actual[index] !== expected[index]) throw new Error(`${label}: index ${index}: expected ${expected[index]}, got ${actual[index]}`);
  }
}

function assertThrows(fn, label) {
  let thrown = false;
  try { fn(); } catch { thrown = true; }
  if (!thrown) throw new Error(`${label}: expected function to throw`);
}
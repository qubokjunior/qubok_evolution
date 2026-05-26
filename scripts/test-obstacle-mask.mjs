import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_obstacle_mask_test");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

await transpileSimModule("arrays.ts", "arrays.mjs");
await transpileSimModule("obstacleMask.ts", "obstacleMask.mjs");

const {
  OBSTACLE_MASK_VERSION,
  clearObstacleMask,
  countOccupiedObstacleCells,
  createObstacleMask,
  getObstacleCellCenterX,
  getObstacleCellCenterY,
  getObstacleCellIdForCoordinates,
  getObstacleCellIdForPosition,
  isObstacleCellOccupied,
  seedDemoObstacleMask,
  setObstacleCell,
  setObstacleRect
} = await import(pathToFileURL(join(temporaryDirectory, "obstacleMask.mjs")).href);

assertEqual(OBSTACLE_MASK_VERSION, "qubok_evolve.obstacle_mask.v1", "obstacle mask version");

const mask = createObstacleMask({ worldWidth: 100, worldHeight: 80, cellSize: 10 });
assertEqual(mask.columns, 10, "columns");
assertEqual(mask.rows, 8, "rows");
assertEqual(mask.cellCount, 80, "cell count");

setObstacleCell(mask, 2, 3, true);
assertEqual(isObstacleCellOccupied(mask, 2, 3), true, "set cell occupied");
assertEqual(mask.occupied[getObstacleCellIdForCoordinates(mask, 2, 3)], 1, "cell id occupancy");
assertEqual(getObstacleCellIdForPosition(mask, 25, 35), getObstacleCellIdForCoordinates(mask, 2, 3), "position cell id");
assertAlmostEqual(getObstacleCellCenterX(mask, 2), 25, 0.0001, "center x");
assertAlmostEqual(getObstacleCellCenterY(mask, 3), 35, 0.0001, "center y");

const fillStats = setObstacleRect(mask, 40, 10, 60, 30, true);
assertGreater(fillStats.changedCellCount, 0, "rect changed cells");
assertGreater(countOccupiedObstacleCells(mask), 1, "occupied after rect");

setObstacleCell(mask, 2, 3, false);
assertEqual(isObstacleCellOccupied(mask, 2, 3), false, "cell cleared");

clearObstacleMask(mask);
assertEqual(countOccupiedObstacleCells(mask), 0, "clear all cells");

const demoStats = seedDemoObstacleMask(mask);
assertGreater(demoStats.occupiedCellCount, 0, "demo obstacle mask occupied cells");

assertThrows(() => createObstacleMask({ worldWidth: 0, worldHeight: 80, cellSize: 10 }), "invalid size");
assertThrows(() => getObstacleCellIdForCoordinates(mask, 10, 0), "invalid cell x");

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("obstacle mask tests passed");

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
    .replaceAll('from "./obstacleMask"', 'from "./obstacleMask.mjs"')
    .replaceAll("from './obstacleMask'", "from './obstacleMask.mjs'");

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

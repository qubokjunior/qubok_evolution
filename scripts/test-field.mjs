import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_field_test");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

for (const moduleName of ["arrays.ts", "field.ts"]) {
  await transpileSimModule(moduleName, moduleName.replace(".ts", ".mjs"));
}

const {
  FIELD_LAYER_VERSION,
  addFieldCellFlow,
  createEnvironmentalFieldLayer,
  fillEnvironmentalField,
  getEnvironmentalFieldMemoryBytes,
  getFieldCellId,
  getFieldCellIdForPosition,
  sampleFieldAtPosition,
  setFieldCell
} = await import(pathToFileURL(join(temporaryDirectory, "field.mjs")).href);

assertEqual(FIELD_LAYER_VERSION, "qubok_evolve.environmental_field.v1", "field version");

const field = createEnvironmentalFieldLayer({ worldWidth: 100, worldHeight: 50, cellSize: 10, defaultFlowX: 0.25, defaultFlowY: -0.5 });
assertEqual(field.columns, 10, "columns");
assertEqual(field.rows, 5, "rows");
assertEqual(field.cellCount, 50, "cell count");
assertGreater(getEnvironmentalFieldMemoryBytes(field), 0, "memory bytes");

const initial = sampleFieldAtPosition(field, 2, 2);
assertAlmostEqual(initial.flowX, 0.25, 0.000001, "default flow x");
assertAlmostEqual(initial.flowY, -0.5, 0.000001, "default flow y");
assertAlmostEqual(initial.flowMagnitude, Math.hypot(0.25, -0.5), 0.000001, "default magnitude");

const cellId = setFieldCell(field, 2, 3, 4, -3);
assertEqual(cellId, getFieldCellId(field, 2, 3), "set cell id");
const sample = sampleFieldAtPosition(field, 25, 35);
assertEqual(sample.cellId, cellId, "sample cell id");
assertEqual(sample.cellX, 2, "sample cell x");
assertEqual(sample.cellY, 3, "sample cell y");
assertAlmostEqual(sample.flowX, 4, 0.000001, "sample flow x");
assertAlmostEqual(sample.flowY, -3, 0.000001, "sample flow y");
assertAlmostEqual(sample.flowMagnitude, 5, 0.000001, "sample magnitude");

addFieldCellFlow(field, 2, 3, 1, 2);
const added = sampleFieldAtPosition(field, 25, 35);
assertAlmostEqual(added.flowX, 5, 0.000001, "added flow x");
assertAlmostEqual(added.flowY, -1, 0.000001, "added flow y");

assertEqual(getFieldCellIdForPosition(field, -100, -100), 0, "low position clamps to first cell");
assertEqual(getFieldCellIdForPosition(field, 10000, 10000), field.cellCount - 1, "high position clamps to last cell");

fillEnvironmentalField(field, -2, 3);
const filled = sampleFieldAtPosition(field, 25, 35);
assertAlmostEqual(filled.flowX, -2, 0.000001, "filled flow x");
assertAlmostEqual(filled.flowY, 3, 0.000001, "filled flow y");

assertThrows(() => createEnvironmentalFieldLayer({ worldWidth: 0, worldHeight: 10, cellSize: 10 }), "invalid world width");
assertThrows(() => createEnvironmentalFieldLayer({ worldWidth: 10, worldHeight: 10, cellSize: 0 }), "invalid cell size");
assertThrows(() => setFieldCell(field, -1, 0, 0, 0), "invalid cell x");
assertThrows(() => sampleFieldAtPosition(field, Number.NaN, 0), "invalid sample x");
assertThrows(() => fillEnvironmentalField(field, Number.POSITIVE_INFINITY, 0), "invalid fill flow");

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("environmental field tests passed");

async function transpileSimModule(sourceName, outputName) {
  const sourcePath = join(projectRoot, "src", "sim", sourceName);
  const outputPath = join(temporaryDirectory, outputName);
  const sourceText = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(sourceText, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true } });
  const outputText = transpiled.outputText
    .replaceAll('from "./arrays"', 'from "./arrays.mjs"')
    .replaceAll("from './arrays'", "from './arrays.mjs'")
    .replaceAll('from "./field"', 'from "./field.mjs"')
    .replaceAll("from './field'", "from './field.mjs'");
  await writeFile(outputPath, outputText, "utf8");
}

function assertEqual(actual, expected, label) { if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`); }
function assertAlmostEqual(actual, expected, epsilon, label) { if (Math.abs(actual - expected) > epsilon) throw new Error(`${label}: expected ${expected} +/- ${epsilon}, got ${actual}`); }
function assertGreater(actual, threshold, label) { if (!(actual > threshold)) throw new Error(`${label}: expected ${actual} > ${threshold}`); }
function assertThrows(fn, label) { let thrown = false; try { fn(); } catch { thrown = true; } if (!thrown) throw new Error(`${label}: expected function to throw`); }

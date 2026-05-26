import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_terrain_test");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });
await transpileSimModule("arrays.ts", "arrays.mjs");
await transpileSimModule("terrain.ts", "terrain.mjs");
const terrainModule = await import(pathToFileURL(join(temporaryDirectory, "terrain.mjs")).href);

const {
  TERRAIN_LAYER_VERSION,
  createTerrainLayer,
  getTerrainCellId,
  getTerrainCellIdForPosition,
  getTerrainMaterialDefinition,
  getTerrainMemoryBytes,
  sampleTerrainAtPosition,
  setTerrainCellMaterial,
  setTerrainRectMaterial
} = terrainModule;

const layer = createTerrainLayer({ worldWidth: 100, worldHeight: 50, cellSize: 10 });
assertEqual(layer.version, TERRAIN_LAYER_VERSION, "terrain version");
assertEqual(layer.columns, 10, "columns");
assertEqual(layer.rows, 5, "rows");
assertEqual(layer.cellCount, 50, "cell count");
assertEqual(layer.materialId[0], 0, "default material id");
assertAlmostEqual(layer.friction[0], 1, 0.00001, "default friction");

const changedCell = setTerrainCellMaterial(layer, 2, 3, 2);
assertEqual(changedCell, getTerrainCellId(layer, 2, 3), "changed cell id");
const waterSample = sampleTerrainAtPosition(layer, 25, 35);
assertEqual(waterSample.cellX, 2, "sample cellX");
assertEqual(waterSample.cellY, 3, "sample cellY");
assertEqual(waterSample.materialId, 2, "sample material id");
assertAlmostEqual(waterSample.friction, 0.55, 0.00001, "water friction");
assertAlmostEqual(waterSample.drag, 0.25, 0.00001, "water drag");

assertEqual(getTerrainCellIdForPosition(layer, -100, -10), 0, "negative position clamps to first cell");
const edgeSample = sampleTerrainAtPosition(layer, 999, 999);
assertEqual(edgeSample.cellX, 9, "edge cellX clamp");
assertEqual(edgeSample.cellY, 4, "edge cellY clamp");

const rectStats = setTerrainRectMaterial(layer, 0, 0, 19, 19, 1);
assertEqual(rectStats.updatedCellCount, 4, "rect updated cells");
assertEqual(rectStats.changedCellCount, 4, "rect changed cells");
assertEqual(sampleTerrainAtPosition(layer, 5, 5).materialId, 1, "rect material sample");

const mud = getTerrainMaterialDefinition(layer, 1);
assertEqual(mud.name, "mud", "material lookup name");
assertThrows(() => getTerrainMaterialDefinition(layer, 999), "unknown material throws");
assertThrows(() => createTerrainLayer({ worldWidth: 100, worldHeight: 50, cellSize: 0 }), "invalid cell size throws");
if (getTerrainMemoryBytes(layer) <= 0) throw new Error("terrain memory bytes must be positive");

const a = createTerrainLayer({ worldWidth: 64, worldHeight: 64, cellSize: 8 });
const b = createTerrainLayer({ worldWidth: 64, worldHeight: 64, cellSize: 8 });
for (let i = 0; i < a.cellCount; i += 1) {
  const x = i % a.columns;
  const y = Math.floor(i / a.columns);
  const materialId = (x + y) % 4;
  setTerrainCellMaterial(a, x, y, materialId);
  setTerrainCellMaterial(b, x, y, materialId);
}
assertEqual(JSON.stringify(Array.from(a.materialId)), JSON.stringify(Array.from(b.materialId)), "deterministic material field");

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("terrain tests passed");

async function transpileSimModule(sourceName, outputName) {
  const sourcePath = join(projectRoot, "src", "sim", sourceName);
  const outputPath = join(temporaryDirectory, outputName);
  const sourceText = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(sourceText, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true } });
  const outputText = transpiled.outputText.replaceAll("from \"./arrays\"", "from \"./arrays.mjs\"");
  await writeFile(outputPath, outputText, "utf8");
}
function assertEqual(actual, expected, label) { if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`); }
function assertAlmostEqual(actual, expected, epsilon, label) { if (Math.abs(actual - expected) > epsilon) throw new Error(`${label}: expected ${expected} +/- ${epsilon}, got ${actual}`); }
function assertThrows(fn, label) { let thrown = false; try { fn(); } catch { thrown = true; } if (!thrown) throw new Error(`${label}: expected function to throw`); }

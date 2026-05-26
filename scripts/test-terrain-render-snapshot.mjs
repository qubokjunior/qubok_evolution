import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_terrain_render_snapshot_test");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });
await transpileSimModule("arrays.ts", "arrays.mjs");
await transpileSimModule("terrain.ts", "terrain.mjs");
await transpileSimModule("terrainRenderSnapshot.ts", "terrainRenderSnapshot.mjs");

const terrainModule = await import(pathToFileURL(join(temporaryDirectory, "terrain.mjs")).href);
const snapshotModule = await import(pathToFileURL(join(temporaryDirectory, "terrainRenderSnapshot.mjs")).href);
const { createTerrainLayer, setTerrainCellMaterial, setTerrainRectMaterial } = terrainModule;
const { TERRAIN_RENDER_SNAPSHOT_VERSION, analyzeTerrainRenderSnapshot, makeTerrainRenderSnapshot } = snapshotModule;

const terrain = createTerrainLayer({ worldWidth: 64, worldHeight: 32, cellSize: 8 });
setTerrainCellMaterial(terrain, 1, 0, 1);
setTerrainCellMaterial(terrain, 2, 0, 2);
setTerrainRectMaterial(terrain, 0, 8, 31, 23, 3);

const beforeMaterialIds = Array.from(terrain.materialId);
const snapshot = makeTerrainRenderSnapshot(terrain);

assertEqual(snapshot.version, TERRAIN_RENDER_SNAPSHOT_VERSION, "snapshot version");
assertEqual(snapshot.terrainVersion, terrain.version, "terrain version pass-through");
assertEqual(snapshot.columns, 8, "columns");
assertEqual(snapshot.rows, 4, "rows");
assertEqual(snapshot.cellCount, 32, "cell count");
assertEqual(snapshot.sampleCellCount, 32, "sample cell count");
assertEqual(snapshot.truncated, false, "not truncated");
assertEqual(snapshot.cellIds[0], 0, "first cell id");
assertEqual(snapshot.cellIds[31], 31, "last cell id");
assertEqual(snapshot.materialIds[1], 1, "material id copied");
assertEqual(snapshot.materialIds[2], 2, "material id copied 2");
assertAlmostEqual(snapshot.movementCost[2], 1.75, 0.00001, "movement cost copied");
assertEqual(JSON.stringify(beforeMaterialIds), JSON.stringify(Array.from(terrain.materialId)), "snapshot does not mutate terrain");

const stats = analyzeTerrainRenderSnapshot(snapshot);
assertEqual(stats.uniqueMaterialCount, 4, "unique material count");
assertEqual(stats.minMaterialId, 0, "min material id");
assertEqual(stats.maxMaterialId, 3, "max material id");
if (stats.averageMovementCost <= 0) throw new Error("average movement cost must be positive");

const limited = makeTerrainRenderSnapshot(terrain, { maxCells: 5 });
assertEqual(limited.sampleCellCount, 5, "limited sample count");
assertEqual(limited.truncated, true, "limited snapshot truncated");
assertEqual(limited.cellIds[4], 4, "limited last id");

const noScalars = makeTerrainRenderSnapshot(terrain, { maxCells: 4, includeScalars: false });
assertEqual(noScalars.sampleCellCount, 4, "no scalar sample count");
assertEqual(noScalars.movementCost[0], 0, "no scalar movement cost zeroed");
assertEqual(noScalars.drag[0], 0, "no scalar drag zeroed");
assertEqual(noScalars.materialIds[2], 2, "material ids still copied without scalars");

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("terrain render snapshot tests passed");

async function transpileSimModule(sourceName, outputName) {
  const sourcePath = join(projectRoot, "src", "sim", sourceName);
  const outputPath = join(temporaryDirectory, outputName);
  const sourceText = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(sourceText, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true } });
  let outputText = transpiled.outputText;
  outputText = outputText.replaceAll('from "./arrays"', 'from "./arrays.mjs"');
  outputText = outputText.replaceAll('from "./terrain"', 'from "./terrain.mjs"');
  await writeFile(outputPath, outputText, "utf8");
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

function assertAlmostEqual(actual, expected, epsilon, label) {
  if (Math.abs(actual - expected) > epsilon) throw new Error(`${label}: expected ${expected} +/- ${epsilon}, got ${actual}`);
}

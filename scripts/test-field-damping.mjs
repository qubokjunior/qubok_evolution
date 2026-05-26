import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_field_damping_test");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

for (const moduleName of ["arrays.ts", "field.ts", "obstacleMask.ts", "terrain.ts", "fieldDamping.ts"]) {
  await transpileSimModule(moduleName, moduleName.replace(".ts", ".mjs"));
}

const { createEnvironmentalFieldLayer, fillEnvironmentalField, sampleFieldAtPosition } = await import(pathToFileURL(join(temporaryDirectory, "field.mjs")).href);
const { createObstacleMask, setObstacleCell } = await import(pathToFileURL(join(temporaryDirectory, "obstacleMask.mjs")).href);
const { createTerrainLayer, setTerrainCellMaterial } = await import(pathToFileURL(join(temporaryDirectory, "terrain.mjs")).href);
const { FIELD_DAMPING_VERSION, applyFieldDamping, applyObstacleFieldDamping, applyTerrainFieldDamping, dampFieldCell, measureFieldMagnitude } = await import(pathToFileURL(join(temporaryDirectory, "fieldDamping.mjs")).href);

assertEqual(FIELD_DAMPING_VERSION, "qubok_evolve.field_damping.m45", "field damping version");

const field = createEnvironmentalFieldLayer({ worldWidth: 40, worldHeight: 40, cellSize: 10, defaultFlowX: 10, defaultFlowY: 0 });
assertAlmostEqual(measureFieldMagnitude(field), 160, 0.00001, "initial magnitude");

const obstacleMask = createObstacleMask({ worldWidth: 40, worldHeight: 40, cellSize: 10 });
setObstacleCell(obstacleMask, 1, 1, true);
const obstacleStats = applyObstacleFieldDamping(field, obstacleMask, { obstacleDamping01: 0.25 });
assertEqual(obstacleStats.sampleCount, 1, "obstacle sample count");
assertEqual(obstacleStats.dampedCellCount, 1, "obstacle damped cell count");
assertAlmostEqual(sampleFieldAtPosition(field, 15, 15).flowX, 7.5, 0.00001, "obstacle damped flow x");
assertAlmostEqual(measureFieldMagnitude(field), 157.5, 0.00001, "obstacle total magnitude");

const terrainField = createEnvironmentalFieldLayer({ worldWidth: 40, worldHeight: 40, cellSize: 10, defaultFlowX: 5, defaultFlowY: 0 });
const terrain = createTerrainLayer({ worldWidth: 40, worldHeight: 40, cellSize: 20 });
setTerrainCellMaterial(terrain, 0, 0, 2);
const terrainStats = applyTerrainFieldDamping(terrainField, terrain, { terrainDampingScale01: 0.5, terrainMaterialDamping01: [0, 0.1, 0.4] });
assertEqual(terrainStats.sampleCount, 1, "terrain sample count");
assertEqual(terrainStats.dampedCellCount, 1, "terrain damped cell count");
assertAlmostEqual(sampleFieldAtPosition(terrainField, 10, 10).flowX, 4, 0.00001, "terrain damped flow x");

const combinedField = createEnvironmentalFieldLayer({ worldWidth: 40, worldHeight: 40, cellSize: 10, defaultFlowX: 2, defaultFlowY: 0 });
const combinedStats = applyFieldDamping(combinedField, { obstacleDamping01: 0.5, terrainDampingScale01: 0.5, terrainMaterialDamping01: [0, 0.2, 0.2] }, obstacleMask, terrain);
assertEqual(combinedStats.obstacleSampleCount, 1, "combined obstacle sample count");
assertEqual(combinedStats.terrainSampleCount, 1, "combined terrain sample count");
assert(combinedStats.totalMagnitudeBefore > combinedStats.totalMagnitudeAfter, "combined damping must reduce magnitude");
assert(combinedStats.totalMagnitudeDamped > 0, "combined damping must report positive damped magnitude");

const disabledField = createEnvironmentalFieldLayer({ worldWidth: 40, worldHeight: 40, cellSize: 10, defaultFlowX: 3, defaultFlowY: 0 });
const disabledStats = applyFieldDamping(disabledField, { enableObstacleDamping: false, enableTerrainDamping: false }, obstacleMask, terrain);
assertEqual(disabledStats.obstacleSampleCount, 0, "disabled obstacle samples");
assertEqual(disabledStats.terrainSampleCount, 0, "disabled terrain samples");
assertAlmostEqual(disabledStats.totalMagnitudeBefore, disabledStats.totalMagnitudeAfter, 0.00001, "disabled keeps magnitude");

const cellField = createEnvironmentalFieldLayer({ worldWidth: 10, worldHeight: 10, cellSize: 10, defaultFlowX: 4, defaultFlowY: 3 });
assertAlmostEqual(dampFieldCell(cellField, 0, 1), 5, 0.00001, "full cell damping returns removed magnitude");
assertAlmostEqual(measureFieldMagnitude(cellField), 0, 0.00001, "full cell damping zeros field");
assertThrows(() => dampFieldCell(cellField, 0, Number.NaN), "nan damping throws");

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("field damping tests passed");

async function transpileSimModule(sourceName, outputName) {
  const sourcePath = join(projectRoot, "src", "sim", sourceName);
  const outputPath = join(temporaryDirectory, outputName);
  const sourceText = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(sourceText, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true } });
  const outputText = transpiled.outputText
    .replaceAll('from "./arrays"', 'from "./arrays.mjs"')
    .replaceAll('from "./field"', 'from "./field.mjs"')
    .replaceAll('from "./obstacleMask"', 'from "./obstacleMask.mjs"')
    .replaceAll('from "./terrain"', 'from "./terrain.mjs"');
  await writeFile(outputPath, outputText, "utf8");
}

function assert(condition, label) { if (!condition) throw new Error(label); }
function assertEqual(actual, expected, label) { if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`); }
function assertAlmostEqual(actual, expected, epsilon, label) { if (Math.abs(actual - expected) > epsilon) throw new Error(`${label}: expected ${expected} +/- ${epsilon}, got ${actual}`); }
function assertThrows(fn, label) { let thrown = false; try { fn(); } catch { thrown = true; } if (!thrown) throw new Error(`${label}: expected function to throw`); }

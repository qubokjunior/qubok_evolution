import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_field_advection_test");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

for (const moduleName of ["arrays.ts", "field.ts", "fieldAdvection.ts"]) {
  await transpileSimModule(moduleName, moduleName.replace(".ts", ".mjs"));
}

const { createEnvironmentalFieldLayer, setFieldCell, sampleFieldAtPosition } = await import(pathToFileURL(join(temporaryDirectory, "field.mjs")).href);
const {
  FIELD_ADVECTION_VERSION,
  DEFAULT_FIELD_ADVECTION_CONFIG,
  advectEnvironmentalField,
  createFieldAdvectionScratch,
  makeFieldAdvectionConfig
} = await import(pathToFileURL(join(temporaryDirectory, "fieldAdvection.mjs")).href);

assertEqual(FIELD_ADVECTION_VERSION, "qubok_evolve.field_advection.m46", "field advection version");
assertEqual(DEFAULT_FIELD_ADVECTION_CONFIG.enabled, true, "default enabled");
assertAlmostEqual(DEFAULT_FIELD_ADVECTION_CONFIG.strength, 1, 0.000001, "default strength");
assertEqual(DEFAULT_FIELD_ADVECTION_CONFIG.substeps, 1, "default substeps");
assertEqual(DEFAULT_FIELD_ADVECTION_CONFIG.boundaryMode, "clamp", "default boundary");

const clampedConfig = makeFieldAdvectionConfig({ strength: -2, substeps: 50, boundaryMode: "wrap", minActiveMagnitude: -1 });
assertAlmostEqual(clampedConfig.strength, 0, 0.000001, "strength clamp low");
assertEqual(clampedConfig.substeps, 16, "substeps clamp high");
assertEqual(clampedConfig.boundaryMode, "wrap", "wrap boundary accepted");
assertAlmostEqual(clampedConfig.minActiveMagnitude, 0, 0.000001, "min active clamp low");

const noOp = createEnvironmentalFieldLayer({ worldWidth: 30, worldHeight: 10, cellSize: 10 });
setFieldCell(noOp, 1, 0, 7, 0);
const noOpMetrics = advectEnvironmentalField(noOp, 1, { strength: 0 });
assertEqual(noOpMetrics.sampleCount, 0, "zero strength sample count");
assertAlmostEqual(sampleFieldAtPosition(noOp, 15, 5).flowX, 7, 0.00001, "zero strength no-op x");
assertAlmostEqual(noOpMetrics.totalMagnitudeDelta, 0, 0.00001, "zero strength magnitude delta");

const zeroVelocity = createEnvironmentalFieldLayer({ worldWidth: 30, worldHeight: 10, cellSize: 10 });
const velocityZero = createEnvironmentalFieldLayer({ worldWidth: 30, worldHeight: 10, cellSize: 10 });
setFieldCell(zeroVelocity, 1, 0, 5, 0);
const zeroVelocityMetrics = advectEnvironmentalField(zeroVelocity, 1, {}, createFieldAdvectionScratch(zeroVelocity), velocityZero);
assertEqual(zeroVelocityMetrics.sampleCount, 3, "zero velocity still samples destination cells");
assertAlmostEqual(sampleFieldAtPosition(zeroVelocity, 15, 5).flowX, 5, 0.00001, "zero velocity no-op x");
assertAlmostEqual(zeroVelocityMetrics.totalMagnitudeDelta, 0, 0.00001, "zero velocity magnitude delta");

const transported = createEnvironmentalFieldLayer({ worldWidth: 30, worldHeight: 10, cellSize: 10 });
const constantVelocity = createEnvironmentalFieldLayer({ worldWidth: 30, worldHeight: 10, cellSize: 10, defaultFlowX: 10, defaultFlowY: 0 });
setFieldCell(transported, 0, 0, 8, 0);
const transportMetrics = advectEnvironmentalField(transported, 1, { strength: 1, boundaryMode: "clamp", minActiveMagnitude: 0.000001 }, createFieldAdvectionScratch(transported), constantVelocity);
assertEqual(transportMetrics.sampleCount, 3, "transport sample count");
assertEqual(transportMetrics.advectedCellCount, 2, "transport changed source and target cells");
assertAlmostEqual(transportMetrics.maxBacktraceDistanceCells, 1, 0.00001, "transport backtrace distance");
assertAlmostEqual(sampleFieldAtPosition(transported, 5, 5).flowX, 8, 0.00001, "clamp keeps left edge source");
assertAlmostEqual(sampleFieldAtPosition(transported, 15, 5).flowX, 8, 0.00001, "constant flow transports source right");
assertAlmostEqual(sampleFieldAtPosition(transported, 25, 5).flowX, 0, 0.00001, "far cell remains empty");
assertFinite(transportMetrics.totalMagnitudeAfter, "transport magnitude finite");

const wrapTransport = createEnvironmentalFieldLayer({ worldWidth: 30, worldHeight: 10, cellSize: 10 });
const wrapVelocity = createEnvironmentalFieldLayer({ worldWidth: 30, worldHeight: 10, cellSize: 10, defaultFlowX: 10, defaultFlowY: 0 });
setFieldCell(wrapTransport, 2, 0, 4, 0);
advectEnvironmentalField(wrapTransport, 1, { boundaryMode: "wrap" }, createFieldAdvectionScratch(wrapTransport), wrapVelocity);
assertAlmostEqual(sampleFieldAtPosition(wrapTransport, 0, 5).flowX, 4, 0.00001, "wrap transports right edge to left edge");

const first = createEnvironmentalFieldLayer({ worldWidth: 40, worldHeight: 20, cellSize: 10 });
const second = createEnvironmentalFieldLayer({ worldWidth: 40, worldHeight: 20, cellSize: 10 });
const velocity = createEnvironmentalFieldLayer({ worldWidth: 40, worldHeight: 20, cellSize: 10, defaultFlowX: 5, defaultFlowY: 0 });
setFieldCell(first, 1, 1, 3, 4);
setFieldCell(second, 1, 1, 3, 4);
const metricsA = advectEnvironmentalField(first, 0.5, { substeps: 2 }, createFieldAdvectionScratch(first), velocity);
const metricsB = advectEnvironmentalField(second, 0.5, { substeps: 2 }, createFieldAdvectionScratch(second), velocity);
assertAlmostEqual(metricsA.totalMagnitudeAfter, metricsB.totalMagnitudeAfter, 0.00001, "deterministic total magnitude");
for (let y = 0; y < first.rows; y += 1) {
  for (let x = 0; x < first.columns; x += 1) {
    assertAlmostEqual(sampleFieldAtPosition(first, x * 10 + 5, y * 10 + 5).flowX, sampleFieldAtPosition(second, x * 10 + 5, y * 10 + 5).flowX, 0.00001, `deterministic x ${x},${y}`);
    assertAlmostEqual(sampleFieldAtPosition(first, x * 10 + 5, y * 10 + 5).flowY, sampleFieldAtPosition(second, x * 10 + 5, y * 10 + 5).flowY, 0.00001, `deterministic y ${x},${y}`);
  }
}

assertThrows(() => advectEnvironmentalField(first, -1), "negative delta throws");
assertThrows(() => advectEnvironmentalField(first, Number.NaN), "nan delta throws");
assertThrows(() => advectEnvironmentalField(first, 1, {}, { flowX: new Float32Array(1), flowY: new Float32Array(1) }), "bad scratch throws");
assertThrows(() => advectEnvironmentalField(first, 1, {}, createFieldAdvectionScratch(first), createEnvironmentalFieldLayer({ worldWidth: 20, worldHeight: 20, cellSize: 10 })), "bad velocity layer throws");

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("field advection tests passed");

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
function assertFinite(actual, label) { if (!Number.isFinite(actual)) throw new Error(`${label}: expected finite number, got ${actual}`); }
function assertThrows(fn, label) { let thrown = false; try { fn(); } catch { thrown = true; } if (!thrown) throw new Error(`${label}: expected function to throw`); }

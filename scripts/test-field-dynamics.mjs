import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_field_dynamics_test");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

for (const moduleName of ["arrays.ts", "field.ts", "fieldDynamics.ts"]) {
  await transpileSimModule(moduleName, moduleName.replace(".ts", ".mjs"));
}

const { createEnvironmentalFieldLayer, setFieldCell, sampleFieldAtPosition } = await import(pathToFileURL(join(temporaryDirectory, "field.mjs")).href);
const {
  FIELD_DYNAMICS_VERSION,
  DEFAULT_FIELD_DYNAMICS_CONFIG,
  createFieldDynamicsScratch,
  makeFieldDynamicsConfig,
  stepEnvironmentalFieldDynamics
} = await import(pathToFileURL(join(temporaryDirectory, "fieldDynamics.mjs")).href);

assertEqual(FIELD_DYNAMICS_VERSION, "qubok_evolve.field_dynamics.m42", "field dynamics version");
assertAlmostEqual(DEFAULT_FIELD_DYNAMICS_CONFIG.decayPerSecond, 0.05, 0.000001, "default decay");
assertAlmostEqual(DEFAULT_FIELD_DYNAMICS_CONFIG.diffusionRatePerSecond, 0.15, 0.000001, "default diffusion");
assertAlmostEqual(DEFAULT_FIELD_DYNAMICS_CONFIG.minActiveMagnitude, 0.0001, 0.000001, "default min active magnitude");

const config = makeFieldDynamicsConfig({ decayPerSecond: -1, diffusionRatePerSecond: 100, minActiveMagnitude: -3 });
assertAlmostEqual(config.decayPerSecond, 0, 0.000001, "decay clamp low");
assertAlmostEqual(config.diffusionRatePerSecond, 64, 0.000001, "diffusion clamp high");
assertAlmostEqual(config.minActiveMagnitude, 0, 0.000001, "min active clamp low");

const decayOnly = createEnvironmentalFieldLayer({ worldWidth: 30, worldHeight: 10, cellSize: 10 });
setFieldCell(decayOnly, 1, 0, 10, 0);
const decayMetrics = stepEnvironmentalFieldDynamics(decayOnly, 1, { decayPerSecond: 0.2, diffusionRatePerSecond: 0 });
assertEqual(decayMetrics.activeCellCount, 1, "decay active cells");
assertAlmostEqual(decayMetrics.decayFactor, 0.8, 0.000001, "decay factor");
assertAlmostEqual(sampleFieldAtPosition(decayOnly, 15, 5).flowX, 8, 0.00001, "decayed center x");
assertAlmostEqual(decayMetrics.totalMagnitudeBefore, 10, 0.00001, "decay magnitude before");
assertAlmostEqual(decayMetrics.totalMagnitudeAfter, 8, 0.00001, "decay magnitude after");
assertAlmostEqual(decayMetrics.decayMagnitudeLoss, 2, 0.00001, "decay magnitude loss");

const diffusionOnly = createEnvironmentalFieldLayer({ worldWidth: 30, worldHeight: 30, cellSize: 10 });
setFieldCell(diffusionOnly, 1, 1, 10, 0);
const scratch = createFieldDynamicsScratch(diffusionOnly);
const diffusionMetrics = stepEnvironmentalFieldDynamics(diffusionOnly, 1, { decayPerSecond: 0, diffusionRatePerSecond: 0.4, minActiveMagnitude: 0.000001 }, scratch);
assertEqual(diffusionMetrics.activeCellCount, 1, "diffusion active cells");
assertEqual(diffusionMetrics.diffusionTransferCount, 12, "diffusion transfer attempts for all cells in 3x3 grid");
assertAlmostEqual(diffusionMetrics.diffusionAlpha, 0.4, 0.000001, "diffusion alpha");
assertAlmostEqual(sampleFieldAtPosition(diffusionOnly, 15, 15).flowX, 6, 0.00001, "diffusion retained center x");
assertAlmostEqual(sampleFieldAtPosition(diffusionOnly, 5, 15).flowX, 1, 0.00001, "diffusion left x");
assertAlmostEqual(sampleFieldAtPosition(diffusionOnly, 25, 15).flowX, 1, 0.00001, "diffusion right x");
assertAlmostEqual(sampleFieldAtPosition(diffusionOnly, 15, 5).flowX, 1, 0.00001, "diffusion up x");
assertAlmostEqual(sampleFieldAtPosition(diffusionOnly, 15, 25).flowX, 1, 0.00001, "diffusion down x");
assertAlmostEqual(diffusionMetrics.totalMagnitudeBefore, 10, 0.00001, "diffusion magnitude before");
assertAlmostEqual(diffusionMetrics.totalMagnitudeAfter, 10, 0.00001, "diffusion magnitude conserved for aligned flow");

const corner = createEnvironmentalFieldLayer({ worldWidth: 20, worldHeight: 20, cellSize: 10 });
setFieldCell(corner, 0, 0, 4, 0);
stepEnvironmentalFieldDynamics(corner, 1, { decayPerSecond: 0, diffusionRatePerSecond: 0.5 });
assertAlmostEqual(sampleFieldAtPosition(corner, 5, 5).flowX, 2, 0.00001, "corner retained x");
assertAlmostEqual(sampleFieldAtPosition(corner, 15, 5).flowX, 1, 0.00001, "corner right share x");
assertAlmostEqual(sampleFieldAtPosition(corner, 5, 15).flowX, 1, 0.00001, "corner down share x");

assertThrows(() => stepEnvironmentalFieldDynamics(corner, -1), "negative delta throws");
assertThrows(() => stepEnvironmentalFieldDynamics(corner, Number.NaN), "nan delta throws");
assertThrows(() => stepEnvironmentalFieldDynamics(corner, 1, {}, { flowX: new Float32Array(1), flowY: new Float32Array(1) }), "bad scratch throws");

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("field dynamics tests passed");

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
function assertThrows(fn, label) { let thrown = false; try { fn(); } catch { thrown = true; } if (!thrown) throw new Error(`${label}: expected function to throw`); }

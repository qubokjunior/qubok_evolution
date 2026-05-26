import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_field_sources_test");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

for (const moduleName of ["arrays.ts", "field.ts", "fieldSources.ts"]) {
  await transpileSimModule(moduleName, moduleName.replace(".ts", ".mjs"));
}

const { createEnvironmentalFieldLayer, sampleFieldAtPosition, setFieldCell } = await import(pathToFileURL(join(temporaryDirectory, "field.mjs")).href);
const {
  FIELD_SOURCES_VERSION,
  emitFieldPointSource,
  absorbFieldPointSink,
  applyFieldSourcesAndSinks,
  measureTotalFieldMagnitude
} = await import(pathToFileURL(join(temporaryDirectory, "fieldSources.mjs")).href);

assertEqual(FIELD_SOURCES_VERSION, "qubok_evolve.field_sources.m43", "field sources version");

const field = createEnvironmentalFieldLayer({ worldWidth: 40, worldHeight: 40, cellSize: 10 });
const sourceCell = emitFieldPointSource(field, { x: 15, y: 15, flowX: 2, flowY: 3, strength: 2 });
assertEqual(sourceCell, 5, "point source cell id");
assertAlmostEqual(sampleFieldAtPosition(field, 15, 15).flowX, 4, 0.00001, "source flow x");
assertAlmostEqual(sampleFieldAtPosition(field, 15, 15).flowY, 6, 0.00001, "source flow y");

const sinkCell = absorbFieldPointSink(field, { x: 15, y: 15, absorption01: 0.25 });
assertEqual(sinkCell, 5, "point sink cell id");
assertAlmostEqual(sampleFieldAtPosition(field, 15, 15).flowX, 3, 0.00001, "sink flow x");
assertAlmostEqual(sampleFieldAtPosition(field, 15, 15).flowY, 4.5, 0.00001, "sink flow y");

absorbFieldPointSink(field, { x: 15, y: 15, absorption01: 2 });
assertAlmostEqual(sampleFieldAtPosition(field, 15, 15).flowX, 0, 0.00001, "sink clamp high x");
assertAlmostEqual(sampleFieldAtPosition(field, 15, 15).flowY, 0, 0.00001, "sink clamp high y");

const combined = createEnvironmentalFieldLayer({ worldWidth: 30, worldHeight: 30, cellSize: 10 });
setFieldCell(combined, 2, 2, 10, 0);
const metrics = applyFieldSourcesAndSinks(
  combined,
  [
    { x: 5, y: 5, flowX: 1, flowY: 0 },
    { x: 6, y: 6, flowX: 0, flowY: 2 },
    { x: 15, y: 15, flowX: 3, flowY: 4, strength: 0.5 }
  ],
  [
    { x: 25, y: 25, absorption01: 0.4 },
    { x: 15, y: 15, absorption01: 0.2 }
  ]
);

assertEqual(metrics.sourceCount, 3, "source count");
assertEqual(metrics.sinkCount, 2, "sink count");
assertEqual(metrics.emittedCellCount, 2, "emitted cell count");
assertEqual(metrics.absorbedCellCount, 2, "absorbed cell count");
assertAlmostEqual(metrics.totalFlowXEmitted, 2.5, 0.00001, "total emitted x");
assertAlmostEqual(metrics.totalFlowYEmitted, 4, 0.00001, "total emitted y");
assertAlmostEqual(metrics.totalMagnitudeEmitted, 5.5, 0.00001, "total emitted magnitude");
assertAlmostEqual(metrics.totalMagnitudeAbsorbed, 4 + Math.hypot(1.5, 2) * 0.2, 0.00001, "total absorbed magnitude");
assertAlmostEqual(sampleFieldAtPosition(combined, 25, 25).flowX, 6, 0.00001, "sink absorbed existing x");
assertAlmostEqual(sampleFieldAtPosition(combined, 15, 15).flowX, 1.2, 0.00001, "sink absorbed emitted x");
assertAlmostEqual(sampleFieldAtPosition(combined, 15, 15).flowY, 1.6, 0.00001, "sink absorbed emitted y");
assertAlmostEqual(metrics.totalMagnitudeAfter, measureTotalFieldMagnitude(combined), 0.00001, "total magnitude after matches measurement");

const emptyMetrics = applyFieldSourcesAndSinks(combined);
assertEqual(emptyMetrics.sourceCount, 0, "empty source count");
assertEqual(emptyMetrics.sinkCount, 0, "empty sink count");
assertAlmostEqual(emptyMetrics.totalMagnitudeAfter, measureTotalFieldMagnitude(combined), 0.00001, "empty total after");

assertThrows(() => emitFieldPointSource(combined, { x: Number.NaN, y: 0, flowX: 1, flowY: 0 }), "nan source throws");
assertThrows(() => absorbFieldPointSink(combined, { x: 0, y: 0, absorption01: Number.NaN }), "nan sink throws");

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("field sources tests passed");

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

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_field_render_snapshot_test");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });
await transpileSimModule("arrays.ts", "arrays.mjs");
await transpileSimModule("field.ts", "field.mjs");
await transpileSimModule("fieldRenderSnapshot.ts", "fieldRenderSnapshot.mjs");

const fieldModule = await import(pathToFileURL(join(temporaryDirectory, "field.mjs")).href);
const snapshotModule = await import(pathToFileURL(join(temporaryDirectory, "fieldRenderSnapshot.mjs")).href);
const { createEnvironmentalFieldLayer, setFieldCell } = fieldModule;
const { FIELD_RENDER_SNAPSHOT_VERSION, analyzeFieldRenderSnapshot, makeFieldRenderSnapshot } = snapshotModule;

const field = createEnvironmentalFieldLayer({ worldWidth: 64, worldHeight: 32, cellSize: 8 });
setFieldCell(field, 0, 0, 3, 4);
setFieldCell(field, 2, 0, 0, 2);
setFieldCell(field, 4, 2, -6, 8);

const snapshot = makeFieldRenderSnapshot(field);
assertEqual(snapshot.version, FIELD_RENDER_SNAPSHOT_VERSION, "snapshot version");
assertEqual(snapshot.fieldVersion, field.version, "field version pass-through");
assertEqual(snapshot.columns, 8, "columns");
assertEqual(snapshot.rows, 4, "rows");
assertEqual(snapshot.cellCount, 32, "cell count");
assertEqual(snapshot.sampleVectorCount, 32, "sample vector count");
assertEqual(snapshot.truncated, false, "not truncated");
assertEqual(snapshot.cellIds[0], 0, "first cell id");
assertAlmostEqual(snapshot.centerX[0], 4, 0.00001, "first center x");
assertAlmostEqual(snapshot.centerY[0], 4, 0.00001, "first center y");
assertAlmostEqual(snapshot.flowX[0], 3, 0.00001, "first flow x");
assertAlmostEqual(snapshot.flowY[0], 4, 0.00001, "first flow y");
assertAlmostEqual(snapshot.magnitude[0], 5, 0.00001, "first magnitude");

const stats = analyzeFieldRenderSnapshot(snapshot);
assertEqual(stats.vectorCount, 32, "stats vector count");
assertGreater(stats.maxMagnitude, 9.999, "stats max magnitude");
assertAlmostEqual(stats.flowXSum, -3, 0.00001, "stats flow x sum");
assertAlmostEqual(stats.flowYSum, 14, 0.00001, "stats flow y sum");

const strided = makeFieldRenderSnapshot(field, { stride: 2, minMagnitude: 0.01 });
assertEqual(strided.stride, 2, "stride value");
assertEqual(strided.sampleVectorCount, 2, "strided non-zero vector count");
assertEqual(strided.cellIds[0], 0, "strided first id");
assertEqual(strided.cellIds[1], 20, "strided second id");

const limited = makeFieldRenderSnapshot(field, { maxVectors: 1, minMagnitude: 0.01 });
assertEqual(limited.sampleVectorCount, 1, "limited sample count");
assertEqual(limited.truncated, true, "limited truncated");

const empty = makeFieldRenderSnapshot(field, { minMagnitude: 100 });
assertEqual(empty.sampleVectorCount, 0, "empty sample count");
assertEqual(analyzeFieldRenderSnapshot(empty).averageMagnitude, 0, "empty average magnitude");

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("field render snapshot tests passed");

async function transpileSimModule(sourceName, outputName) {
  const sourceText = await readFile(join(projectRoot, "src", "sim", sourceName), "utf8");
  const transpiled = ts.transpileModule(sourceText, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true } });
  const outputText = transpiled.outputText
    .replaceAll('from "./arrays"', 'from "./arrays.mjs"')
    .replaceAll('from "./field"', 'from "./field.mjs"')
    .replaceAll('from "./fieldRenderSnapshot"', 'from "./fieldRenderSnapshot.mjs"');
  await writeFile(join(temporaryDirectory, outputName), outputText, "utf8");
}

function assertEqual(actual, expected, label) { if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`); }
function assertAlmostEqual(actual, expected, epsilon, label) { if (Math.abs(actual - expected) > epsilon) throw new Error(`${label}: expected ${expected} +/- ${epsilon}, got ${actual}`); }
function assertGreater(actual, threshold, label) { if (!(actual > threshold)) throw new Error(`${label}: expected ${actual} > ${threshold}`); }

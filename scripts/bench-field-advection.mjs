import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = process.cwd();
const tmp = join(root, ".tmp_field_advection_bench");

await rm(tmp, { force: true, recursive: true });
await mkdir(tmp, { recursive: true });
for (const name of ["arrays.ts", "field.ts", "fieldAdvection.ts"]) await transpile(name, name.replace(".ts", ".mjs"));

const { createEnvironmentalFieldLayer } = await import(pathToFileURL(join(tmp, "field.mjs")).href);
const { advectEnvironmentalField, createFieldAdvectionScratch } = await import(pathToFileURL(join(tmp, "fieldAdvection.mjs")).href);

const scenarios = [
  ["64x64 / substeps 1", 64, 1, 160],
  ["128x128 / substeps 1", 128, 1, 80],
  ["128x128 / substeps 4", 128, 4, 32]
];

console.table(scenarios.map(([label, size, substeps, iterations]) => run(label, size, substeps, iterations)));
await rm(tmp, { force: true, recursive: true });
console.log("field advection benchmark complete");

function run(label, size, substeps, iterations) {
  const cellSize = 10;
  const field = createEnvironmentalFieldLayer({ worldWidth: size * cellSize, worldHeight: size * cellSize, cellSize });
  const velocity = createEnvironmentalFieldLayer({ worldWidth: size * cellSize, worldHeight: size * cellSize, cellSize });
  seed(field, velocity, size);
  const scratch = createFieldAdvectionScratch(field);
  let metrics = advectEnvironmentalField(field, 1 / 60, { substeps, minActiveMagnitude: 0.000001 }, scratch, velocity);
  for (let i = 0; i < 8; i += 1) metrics = advectEnvironmentalField(field, 1 / 60, { substeps, minActiveMagnitude: 0.000001 }, scratch, velocity);
  const start = performance.now();
  for (let i = 0; i < iterations; i += 1) metrics = advectEnvironmentalField(field, 1 / 60, { substeps, minActiveMagnitude: 0.000001 }, scratch, velocity);
  const avg = (performance.now() - start) / iterations;
  if (!Number.isFinite(metrics.totalMagnitudeAfter)) throw new Error(label + ": non-finite magnitude");
  if (metrics.sampleCount !== field.cellCount * substeps) throw new Error(label + ": bad sample count");
  return { scenario: label, cells: field.cellCount, iterations, avg_ms: round3(avg), samples: metrics.sampleCount, changed: metrics.advectedCellCount, mag_before: round3(metrics.totalMagnitudeBefore), mag_after: round3(metrics.totalMagnitudeAfter), mag_delta: round3(metrics.totalMagnitudeDelta) };
}

function seed(field, velocity, size) {
  const half = (size - 1) * 0.5;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const id = y * size + x;
      const dx = (x - half) / Math.max(1, half);
      const dy = (y - half) / Math.max(1, half);
      const falloff = Math.max(0, 1 - Math.hypot(dx, dy));
      field.flowX[id] = falloff * 3 + Math.sin(x * 0.17) * 0.25;
      field.flowY[id] = falloff * 2 + Math.cos(y * 0.19) * 0.25;
      velocity.flowX[id] = 4 - dy * 3;
      velocity.flowY[id] = dx * 3;
    }
  }
}

async function transpile(sourceName, outputName) {
  const sourceText = await readFile(join(root, "src", "sim", sourceName), "utf8");
  const out = ts.transpileModule(sourceText, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true } }).outputText
    .replaceAll('from "./arrays"', 'from "./arrays.mjs"')
    .replaceAll("from './arrays'", "from './arrays.mjs'")
    .replaceAll('from "./field"', 'from "./field.mjs"')
    .replaceAll("from './field'", "from './field.mjs'");
  await writeFile(join(tmp, outputName), out, "utf8");
}

function round3(value) { return Math.round(value * 1000) / 1000; }

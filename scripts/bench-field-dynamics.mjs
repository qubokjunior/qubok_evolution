import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_field_dynamics_bench");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

for (const moduleName of ["arrays.ts", "field.ts", "fieldDynamics.ts"]) {
  await transpileSimModule(moduleName, moduleName.replace(".ts", ".mjs"));
}

const { createEnvironmentalFieldLayer, setFieldCell } = await import(pathToFileURL(join(temporaryDirectory, "field.mjs")).href);
const { createFieldDynamicsScratch, stepEnvironmentalFieldDynamics } = await import(pathToFileURL(join(temporaryDirectory, "fieldDynamics.mjs")).href);

const field = createEnvironmentalFieldLayer({ worldWidth: 4096, worldHeight: 4096, cellSize: 32 });
const scratch = createFieldDynamicsScratch(field);

for (let cellY = 0; cellY < field.rows; cellY += 1) {
  for (let cellX = 0; cellX < field.columns; cellX += 1) {
    const wave = Math.sin(cellX * 0.13) + Math.cos(cellY * 0.17);
    setFieldCell(field, cellX, cellY, Math.sin(wave) * 3, Math.cos(wave) * 3);
  }
}

const iterations = 240;
let lastMetrics = null;
const start = performance.now();
for (let index = 0; index < iterations; index += 1) {
  lastMetrics = stepEnvironmentalFieldDynamics(field, 1 / 60, { decayPerSecond: 0.03, diffusionRatePerSecond: 0.18, minActiveMagnitude: 0.0001 }, scratch);
}
const elapsedMs = performance.now() - start;

await rm(temporaryDirectory, { force: true, recursive: true });
console.log(JSON.stringify({
  benchmark: "field-dynamics",
  cells: field.cellCount,
  iterations,
  elapsedMs: round(elapsedMs),
  msPerStep: round(elapsedMs / iterations),
  stepsPerSecond: round(iterations / (elapsedMs / 1000)),
  activeCellCount: lastMetrics?.activeCellCount ?? 0,
  updatedCellCount: lastMetrics?.updatedCellCount ?? 0,
  diffusionTransferCount: lastMetrics?.diffusionTransferCount ?? 0,
  totalMagnitudeAfter: round(lastMetrics?.totalMagnitudeAfter ?? 0)
}, null, 2));

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

function round(value) {
  return Math.round(value * 1000) / 1000;
}

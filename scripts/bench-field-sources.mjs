import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_field_sources_bench");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

for (const moduleName of ["arrays.ts", "field.ts", "fieldSources.ts"]) {
  await transpileSimModule(moduleName, moduleName.replace(".ts", ".mjs"));
}

const { createEnvironmentalFieldLayer } = await import(pathToFileURL(join(temporaryDirectory, "field.mjs")).href);
const { applyFieldSourcesAndSinks } = await import(pathToFileURL(join(temporaryDirectory, "fieldSources.mjs")).href);

const field = createEnvironmentalFieldLayer({ worldWidth: 4096, worldHeight: 4096, cellSize: 32 });
const sourceCount = 4096;
const sinkCount = 2048;
const sources = [];
const sinks = [];

for (let index = 0; index < sourceCount; index += 1) {
  sources.push({
    x: (index * 37) % field.worldWidth,
    y: (index * 53) % field.worldHeight,
    flowX: Math.sin(index * 0.017),
    flowY: Math.cos(index * 0.019),
    strength: 0.75 + (index % 8) * 0.125
  });
}

for (let index = 0; index < sinkCount; index += 1) {
  sinks.push({
    x: (index * 61) % field.worldWidth,
    y: (index * 29) % field.worldHeight,
    absorption01: 0.05 + (index % 5) * 0.03
  });
}

const iterations = 180;
let lastMetrics = null;
const start = performance.now();
for (let index = 0; index < iterations; index += 1) {
  lastMetrics = applyFieldSourcesAndSinks(field, sources, sinks);
}
const elapsedMs = performance.now() - start;

await rm(temporaryDirectory, { force: true, recursive: true });
console.log(JSON.stringify({
  benchmark: "field-sources",
  cells: field.cellCount,
  sourceCount,
  sinkCount,
  iterations,
  elapsedMs: round(elapsedMs),
  msPerStep: round(elapsedMs / iterations),
  stepsPerSecond: round(iterations / (elapsedMs / 1000)),
  emittedCellCount: lastMetrics?.emittedCellCount ?? 0,
  absorbedCellCount: lastMetrics?.absorbedCellCount ?? 0,
  totalMagnitudeEmitted: round(lastMetrics?.totalMagnitudeEmitted ?? 0),
  totalMagnitudeAbsorbed: round(lastMetrics?.totalMagnitudeAbsorbed ?? 0),
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

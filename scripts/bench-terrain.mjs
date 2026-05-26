import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_terrain_bench");
await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });
await transpileSimModule("arrays.ts", "arrays.mjs");
await transpileSimModule("terrain.ts", "terrain.mjs");
const terrainModule = await import(pathToFileURL(join(temporaryDirectory, "terrain.mjs")).href);
const { createTerrainLayer, sampleTerrainAtPosition, setTerrainCellMaterial } = terrainModule;
const layer = createTerrainLayer({ worldWidth: 2048, worldHeight: 2048, cellSize: 16 });
for (let y = 0; y < layer.rows; y += 1) { for (let x = 0; x < layer.columns; x += 1) setTerrainCellMaterial(layer, x, y, (x * 3 + y * 5) % 4); }
const sampleCount = 200000;
let checksum = 0;
const start = performance.now();
for (let i = 0; i < sampleCount; i += 1) {
  const sample = sampleTerrainAtPosition(layer, (i * 17) % 2048, (i * 31) % 2048);
  checksum = (checksum + sample.materialId + Math.round(sample.movementCost * 100)) >>> 0;
}
const elapsedMs = performance.now() - start;
console.log(JSON.stringify({ bench: "bench-terrain:m32", sampleCount, columns: layer.columns, rows: layer.rows, cellCount: layer.cellCount, elapsedMs: round(elapsedMs), samplesPerSecond: Math.round(sampleCount / (elapsedMs / 1000)), checksum }, null, 2));
await rm(temporaryDirectory, { force: true, recursive: true });
async function transpileSimModule(sourceName, outputName) {
  const sourcePath = join(projectRoot, "src", "sim", sourceName);
  const outputPath = join(temporaryDirectory, outputName);
  const sourceText = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(sourceText, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true } });
  const outputText = transpiled.outputText.replaceAll("from \"./arrays\"", "from \"./arrays.mjs\"");
  await writeFile(outputPath, outputText, "utf8");
}
function round(value) { return Math.round(value * 1000) / 1000; }

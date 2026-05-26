import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_terrain_render_snapshot_bench");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });
await transpileSimModule("arrays.ts", "arrays.mjs");
await transpileSimModule("terrain.ts", "terrain.mjs");
await transpileSimModule("terrainRenderSnapshot.ts", "terrainRenderSnapshot.mjs");

const terrainModule = await import(pathToFileURL(join(temporaryDirectory, "terrain.mjs")).href);
const snapshotModule = await import(pathToFileURL(join(temporaryDirectory, "terrainRenderSnapshot.mjs")).href);
const { createTerrainLayer, setTerrainCellMaterial } = terrainModule;
const { analyzeTerrainRenderSnapshot, makeTerrainRenderSnapshot } = snapshotModule;

const terrain = createTerrainLayer({ worldWidth: 2048, worldHeight: 2048, cellSize: 16 });
for (let y = 0; y < terrain.rows; y += 1) {
  for (let x = 0; x < terrain.columns; x += 1) {
    setTerrainCellMaterial(terrain, x, y, (x * 3 + y * 5) % 4);
  }
}

const iterationCount = 200;
let checksum = 0;
const start = performance.now();
for (let iteration = 0; iteration < iterationCount; iteration += 1) {
  const snapshot = makeTerrainRenderSnapshot(terrain);
  const stats = analyzeTerrainRenderSnapshot(snapshot);
  checksum = (checksum + snapshot.sampleCellCount + stats.uniqueMaterialCount + Math.round(stats.averageMovementCost * 1000)) >>> 0;
}
const elapsedMs = performance.now() - start;

console.log(JSON.stringify({
  bench: "bench-terrain-render-snapshot:m33",
  iterationCount,
  columns: terrain.columns,
  rows: terrain.rows,
  cellCount: terrain.cellCount,
  elapsedMs: round(elapsedMs),
  snapshotsPerSecond: Math.round(iterationCount / (elapsedMs / 1000)),
  checksum
}, null, 2));

await rm(temporaryDirectory, { force: true, recursive: true });

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

function round(value) {
  return Math.round(value * 1000) / 1000;
}

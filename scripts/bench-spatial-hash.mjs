import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_spatial_hash_bench");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

await transpileSimModule("arrays.ts", "arrays.mjs");
await transpileSimModule("rng.ts", "rng.mjs");
await transpileSimModule("world.ts", "world.mjs");
await transpileSimModule("spatialHash.ts", "spatialHash.mjs");

const { createRng } = await import(pathToFileURL(join(temporaryDirectory, "rng.mjs")).href);
const { createWorldState, spawnRandomAgents } = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);
const {
  buildSpatialHashGrid,
  createSpatialHashGrid,
  getSpatialHashMemoryBytes
} = await import(pathToFileURL(join(temporaryDirectory, "spatialHash.mjs")).href);

const tiers = [1_000, 5_000, 10_000, 16_000, 25_000];
const buildIterations = 180;
const worldWidth = 4096;
const worldHeight = 4096;
const cellSize = 64;
const results = [];

for (const entityCount of tiers) {
  const world = createWorldState({ capacity: entityCount, worldWidth, worldHeight, sectorCount: 8 });
  spawnRandomAgents(world, entityCount, createRng(`qubok_evolve:bench:spatial:${entityCount}`));
  const grid = createSpatialHashGrid({ capacity: entityCount, worldWidth, worldHeight, cellSize });

  let finalStats = buildSpatialHashGrid(grid, world);
  const start = performance.now();

  for (let iteration = 0; iteration < buildIterations; iteration += 1) {
    driftWorldPositions(world, iteration);
    finalStats = buildSpatialHashGrid(grid, world);
  }

  const buildMsTotal = performance.now() - start;

  results.push({
    entityCount,
    cellSize,
    gridColumns: grid.columns,
    gridRows: grid.rows,
    cellCount: grid.cellCount,
    buildIterations,
    buildMsTotal: round3(buildMsTotal),
    avgGridBuildMs: round4(buildMsTotal / buildIterations),
    insertedCount: finalStats.insertedCount,
    usedCellCount: finalStats.usedCellCount,
    maxCellOccupancy: finalStats.maxCellOccupancy,
    clampedPositionCount: finalStats.clampedPositionCount,
    memoryMB: round3(getSpatialHashMemoryBytes(grid) / 1024 / 1024)
  });
}

await rm(temporaryDirectory, { force: true, recursive: true });

console.log(JSON.stringify({
  bench: "spatial-hash:m7",
  description: "Uniform grid rebuild benchmark. Query/candidate benchmark starts in milestone 8.",
  results
}, null, 2));

async function transpileSimModule(sourceName, outputName) {
  const sourcePath = join(projectRoot, "src", "sim", sourceName);
  const outputPath = join(temporaryDirectory, outputName);
  const sourceText = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(sourceText, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true }
  });
  const outputText = transpiled.outputText
    .replaceAll('from "./arrays"', 'from "./arrays.mjs"')
    .replaceAll("from './arrays'", "from './arrays.mjs'")
    .replaceAll('from "./rng"', 'from "./rng.mjs"')
    .replaceAll("from './rng'", "from './rng.mjs'")
    .replaceAll('from "./world"', 'from "./world.mjs"')
    .replaceAll("from './world'", "from './world.mjs'");
  await writeFile(outputPath, outputText, "utf8");
}

function driftWorldPositions(world, iteration) {
  const offsetX = Math.sin(iteration * 0.17) * 0.35;
  const offsetY = Math.cos(iteration * 0.13) * 0.35;
  for (let index = 0; index < world.count; index += 1) {
    world.x[index] = wrap(world.x[index] + offsetX, world.worldWidth);
    world.y[index] = wrap(world.y[index] + offsetY, world.worldHeight);
  }
}

function wrap(value, size) {
  let result = value % size;
  if (result < 0) result += size;
  return result;
}

function round3(value) { return Math.round(value * 1000) / 1000; }
function round4(value) { return Math.round(value * 10000) / 10000; }
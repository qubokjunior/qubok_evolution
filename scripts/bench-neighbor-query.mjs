import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_neighbor_query_bench");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

await transpileSimModule("arrays.ts", "arrays.mjs");
await transpileSimModule("rng.ts", "rng.mjs");
await transpileSimModule("world.ts", "world.mjs");
await transpileSimModule("spatialHash.ts", "spatialHash.mjs");
await transpileSimModule("neighborQuery.ts", "neighborQuery.mjs");

const { createRng } = await import(pathToFileURL(join(temporaryDirectory, "rng.mjs")).href);
const { createWorldState, spawnRandomAgents } = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);
const { buildSpatialHashGrid, createSpatialHashGrid } = await import(pathToFileURL(join(temporaryDirectory, "spatialHash.mjs")).href);
const { sampleLocalNeighborStats } = await import(pathToFileURL(join(temporaryDirectory, "neighborQuery.mjs")).href);

const tiers = [1_000, 5_000, 10_000, 16_000, 25_000];
const worldWidth = 4096;
const worldHeight = 4096;
const cellSize = 64;
const radius = 96;
const results = [];

for (const entityCount of tiers) {
  const world = createWorldState({ capacity: entityCount, worldWidth, worldHeight, sectorCount: 8 });
  spawnRandomAgents(world, entityCount, createRng(`qubok_evolve:bench:neighbor:${entityCount}`));
  const grid = createSpatialHashGrid({ capacity: entityCount, worldWidth, worldHeight, cellSize });
  buildSpatialHashGrid(grid, world);

  const iterations = entityCount >= 16_000 ? 40 : 80;
  let totalMs = 0;
  let checksum = 0;
  let lastSummary = null;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const start = performance.now();
    lastSummary = sampleLocalNeighborStats(grid, world, {
      radius,
      maxSampleCount: entityCount,
      stride: 1
    });
    totalMs += performance.now() - start;
    checksum = (checksum ^ Math.floor(lastSummary.totalCandidates) ^ Math.floor(lastSummary.totalNeighbors * 31)) >>> 0;
  }

  results.push({
    entityCount,
    iterations,
    radius,
    queryMsAvg: round3(totalMs / iterations),
    totalCandidates: lastSummary.totalCandidates,
    avgCandidatesPerAgent: round3(lastSummary.averageCandidatesPerAgent),
    avgNeighborsPerAgent: round3(lastSummary.avgNeighborsPerAgent),
    maxNeighborsForAgent: lastSummary.maxNeighborsForAgent,
    checksum
  });
}

await rm(temporaryDirectory, { force: true, recursive: true });

console.log(JSON.stringify({ bench: "neighbor-query:m8", tiers: results }, null, 2));

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
    .replaceAll("from './world'", "from './world.mjs'")
    .replaceAll('from "./spatialHash"', 'from "./spatialHash.mjs"')
    .replaceAll("from './spatialHash'", "from './spatialHash.mjs'");
  await writeFile(outputPath, outputText, "utf8");
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}
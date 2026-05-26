import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_world_bench");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

await transpileSimModule("arrays.ts", "arrays.mjs");
await transpileSimModule("rng.ts", "rng.mjs");
await transpileSimModule("world.ts", "world.mjs");

const { createRng } = await import(pathToFileURL(join(temporaryDirectory, "rng.mjs")).href);
const {
  createWorldState,
  getAliveCount,
  getWorldMemoryBytes,
  makeWorldSnapshot,
  spawnRandomAgents
} = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);

const tiers = [1_000, 5_000, 10_000, 16_000, 25_000];
const results = [];

for (const entityCount of tiers) {
  const allocationStart = performance.now();
  const world = createWorldState({
    capacity: entityCount,
    worldWidth: 4096,
    worldHeight: 4096,
    sectorCount: 8
  });
  const allocationMs = performance.now() - allocationStart;

  const spawnStart = performance.now();
  spawnRandomAgents(world, entityCount, createRng(`qubok_evolve:bench:world:${entityCount}`));
  const spawnMs = performance.now() - spawnStart;

  results.push({
    entityCount,
    allocationMs: round3(allocationMs),
    spawnMs: round3(spawnMs),
    totalMs: round3(allocationMs + spawnMs),
    memoryMB: round3(getWorldMemoryBytes(world) / 1024 / 1024),
    aliveCount: getAliveCount(world),
    snapshot: makeWorldSnapshot(world, 3)
  });
}

await rm(temporaryDirectory, { force: true, recursive: true });

console.log(
  JSON.stringify(
    {
      bench: "world:m3",
      description: "Typed-array WorldState allocation and deterministic spawn benchmark",
      tiers: results
    },
    null,
    2
  )
);

async function transpileSimModule(sourceName, outputName) {
  const sourcePath = join(projectRoot, "src", "sim", sourceName);
  const outputPath = join(temporaryDirectory, outputName);
  const sourceText = await readFile(sourcePath, "utf8");

  const transpiled = ts.transpileModule(sourceText, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      strict: true
    }
  });

  const outputText = transpiled.outputText
    .replaceAll('from "./arrays"', 'from "./arrays.mjs"')
    .replaceAll("from './arrays'", "from './arrays.mjs'")
    .replaceAll('from "./rng"', 'from "./rng.mjs"')
    .replaceAll("from './rng'", "from './rng.mjs'");

  await writeFile(outputPath, outputText, "utf8");
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}
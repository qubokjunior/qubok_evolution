import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_resources_bench");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

await transpileSimModule("arrays.ts", "arrays.mjs");
await transpileSimModule("rng.ts", "rng.mjs");
await transpileSimModule("world.ts", "world.mjs");
await transpileSimModule("resources.ts", "resources.mjs");

const { createRng } = await import(pathToFileURL(join(temporaryDirectory, "rng.mjs")).href);
const { createWorldState, spawnRandomAgents } = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);
const {
  consumeResourcesForWorld,
  createResourceLayer,
  rebuildResourceGrid,
  respawnResourcesToTarget,
  spawnRandomResources
} = await import(pathToFileURL(join(temporaryDirectory, "resources.mjs")).href);

const tiers = [1_000, 5_000, 10_000, 16_000, 25_000];
const results = [];

for (const entityCount of tiers) {
  const resourceCount = Math.min(entityCount * 2, 50_000);
  const rng = createRng(`qubok_evolve:bench:resources:${entityCount}`);
  const world = createWorldState({ capacity: entityCount, worldWidth: 4096, worldHeight: 4096, sectorCount: 8 });
  spawnRandomAgents(world, entityCount, rng);

  for (let index = 0; index < world.count; index += 1) {
    world.energy[index] = 50;
    world.maxEnergy[index] = 100;
    world.radius[index] = 3;
  }

  const resources = createResourceLayer({ capacity: resourceCount, worldWidth: 4096, worldHeight: 4096, cellSize: 64 });
  spawnRandomResources(resources, resourceCount, rng);

  const iterations = entityCount >= 16_000 ? 30 : 60;
  let buildMs = 0;
  let pickupMs = 0;
  let respawnMs = 0;
  let consumedTotal = 0;
  let candidateTotal = 0;
  let checksum = 0;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (let agentIndex = 0; agentIndex < world.count; agentIndex += 1) {
      world.energy[agentIndex] = 50;
    }

    let start = performance.now();
    const buildStats = rebuildResourceGrid(resources);
    buildMs += performance.now() - start;

    start = performance.now();
    const pickupStats = consumeResourcesForWorld(resources, world, { pickupRadius: 6, maxPickupsPerAgent: 1 });
    pickupMs += performance.now() - start;

    start = performance.now();
    const respawned = respawnResourcesToTarget(resources, resourceCount, rng);
    respawnMs += performance.now() - start;

    consumedTotal += pickupStats.consumedCount;
    candidateTotal += pickupStats.candidateCount;
    checksum = (checksum ^ buildStats.insertedCount ^ pickupStats.candidateCount ^ Math.floor(pickupStats.energyTransferred) ^ respawned) >>> 0;
  }

  results.push({
    entityCount,
    resourceCount,
    iterations,
    avgBuildMs: round3(buildMs / iterations),
    avgPickupMs: round3(pickupMs / iterations),
    avgRespawnMs: round3(respawnMs / iterations),
    avgConsumedPerStep: round3(consumedTotal / iterations),
    avgCandidatesPerStep: round3(candidateTotal / iterations),
    aliveResources: resources.aliveCount,
    checksum
  });
}

await rm(temporaryDirectory, { force: true, recursive: true });
console.log(JSON.stringify({ bench: "resources:m9", tiers: results }, null, 2));

async function transpileSimModule(sourceName, outputName) {
  const sourcePath = join(projectRoot, "src", "sim", sourceName);
  const outputPath = join(temporaryDirectory, outputName);
  const sourceText = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(sourceText, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true }
  });
  const outputText = rewriteLocalImports(transpiled.outputText);
  await writeFile(outputPath, outputText, "utf8");
}

function rewriteLocalImports(text) {
  return text
    .replaceAll('from "./arrays"', 'from "./arrays.mjs"')
    .replaceAll("from './arrays'", "from './arrays.mjs'")
    .replaceAll('from "./rng"', 'from "./rng.mjs"')
    .replaceAll("from './rng'", "from './rng.mjs'")
    .replaceAll('from "./world"', 'from "./world.mjs"')
    .replaceAll("from './world'", "from './world.mjs'");
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}
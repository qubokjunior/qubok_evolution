import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_energy_bench");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

await transpileSimModule("arrays.ts", "arrays.mjs");
await transpileSimModule("rng.ts", "rng.mjs");
await transpileSimModule("world.ts", "world.mjs");
await transpileSimModule("energy.ts", "energy.mjs");

const { createRng } = await import(pathToFileURL(join(temporaryDirectory, "rng.mjs")).href);
const { createWorldState, spawnRandomAgents } = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);
const { applyEnergySurvival } = await import(pathToFileURL(join(temporaryDirectory, "energy.mjs")).href);

const tiers = [1000, 5000, 10000, 16000];
const results = [];

for (const entityCount of tiers) {
  const rng = createRng(`qubok_evolve:m10:energy:${entityCount}`);
  const world = createWorldState({ capacity: entityCount, worldWidth: 2048, worldHeight: 2048, sectorCount: 8 });
  spawnRandomAgents(world, entityCount, rng);

  for (let index = 0; index < world.count; index += 1) {
    world.energy[index] = rng.range(2, 100);
    world.health[index] = rng.range(20, 100);
    world.metabolism[index] = rng.range(0.02, 0.15);
  }

  const iterations = 300;
  let totalMs = 0;
  let checksum = 0;
  let deathTotal = 0;
  let starvingTotal = 0;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const start = performance.now();
    const stats = applyEnergySurvival(world, {
      deltaSeconds: 1 / 60,
      basalMetabolismScale: 1,
      starvationDamagePerSecond: 18,
      energyDebtDamageScale: 0.35
    });
    totalMs += performance.now() - start;
    deathTotal += stats.deathsThisStep;
    starvingTotal += stats.starvingCount;
    checksum = (checksum ^ stats.aliveAfter ^ Math.floor(stats.basalEnergySpent * 1000) ^ Math.floor(stats.starvationDamage * 1000)) >>> 0;
  }

  results.push({
    entityCount,
    iterations,
    avgEnergyMs: round3(totalMs / iterations),
    deathsTotal: deathTotal,
    avgStarvingPerStep: round3(starvingTotal / iterations),
    checksum
  });
}

await rm(temporaryDirectory, { force: true, recursive: true });
console.log(JSON.stringify({ bench: "energy:m10", tiers: results }, null, 2));

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
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_movement_bench");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

await transpileSimModule("arrays.ts", "arrays.mjs");
await transpileSimModule("rng.ts", "rng.mjs");
await transpileSimModule("world.ts", "world.mjs");
await transpileSimModule("movement.ts", "movement.mjs");

const { createRng } = await import(pathToFileURL(join(temporaryDirectory, "rng.mjs")).href);
const { createWorldState, getAliveCount, makeWorldSnapshot, spawnRandomAgents } = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);
const { addForce, stepMovement } = await import(pathToFileURL(join(temporaryDirectory, "movement.mjs")).href);

const tiers = [1_000, 5_000, 10_000, 16_000, 25_000];
const tickCount = 240;
const deltaSeconds = 1 / 60;
const results = [];

for (const entityCount of tiers) {
  const world = createWorldState({ capacity: entityCount, worldWidth: 4096, worldHeight: 4096, sectorCount: 8 });
  spawnRandomAgents(world, entityCount, createRng(`qubok_evolve:bench:movement:${entityCount}`));

  for (let index = 0; index < world.count; index += 1) {
    addForce(world, index, Math.sin(index * 0.07) * 0.25, Math.cos(index * 0.11) * 0.25);
  }

  let checksum = 0;
  let movedTotal = 0;
  let distanceTotal = 0;
  let energySpentTotal = 0;

  const start = performance.now();
  for (let tick = 0; tick < tickCount; tick += 1) {
    const metrics = stepMovement(world, { deltaSeconds, boundsMode: "wrap", clearForces: false });
    movedTotal += metrics.movedCount;
    distanceTotal += metrics.distanceAccumulated;
    energySpentTotal += metrics.energySpent;
  }
  const movementMs = performance.now() - start;

  const sampleCount = Math.min(world.count, 64);
  for (let index = 0; index < sampleCount; index += 1) {
    checksum = (checksum + Math.trunc(world.x[index] * 1000) + Math.trunc(world.y[index] * 1000)) >>> 0;
  }

  results.push({
    entityCount,
    tickCount,
    movementMs: round3(movementMs),
    simMsPerTick: round4(movementMs / tickCount),
    aliveCount: getAliveCount(world),
    movedTotal,
    distanceTotal: round3(distanceTotal),
    energySpentTotal: round3(energySpentTotal),
    checksum,
    snapshot: makeWorldSnapshot(world, 3)
  });
}

await rm(temporaryDirectory, { force: true, recursive: true });
console.log(JSON.stringify({ bench: "movement:m4", description: "Hot-loop typed-array point movement over WorldState", deltaSeconds, tiers: results }, null, 2));

async function transpileSimModule(sourceName, outputName) {
  const sourcePath = join(projectRoot, "src", "sim", sourceName);
  const outputPath = join(temporaryDirectory, outputName);
  const sourceText = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(sourceText, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true } });
  const outputText = transpiled.outputText
    .replaceAll('from "./arrays"', 'from "./arrays.mjs"')
    .replaceAll("from './arrays'", "from './arrays.mjs'")
    .replaceAll('from "./rng"', 'from "./rng.mjs"')
    .replaceAll("from './rng'", "from './rng.mjs'")
    .replaceAll('from "./world"', 'from "./world.mjs"')
    .replaceAll("from './world'", "from './world.mjs'");
  await writeFile(outputPath, outputText, "utf8");
}

function round3(value) { return Math.round(value * 1000) / 1000; }
function round4(value) { return Math.round(value * 10000) / 10000; }
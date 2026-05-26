import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_reproduction_bench");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

await transpileSimModule("arrays.ts", "arrays.mjs");
await transpileSimModule("rng.ts", "rng.mjs");
await transpileSimModule("mutation.ts", "mutation.mjs");
await transpileSimModule("world.ts", "world.mjs");
await transpileSimModule("reproduction.ts", "reproduction.mjs");

const { createRng } = await import(pathToFileURL(join(temporaryDirectory, "rng.mjs")).href);
const { createWorldState, spawnAgent } = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);
const { applyReproduction } = await import(pathToFileURL(join(temporaryDirectory, "reproduction.mjs")).href);

const capacity = 12000;
const parentCount = 6000;
const world = createWorldState({ capacity, worldWidth: 2048, worldHeight: 2048 });
const spawnRng = createRng("qubok_evolve:bench:reproduction:m13:spawn");

for (let index = 0; index < parentCount; index += 1) {
  const agent = spawnAgent(world, {
    x: spawnRng.range(0, world.worldWidth),
    y: spawnRng.range(0, world.worldHeight),
    vx: spawnRng.range(-4, 4),
    vy: spawnRng.range(-4, 4),
    radius: spawnRng.range(2, 5),
    mass: spawnRng.range(0.6, 3.2),
    drag: spawnRng.range(0.01, 0.06),
    maxSpeed: spawnRng.range(30, 110),
    turnRate: spawnRng.range(1, 8),
    energy: index % 3 === 0 ? 130 : spawnRng.range(30, 80),
    maxEnergy: 150,
    maxStamina: 80,
    health: spawnRng.range(60, 120),
    metabolism: spawnRng.range(0.01, 0.08),
    genomeId: index + 1,
    generationId: 0,
    speciesId: index % 8,
    colorRGBA: 0xffffffff
  });
  world.age[agent] = index % 3 === 0 ? 10 : spawnRng.range(0, 3);
}

const reproductionRng = createRng("qubok_evolve:bench:reproduction:m13");
const start = performance.now();
const stats = applyReproduction(world, reproductionRng, {
  energyThreshold: 100,
  energyCost: 35,
  childEnergy: 25,
  minAgeSeconds: 4,
  maxBirthsPerStep: 2000,
  spawnRadius: 10,
  mutationChance: 0.75,
  mutationStandardDeviationScale: 1
});
const reproductionMs = performance.now() - start;

await rm(temporaryDirectory, { force: true, recursive: true });

console.log(JSON.stringify({
  bench: "reproduction:m13",
  capacity,
  parentCount,
  finalCount: world.count,
  reproductionMs: round3(reproductionMs),
  checkedCount: stats.checkedCount,
  eligibleCount: stats.eligibleCount,
  birthsThisStep: stats.birthsThisStep,
  mutationAttempts: stats.mutationAttempts,
  mutationChangedCount: stats.mutationChangedCount,
  mutationClampedCount: stats.mutationClampedCount,
  mutationAbsoluteDeltaSum: round3(stats.mutationAbsoluteDeltaSum),
  averageChildMutationAbs: round6(stats.averageChildMutationAbs),
  snapshotDraws: reproductionRng.snapshot().draws
}, null, 2));

async function transpileSimModule(sourceName, outputName) {
  const sourcePath = join(projectRoot, "src", "sim", sourceName);
  const sourceText = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(sourceText, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      strict: true
    }
  });
  let output = transpiled.outputText.replaceAll('from "./arrays"', 'from "./arrays.mjs"');
  output = output.replaceAll('from "./rng"', 'from "./rng.mjs"');
  output = output.replaceAll('from "./world"', 'from "./world.mjs"');
  output = output.replaceAll('from "./mutation"', 'from "./mutation.mjs"');
  await writeFile(join(temporaryDirectory, outputName), output, "utf8");
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

function round6(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}
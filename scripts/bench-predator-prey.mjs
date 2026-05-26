import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_predator_prey_bench");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

await transpileSimModule("arrays.ts", "arrays.mjs");
await transpileSimModule("rng.ts", "rng.mjs");
await transpileSimModule("world.ts", "world.mjs");
await transpileSimModule("spatialHash.ts", "spatialHash.mjs");
await transpileSimModule("neighborQuery.ts", "neighborQuery.mjs");
await transpileSimModule("predatorPrey.ts", "predatorPrey.mjs");

const { createRng } = await import(pathToFileURL(join(temporaryDirectory, "rng.mjs")).href);
const { createWorldState, spawnAgent } = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);
const { buildSpatialHashGrid, createSpatialHashGrid } = await import(pathToFileURL(join(temporaryDirectory, "spatialHash.mjs")).href);
const { DIET_MEAT, DIET_PLANT, DIET_OMNIVORE, applyPredatorPreyInteraction } = await import(pathToFileURL(join(temporaryDirectory, "predatorPrey.mjs")).href);

const entityCount = 10000;
const world = createWorldState({ capacity: entityCount, worldWidth: 2048, worldHeight: 2048, sectorCount: 8 });
const grid = createSpatialHashGrid({ capacity: entityCount, worldWidth: 2048, worldHeight: 2048, cellSize: 32 });
const rng = createRng("qubok_evolve:bench:predator-prey:m14");

for (let index = 0; index < entityCount; index += 1) {
  const isPredator = index % 7 === 0;
  const isOmnivore = index % 31 === 0;
  spawnAgent(world, {
    x: rng.range(0, world.worldWidth),
    y: rng.range(0, world.worldHeight),
    vx: rng.range(-8, 8),
    vy: rng.range(-8, 8),
    radius: isPredator ? rng.range(3, 5) : rng.range(1.5, 3.5),
    mass: isPredator ? rng.range(2, 4) : rng.range(0.6, 2),
    dietMask: isOmnivore ? DIET_OMNIVORE : isPredator ? DIET_MEAT : DIET_PLANT,
    speciesId: isPredator ? 1 + (index % 5) : 20 + (index % 11),
    mouthPower: isPredator ? rng.range(4, 16) : rng.range(0.1, 2),
    armor: rng.range(0, 2.5),
    energy: rng.range(20, 90),
    maxEnergy: 100,
    health: isPredator ? rng.range(70, 130) : rng.range(15, 70),
    genomeId: index + 1,
    colorRGBA: isPredator ? 0xff6a6aff : 0x88e060ff
  });
}

const buildStart = performance.now();
const buildStats = buildSpatialHashGrid(grid, world);
const gridBuildMs = performance.now() - buildStart;

const start = performance.now();
const stats = applyPredatorPreyInteraction(world, grid, {
  attackRadius: 14,
  maxAttacksPerPredator: 1,
  damageScale: 1,
  actionEnergyCost: 0.4,
  energyGainPerDamage: 0.3,
  preyEnergyHarvestRatio: 0.35,
  sameSpeciesProtection: true
});
const predatorPreyMs = performance.now() - start;

let aliveAfter = 0;
for (let index = 0; index < world.count; index += 1) {
  aliveAfter += world.alive[index] === 1 ? 1 : 0;
}

await rm(temporaryDirectory, { force: true, recursive: true });

console.log(JSON.stringify({
  bench: "predator-prey:m14",
  entityCount,
  gridBuildMs: round3(gridBuildMs),
  predatorPreyMs: round3(predatorPreyMs),
  insertedCount: buildStats.insertedCount,
  checkedCount: stats.checkedCount,
  eligiblePredatorCount: stats.eligiblePredatorCount,
  neighborCandidates: stats.neighborCandidates,
  neighborCount: stats.neighborCount,
  attacksThisStep: stats.attacksThisStep,
  killsThisStep: stats.killsThisStep,
  damageDealt: round3(stats.damageDealt),
  energySpent: round3(stats.energySpent),
  energyGained: round3(stats.energyGained),
  aliveAfter,
  snapshotDraws: rng.snapshot().draws
}, null, 2));

async function transpileSimModule(sourceName, outputName) {
  const sourcePath = join(projectRoot, "src", "sim", sourceName);
  const sourceText = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(sourceText, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true }
  });
  let output = transpiled.outputText
    .replaceAll('from "./arrays"', 'from "./arrays.mjs"')
    .replaceAll('from "./rng"', 'from "./rng.mjs"')
    .replaceAll('from "./world"', 'from "./world.mjs"')
    .replaceAll('from "./spatialHash"', 'from "./spatialHash.mjs"')
    .replaceAll('from "./neighborQuery"', 'from "./neighborQuery.mjs"');
  await writeFile(join(temporaryDirectory, outputName), output, "utf8");
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}
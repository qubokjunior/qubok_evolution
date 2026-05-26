import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_terrain_reproduction_placement_test");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

for (const moduleName of ["arrays.ts", "rng.ts", "mutation.ts", "world.ts", "obstacleMask.ts", "resources.ts", "terrain.ts", "spawnValidation.ts", "reproduction.ts"]) {
  await transpileSimModule(moduleName, moduleName.replace(".ts", ".mjs"));
}

const { createRng } = await import(pathToFileURL(join(temporaryDirectory, "rng.mjs")).href);
const { createWorldState, spawnAgent } = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);
const { createObstacleMask } = await import(pathToFileURL(join(temporaryDirectory, "obstacleMask.mjs")).href);
const { createTerrainLayer, setTerrainCellMaterial, sampleTerrainAtPosition } = await import(pathToFileURL(join(temporaryDirectory, "terrain.mjs")).href);
const { applyReproduction, REPRODUCTION_SYSTEM_VERSION } = await import(pathToFileURL(join(temporaryDirectory, "reproduction.mjs")).href);

assertEqual(REPRODUCTION_SYSTEM_VERSION, "qubok_evolve.reproduction.v4", "reproduction system version");

const terrain = createTerrainLayer({ worldWidth: 80, worldHeight: 20, cellSize: 10 });
for (let cellX = 0; cellX < terrain.columns; cellX += 1) setTerrainCellMaterial(terrain, cellX, 0, 3);
setTerrainCellMaterial(terrain, 1, 0, 2);
setTerrainCellMaterial(terrain, 2, 0, 0);
setTerrainCellMaterial(terrain, 3, 0, 1);

const world = createWorldState({ capacity: 8, worldWidth: 80, worldHeight: 20 });
const parent = spawnAgent(world, {
  x: 20,
  y: 5,
  energy: 140,
  maxEnergy: 160,
  genomeId: 100,
  generationId: 2,
  terrainAffinity: 2,
  visionRadius: 40
});
world.age[parent] = 10;

const stats = applyReproduction(world, createRng("terrain-reproduction-placement:m38"), {
  energyThreshold: 100,
  energyCost: 30,
  childEnergy: 25,
  minAgeSeconds: 1,
  maxBirthsPerStep: 1,
  spawnRadius: 25,
  mutationChance: 0,
  mutationStandardDeviationScale: 0,
  terrain,
  offspringTerrainMaxAttempts: 8,
  offspringTerrainMinAcceptance: 0.05
});

assertEqual(stats.birthsThisStep, 1, "terrain-aware birth count");
assertGreater(stats.terrainOffspringSampleCount, 0, "terrain offspring sample count");
assertGreater(stats.terrainOffspringAffinitySum, 0, "terrain offspring affinity sum");
assertGreaterOrEqual(stats.terrainOffspringRejectedCount, 0, "terrain offspring rejected count");
assertEqual(world.count, 2, "child spawned");
assertEqual(world.parentGenomeId[1], 100, "child parent genome id");
assertEqual(world.generationId[1], 3, "child generation id");
assertAlmostEqual(world.energy[parent], 110, 0.00001, "parent energy spent after valid terrain placement");
const childSample = sampleTerrainAtPosition(terrain, world.x[1], world.y[1]);
assertGreaterOrEqual(childSample.movementCost, 1, "child terrain sample valid");

const obstacleWorld = createWorldState({ capacity: 4, worldWidth: 40, worldHeight: 40 });
const obstacleMask = createObstacleMask({ worldWidth: 40, worldHeight: 40, cellSize: 10 });
const obstacleTerrain = createTerrainLayer({ worldWidth: 40, worldHeight: 40, cellSize: 10 });
const obstacleParent = spawnAgent(obstacleWorld, { x: 15, y: 15, energy: 120, maxEnergy: 150, genomeId: 200, terrainAffinity: 1 });
obstacleWorld.age[obstacleParent] = 10;
const obstacleStats = applyReproduction(obstacleWorld, createRng("terrain-obstacle-combined:m38"), {
  energyThreshold: 100,
  energyCost: 30,
  childEnergy: 25,
  minAgeSeconds: 1,
  maxBirthsPerStep: 1,
  spawnRadius: 12,
  mutationChance: 0,
  terrain: obstacleTerrain,
  obstacleMask,
  offspringSpawnMaxAttempts: 8,
  offspringTerrainMaxAttempts: 4,
  offspringClearanceRadius: 0
});
assertEqual(obstacleStats.birthsThisStep, 1, "terrain + obstacle birth count");
assertGreater(obstacleStats.terrainOffspringSampleCount, 0, "terrain + obstacle sample count");

assertThrows(() => applyReproduction(createWorldState({ capacity: 1 }), createRng("bad-terrain-attempts"), { offspringTerrainMaxAttempts: 0 }), "invalid terrain attempts");
assertThrows(() => applyReproduction(createWorldState({ capacity: 1 }), createRng("bad-terrain-min"), { offspringTerrainMinAcceptance: -0.01 }), "invalid terrain min low");
assertThrows(() => applyReproduction(createWorldState({ capacity: 1 }), createRng("bad-terrain-max"), { offspringTerrainMinAcceptance: 1.01 }), "invalid terrain min high");

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("terrain reproduction placement tests passed");

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
    .replaceAll('from "./mutation"', 'from "./mutation.mjs"')
    .replaceAll("from './mutation'", "from './mutation.mjs'")
    .replaceAll('from "./world"', 'from "./world.mjs"')
    .replaceAll("from './world'", "from './world.mjs'")
    .replaceAll('from "./obstacleMask"', 'from "./obstacleMask.mjs"')
    .replaceAll("from './obstacleMask'", "from './obstacleMask.mjs'")
    .replaceAll('from "./resources"', 'from "./resources.mjs"')
    .replaceAll("from './resources'", "from './resources.mjs'")
    .replaceAll('from "./terrain"', 'from "./terrain.mjs"')
    .replaceAll("from './terrain'", "from './terrain.mjs'")
    .replaceAll('from "./spawnValidation"', 'from "./spawnValidation.mjs"')
    .replaceAll("from './spawnValidation'", "from './spawnValidation.mjs'")
    .replaceAll('from "./reproduction"', 'from "./reproduction.mjs"')
    .replaceAll("from './reproduction'", "from './reproduction.mjs'");
  await writeFile(outputPath, outputText, "utf8");
}

function assertEqual(actual, expected, label) { if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`); }
function assertAlmostEqual(actual, expected, epsilon, label) { if (Math.abs(actual - expected) > epsilon) throw new Error(`${label}: expected ${expected} +/- ${epsilon}, got ${actual}`); }
function assertGreater(actual, threshold, label) { if (!(actual > threshold)) throw new Error(`${label}: expected ${actual} > ${threshold}`); }
function assertGreaterOrEqual(actual, threshold, label) { if (!(actual >= threshold)) throw new Error(`${label}: expected ${actual} >= ${threshold}`); }
function assertThrows(fn, label) { let thrown = false; try { fn(); } catch { thrown = true; } if (!thrown) throw new Error(`${label}: expected function to throw`); }

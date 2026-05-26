import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_resources_test");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

await transpileSimModule("arrays.ts", "arrays.mjs");
await transpileSimModule("rng.ts", "rng.mjs");
await transpileSimModule("world.ts", "world.mjs");
await transpileSimModule("resources.ts", "resources.mjs");

const { createRng } = await import(pathToFileURL(join(temporaryDirectory, "rng.mjs")).href);
const { createWorldState, spawnAgent } = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);
const {
  RESOURCE_LAYER_VERSION,
  consumeResourcesForWorld,
  createResourceLayer,
  getResourceCellIdForCoordinates,
  rebuildResourceGrid,
  respawnResourcesToTarget,
  spawnRandomResources,
  spawnResource
} = await import(pathToFileURL(join(temporaryDirectory, "resources.mjs")).href);

assertEqual(RESOURCE_LAYER_VERSION, "qubok_evolve.resources.v1", "resource layer version");

const world = createWorldState({ capacity: 4, worldWidth: 100, worldHeight: 100, sectorCount: 8 });
const layer = createResourceLayer({ capacity: 8, worldWidth: 100, worldHeight: 100, cellSize: 10 });

const agentA = spawnAgent(world, { x: 20, y: 20, radius: 2, energy: 40, maxEnergy: 100 });
const agentB = spawnAgent(world, { x: 80, y: 80, radius: 2, energy: 99, maxEnergy: 100 });
spawnAgent(world, { x: 5, y: 5, radius: 2, energy: 100, maxEnergy: 100 });

const foodA = spawnResource(layer, { x: 23, y: 20, energy: 15, radius: 2, kindId: 1 });
const foodB = spawnResource(layer, { x: 84, y: 82, energy: 10, radius: 2, kindId: 2 });
const foodFar = spawnResource(layer, { x: 50, y: 50, energy: 20, radius: 2, kindId: 3 });

assertEqual(agentA, 0, "agentA index");
assertEqual(agentB, 1, "agentB index");
assertEqual(foodA, 0, "foodA index");
assertEqual(foodB, 1, "foodB index");
assertEqual(foodFar, 2, "foodFar index");
assertEqual(layer.aliveCount, 3, "initial alive resources");
assertEqual(getResourceCellIdForCoordinates(layer, 2, 2), 22, "resource cell id");

const buildStats = rebuildResourceGrid(layer);
assertEqual(buildStats.insertedCount, 3, "resource inserted count");
assertEqual(buildStats.skippedDeadCount, 0, "resource skipped dead count");
assertInRange(buildStats.usedCellCount, 2, 3, "resource used cell count");

const pickupStats = consumeResourcesForWorld(layer, world, { pickupRadius: 5, maxPickupsPerAgent: 1 });
assertEqual(pickupStats.consumedCount, 2, "consumed resources");
assertAlmostEqual(pickupStats.energyTransferred, 16, 0.0001, "energy transferred respects maxEnergy");
assertAlmostEqual(world.energy[agentA], 55, 0.0001, "agent A energy after pickup");
assertAlmostEqual(world.energy[agentB], 100, 0.0001, "agent B capped energy after pickup");
assertAlmostEqual(world.foodEaten[agentA], 15, 0.0001, "agent A food eaten");
assertAlmostEqual(world.foodEaten[agentB], 1, 0.0001, "agent B food eaten capped");
assertEqual(layer.aliveCount, 1, "alive resources after pickup");
assertEqual(layer.alive[foodFar], 1, "far resource still alive");

const respawned = respawnResourcesToTarget(layer, 5, createRng("qubok_evolve:m9:resource-test"));
assertEqual(respawned, 4, "respawned resources");
assertEqual(layer.aliveCount, 5, "alive after respawn");
assertInRange(layer.count, 5, 8, "resource count after reuse/new slots");

const randomLayer = createResourceLayer({ capacity: 16, worldWidth: 64, worldHeight: 64, cellSize: 8 });
spawnRandomResources(randomLayer, 10, createRng("qubok_evolve:m9:random-resources"));
assertEqual(randomLayer.aliveCount, 10, "random alive count");
const randomBuild = rebuildResourceGrid(randomLayer);
assertEqual(randomBuild.insertedCount, 10, "random build inserted count");

assertThrows(() => createResourceLayer({ capacity: 0, worldWidth: 10, worldHeight: 10, cellSize: 1 }), "bad capacity");
assertThrows(() => consumeResourcesForWorld(layer, world, { pickupRadius: 0 }), "bad pickup radius");
assertThrows(() => respawnResourcesToTarget(layer, -1, createRng("bad")), "bad target");

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("resources tests passed");

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

function assertEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

function assertAlmostEqual(actual, expected, epsilon, label) {
  if (Math.abs(actual - expected) > epsilon) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

function assertInRange(actual, min, max, label) {
  if (actual < min || actual > max) throw new Error(`${label}: expected ${actual} to be in ${min}..${max}`);
}

function assertThrows(fn, label) {
  let thrown = false;
  try { fn(); } catch { thrown = true; }
  if (!thrown) throw new Error(`${label}: expected function to throw`);
}
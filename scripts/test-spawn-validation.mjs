import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_spawn_validation_test");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

for (const moduleName of ["arrays.ts", "world.ts", "resources.ts", "obstacleMask.ts", "rng.ts", "spawnValidation.ts"]) {
  await transpileSimModule(moduleName, moduleName.replace(".ts", ".mjs"));
}

const { createRng } = await import(pathToFileURL(join(temporaryDirectory, "rng.mjs")).href);
const { createWorldState } = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);
const { createResourceLayer } = await import(pathToFileURL(join(temporaryDirectory, "resources.mjs")).href);
const { createObstacleMask, setObstacleCell, setObstacleRect } = await import(pathToFileURL(join(temporaryDirectory, "obstacleMask.mjs")).href);
const {
  SPAWN_VALIDATION_VERSION,
  findFreePositionNearOrRandom,
  findFreeRandomPosition,
  isPositionBlockedByObstacleMask,
  respawnResourcesToTargetAvoidingObstacles,
  spawnRandomAgentsAvoidingObstacles,
  spawnRandomResourcesAvoidingObstacles
} = await import(pathToFileURL(join(temporaryDirectory, "spawnValidation.mjs")).href);

assertEqual(SPAWN_VALIDATION_VERSION, "qubok_evolve.spawn_validation.v1", "spawn validation version");

const mask = createObstacleMask({ worldWidth: 100, worldHeight: 100, cellSize: 10 });
setObstacleCell(mask, 5, 5, true);
assertEqual(isPositionBlockedByObstacleMask(mask, 55, 55, 0), true, "blocked center");
assertEqual(isPositionBlockedByObstacleMask(mask, 5, 5, 0), false, "free corner");

const rng = createRng("qubok_evolve:test:spawn_validation:m22");
const free = findFreeRandomPosition(mask, rng, { maxAttempts: 16, clearanceRadius: 0 });
assertEqual(free.found, true, "free random position found");
assertEqual(isPositionBlockedByObstacleMask(mask, free.x, free.y, 0), false, "free random position not blocked");

const near = findFreePositionNearOrRandom(mask, rng, 55, 55, 20, { maxAttempts: 16, clearanceRadius: 0 });
assertEqual(near.found, true, "near fallback/random found");
assertEqual(isPositionBlockedByObstacleMask(mask, near.x, near.y, 0), false, "near result not blocked");

const world = createWorldState({ capacity: 64, worldWidth: 100, worldHeight: 100, sectorCount: 8 });
const agentStats = spawnRandomAgentsAvoidingObstacles(world, 32, createRng("qubok_evolve:test:spawn_agents:m22"), mask, {
  maxAttempts: 32,
  clearanceRadius: 0
});
assertEqual(agentStats.requestedCount, 32, "agent requested count");
assertEqual(agentStats.spawnedCount, 32, "agent spawned count");
assertEqual(agentStats.failedCount, 0, "agent failed count");

for (let index = 0; index < world.count; index += 1) {
  assertEqual(isPositionBlockedByObstacleMask(mask, world.x[index], world.y[index], 0), false, `agent ${index} not blocked`);
}

const resources = createResourceLayer({ capacity: 64, worldWidth: 100, worldHeight: 100, cellSize: 10 });
const resourceStats = spawnRandomResourcesAvoidingObstacles(resources, 32, createRng("qubok_evolve:test:spawn_resources:m22"), mask, {
  maxAttempts: 32,
  clearanceRadius: 0
});
assertEqual(resourceStats.requestedCount, 32, "resource requested count");
assertEqual(resourceStats.spawnedCount, 32, "resource spawned count");
assertEqual(resourceStats.failedCount, 0, "resource failed count");

for (let index = 0; index < resources.count; index += 1) {
  assertEqual(isPositionBlockedByObstacleMask(mask, resources.x[index], resources.y[index], 0), false, `resource ${index} not blocked`);
}

resources.alive[0] = 0;
resources.aliveCount -= 1;
const respawnStats = respawnResourcesToTargetAvoidingObstacles(
  resources,
  32,
  createRng("qubok_evolve:test:respawn_resources:m22"),
  mask,
  { maxAttempts: 32, clearanceRadius: 0 }
);
assertEqual(respawnStats.spawnedCount, 1, "respawned one missing resource");
assertEqual(resources.aliveCount, 32, "resource target restored");

const dense = createObstacleMask({ worldWidth: 30, worldHeight: 30, cellSize: 10 });
setObstacleRect(dense, 0, 0, 30, 30, true);
setObstacleCell(dense, 0, 0, false);
const fallback = findFreeRandomPosition(dense, createRng("qubok_evolve:test:dense:m22"), {
  maxAttempts: 1,
  clearanceRadius: 0
});
assertEqual(fallback.found, true, "dense fallback finds one free cell");
assertEqual(fallback.fallbackUsed, true, "dense fallback used");
assertEqual(isPositionBlockedByObstacleMask(dense, fallback.x, fallback.y, 0), false, "dense fallback not blocked");

const full = createObstacleMask({ worldWidth: 20, worldHeight: 20, cellSize: 10 });
setObstacleRect(full, 0, 0, 20, 20, true);
const notFound = findFreeRandomPosition(full, createRng("qubok_evolve:test:full:m22"), {
  maxAttempts: 2,
  clearanceRadius: 0
});
assertEqual(notFound.found, false, "full mask has no free position");

assertThrows(() => findFreeRandomPosition(mask, rng, { maxAttempts: 0 }), "invalid maxAttempts");
assertThrows(() => isPositionBlockedByObstacleMask(mask, 0, 0, -1), "invalid clearance");

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("spawn validation tests passed");

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
    .replaceAll("from './rng'", "from './rng.mjs'")
    .replaceAll('from "./world"', 'from "./world.mjs"')
    .replaceAll("from './world'", "from './world.mjs'")
    .replaceAll('from "./resources"', 'from "./resources.mjs"')
    .replaceAll("from './resources'", "from './resources.mjs'")
    .replaceAll('from "./obstacleMask"', 'from "./obstacleMask.mjs"')
    .replaceAll("from './obstacleMask'", "from './obstacleMask.mjs'")
    .replaceAll('from "./spawnValidation"', 'from "./spawnValidation.mjs"')
    .replaceAll("from './spawnValidation'", "from './spawnValidation.mjs'");

  await writeFile(outputPath, outputText, "utf8");
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertThrows(fn, label) {
  let thrown = false;
  try {
    fn();
  } catch {
    thrown = true;
  }

  if (!thrown) {
    throw new Error(`${label}: expected function to throw`);
  }
}

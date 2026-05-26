import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_spawn_validation_bench");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

for (const moduleName of ["arrays.ts", "rng.ts", "world.ts", "resources.ts", "obstacleMask.ts", "spawnValidation.ts"]) {
  await transpileSimModule(moduleName, moduleName.replace(".ts", ".mjs"));
}

const { createRng } = await import(pathToFileURL(join(temporaryDirectory, "rng.mjs")).href);
const { createWorldState } = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);
const { createResourceLayer } = await import(pathToFileURL(join(temporaryDirectory, "resources.mjs")).href);
const { createObstacleMask, seedDemoObstacleMask, setObstacleRect } = await import(pathToFileURL(join(temporaryDirectory, "obstacleMask.mjs")).href);
const {
  spawnRandomAgentsAvoidingObstacles,
  spawnRandomResourcesAvoidingObstacles
} = await import(pathToFileURL(join(temporaryDirectory, "spawnValidation.mjs")).href);

const sparseMask = createObstacleMask({ worldWidth: 1024, worldHeight: 1024, cellSize: 48 });
seedDemoObstacleMask(sparseMask);

const denseMask = createObstacleMask({ worldWidth: 1024, worldHeight: 1024, cellSize: 48 });
setObstacleRect(denseMask, 0, 0, 1024, 1024, true);
setObstacleRect(denseMask, 0, 0, 256, 1024, false);

const sparseAgents = runAgentCase("sparseAgents", sparseMask, 2000);
const denseAgents = runAgentCase("denseAgents", denseMask, 2000);
const sparseResources = runResourceCase("sparseResources", sparseMask, 2000);
const denseResources = runResourceCase("denseResources", denseMask, 2000);

await rm(temporaryDirectory, { force: true, recursive: true });

console.log(JSON.stringify({
  bench: "spawn-validation:m22",
  sparseAgents,
  denseAgents,
  sparseResources,
  denseResources
}, null, 2));

function runAgentCase(name, mask, count) {
  const world = createWorldState({ capacity: count, worldWidth: mask.worldWidth, worldHeight: mask.worldHeight, sectorCount: 8 });
  const rng = createRng(`qubok_evolve:bench:${name}:m22`);
  const start = performance.now();
  const stats = spawnRandomAgentsAvoidingObstacles(world, count, rng, mask, {
    maxAttempts: 64,
    clearanceRadius: 4
  });
  const elapsedMs = performance.now() - start;

  return {
    name,
    elapsedMs: round3(elapsedMs),
    count,
    worldCount: world.count,
    ...stats
  };
}

function runResourceCase(name, mask, count) {
  const resources = createResourceLayer({ capacity: count, worldWidth: mask.worldWidth, worldHeight: mask.worldHeight, cellSize: 48 });
  const rng = createRng(`qubok_evolve:bench:${name}:m22`);
  const start = performance.now();
  const stats = spawnRandomResourcesAvoidingObstacles(resources, count, rng, mask, {
    maxAttempts: 64,
    clearanceRadius: 4
  });
  const elapsedMs = performance.now() - start;

  return {
    name,
    elapsedMs: round3(elapsedMs),
    count,
    resourceCount: resources.count,
    aliveCount: resources.aliveCount,
    ...stats
  };
}

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

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

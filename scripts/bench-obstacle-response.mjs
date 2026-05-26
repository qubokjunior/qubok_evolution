import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_obstacle_response_bench");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

for (const moduleName of ["arrays.ts", "rng.ts", "world.ts", "movement.ts", "obstacleMask.ts", "obstacleResponse.ts"]) {
  await transpileSimModule(moduleName, moduleName.replace(".ts", ".mjs"));
}

const { createRng } = await import(pathToFileURL(join(temporaryDirectory, "rng.mjs")).href);
const { createWorldState, spawnRandomAgents } = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);
const { createObstacleMask, seedDemoObstacleMask, countOccupiedObstacleCells } = await import(pathToFileURL(join(temporaryDirectory, "obstacleMask.mjs")).href);
const { clearForces } = await import(pathToFileURL(join(temporaryDirectory, "movement.mjs")).href);
const { applyObstacleSoftResponse } = await import(pathToFileURL(join(temporaryDirectory, "obstacleResponse.mjs")).href);

const entityCount = 5000;
const world = createWorldState({ capacity: entityCount, worldWidth: 1024, worldHeight: 1024, sectorCount: 8 });
const mask = createObstacleMask({ worldWidth: 1024, worldHeight: 1024, cellSize: 48 });
const rng = createRng("qubok_evolve:bench:obstacle_response:m21");
spawnRandomAgents(world, entityCount, rng);
seedDemoObstacleMask(mask);

const full = runCase("full", {
  responseRadius: 42,
  forceScale: 140,
  maxForcePerAgent: 220,
  includeWorldBounds: true
});

const stride2 = runCase("stride2", {
  responseRadius: 42,
  forceScale: 140,
  maxForcePerAgent: 220,
  includeWorldBounds: true,
  cellStride: 2
});

const capped = runCase("capped32", {
  responseRadius: 42,
  forceScale: 140,
  maxForcePerAgent: 220,
  includeWorldBounds: true,
  maxObstacleCellChecksPerAgent: 32
});

const boundsOnly = runCase("boundsOnly", {
  responseRadius: 42,
  forceScale: 140,
  maxForcePerAgent: 220,
  includeWorldBounds: true,
  boundsOnly: true
});

await rm(temporaryDirectory, { force: true, recursive: true });

console.log(JSON.stringify({
  bench: "obstacle-response:m21",
  entityCount,
  obstacleCellCount: mask.cellCount,
  occupiedCellCount: countOccupiedObstacleCells(mask),
  full,
  stride2,
  capped,
  boundsOnly
}, null, 2));

function runCase(name, config) {
  clearForces(world);
  const start = performance.now();
  const stats = applyObstacleSoftResponse(world, mask, config);
  const obstacleResponseMs = performance.now() - start;

  return {
    name,
    obstacleResponseMs: round3(obstacleResponseMs),
    checkedCount: stats.checkedCount,
    obstacleCellChecks: stats.obstacleCellChecks,
    obstacleCellsSkippedByStride: stats.obstacleCellsSkippedByStride,
    obstacleCellCheckLimitHits: stats.obstacleCellCheckLimitHits,
    obstacleHits: stats.obstacleHits,
    boundaryHits: stats.boundaryHits,
    forceAppliedCount: stats.forceAppliedCount,
    totalForceMagnitude: round3(stats.totalForceMagnitude),
    maxForceMagnitude: round3(stats.maxForceMagnitude)
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
    .replaceAll('from "./movement"', 'from "./movement.mjs"')
    .replaceAll("from './movement'", "from './movement.mjs'")
    .replaceAll('from "./obstacleMask"', 'from "./obstacleMask.mjs"')
    .replaceAll("from './obstacleMask'", "from './obstacleMask.mjs'")
    .replaceAll('from "./obstacleResponse"', 'from "./obstacleResponse.mjs"')
    .replaceAll("from './obstacleResponse'", "from './obstacleResponse.mjs'");

  await writeFile(outputPath, outputText, "utf8");
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

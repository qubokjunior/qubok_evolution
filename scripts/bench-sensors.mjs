import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_sensors_bench");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

await transpileSimModule("arrays.ts", "arrays.mjs");
await transpileSimModule("rng.ts", "rng.mjs");
await transpileSimModule("world.ts", "world.mjs");
await transpileSimModule("spatialHash.ts", "spatialHash.mjs");
await transpileSimModule("neighborQuery.ts", "neighborQuery.mjs");
await transpileSimModule("sensors.ts", "sensors.mjs");

const { createRng } = await import(pathToFileURL(join(temporaryDirectory, "rng.mjs")).href);
const { createWorldState, spawnRandomAgents } = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);
const { buildSpatialHashGrid, createSpatialHashGrid } = await import(pathToFileURL(join(temporaryDirectory, "spatialHash.mjs")).href);
const { applyAgentSensors } = await import(pathToFileURL(join(temporaryDirectory, "sensors.mjs")).href);

const entityCount = 5000;
const world = createWorldState({ capacity: entityCount, worldWidth: 1024, worldHeight: 1024, sectorCount: 8 });
const grid = createSpatialHashGrid({ capacity: entityCount, worldWidth: 1024, worldHeight: 1024, cellSize: 48 });
const rng = createRng("qubok_evolve:bench:sensors:m15");
spawnRandomAgents(world, entityCount, rng);

const gridStart = performance.now();
const gridStats = buildSpatialHashGrid(grid, world);
const gridBuildMs = performance.now() - gridStart;

const start = performance.now();
const stats = applyAgentSensors(world, grid);
const sensorMs = performance.now() - start;

await rm(temporaryDirectory, { force: true, recursive: true });

console.log(JSON.stringify({
  bench: "sensors:m15",
  entityCount,
  gridBuildMs: round3(gridBuildMs),
  sensorMs: round3(sensorMs),
  insertedCount: gridStats.insertedCount,
  checkedCount: stats.checkedCount,
  neighborCandidates: stats.neighborCandidates,
  radiusNeighborCount: stats.radiusNeighborCount,
  visibleNeighborCount: stats.visibleNeighborCount,
  sectorWrites: stats.sectorWrites,
  averageVisibleNeighborsPerCheckedAgent: round3(stats.averageVisibleNeighborsPerCheckedAgent),
  averageCandidatesPerCheckedAgent: round3(stats.averageCandidatesPerCheckedAgent),
  maxVisibleNeighborsForAgent: stats.maxVisibleNeighborsForAgent
}, null, 2));

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
    .replaceAll('from "./spatialHash"', 'from "./spatialHash.mjs"')
    .replaceAll("from './spatialHash'", "from './spatialHash.mjs'")
    .replaceAll('from "./neighborQuery"', 'from "./neighborQuery.mjs"')
    .replaceAll("from './neighborQuery'", "from './neighborQuery.mjs'")
    .replaceAll('from "./sensors"', 'from "./sensors.mjs"')
    .replaceAll("from './sensors'", "from './sensors.mjs'");

  await writeFile(outputPath, outputText, "utf8");
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}
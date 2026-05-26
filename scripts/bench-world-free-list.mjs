import { rmSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL, fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tmpRoot = resolve(projectRoot, ".tmp_world_free_list_bench");

rmSync(tmpRoot, { recursive: true, force: true });
mkdirSync(tmpRoot, { recursive: true });

await transpileSimModule("arrays.ts", "arrays.mjs");
await transpileSimModule("world.ts", "world.mjs");

const worldModule = await import(pathToFileURL(join(tmpRoot, "world.mjs")).href);
const { createWorldState, getAliveCount, getReusableSlotCount, killAgent, spawnAgent } = worldModule;

const capacity = 10000;
const killSpawnOperations = 10000;
const world = createWorldState({ capacity, worldWidth: 2048, worldHeight: 2048, sectorCount: 8 });

for (let index = 0; index < capacity; index += 1) {
  spawnAgent(world, {
    x: index % 2048,
    y: Math.floor(index / 2048),
    genomeId: index + 1,
    energy: 100
  });
}

const killStart = performance.now();
for (let op = 0; op < killSpawnOperations; op += 1) {
  killAgent(world, op % capacity);
}
const killMs = performance.now() - killStart;
const reusableAfterKill = getReusableSlotCount(world);

const spawnStart = performance.now();
for (let op = 0; op < killSpawnOperations; op += 1) {
  spawnAgent(world, {
    x: (op * 17) % 2048,
    y: (op * 31) % 2048,
    genomeId: 100000 + op,
    energy: 50
  });
}
const spawnReuseMs = performance.now() - spawnStart;

const result = {
  bench: "world-free-list:m26",
  capacity,
  killSpawnOperations,
  count: world.count,
  aliveCount: getAliveCount(world),
  reusableAfterKill,
  reusableAfterReuse: getReusableSlotCount(world),
  spawnReusedSlotCount: world.spawnReusedSlotCount,
  spawnAppendedSlotCount: world.spawnAppendedSlotCount,
  killMs: round(killMs),
  spawnReuseMs: round(spawnReuseMs),
  totalMs: round(killMs + spawnReuseMs),
  opsPerSecond: Math.round((killSpawnOperations * 2) / ((killMs + spawnReuseMs) / 1000))
};

if (result.count !== capacity) {
  throw new Error(`Expected count to remain ${capacity}, got ${result.count}`);
}

if (result.aliveCount !== capacity) {
  throw new Error(`Expected aliveCount to return to ${capacity}, got ${result.aliveCount}`);
}

if (result.reusableAfterKill !== killSpawnOperations) {
  throw new Error(`Expected ${killSpawnOperations} reusable slots after kill, got ${result.reusableAfterKill}`);
}

if (result.reusableAfterReuse !== 0) {
  throw new Error(`Expected reusable slots to be consumed, got ${result.reusableAfterReuse}`);
}

if (result.spawnReusedSlotCount !== killSpawnOperations) {
  throw new Error(`Expected ${killSpawnOperations} reused spawns, got ${result.spawnReusedSlotCount}`);
}

console.log(JSON.stringify(result, null, 2));

rmSync(tmpRoot, { recursive: true, force: true });

async function transpileSimModule(sourceName, outputName) {
  const sourcePath = join(projectRoot, "src", "sim", sourceName);
  const outputPath = join(tmpRoot, outputName);
  const sourceText = readFileSync(sourcePath, "utf8");

  const transpiled = ts.transpileModule(sourceText, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      strict: true
    }
  });

  const outputText = transpiled.outputText
    .replaceAll('from "./arrays"', 'from "./arrays.mjs"')
    .replaceAll("from './arrays'", "from './arrays.mjs'");

  writeFileSync(outputPath, outputText, "utf8");
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

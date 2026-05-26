import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_world_test");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

await transpileSimModule("arrays.ts", "arrays.mjs");
await transpileSimModule("rng.ts", "rng.mjs");
await transpileSimModule("world.ts", "world.mjs");

const worldModule = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);
const rngModule = await import(pathToFileURL(join(temporaryDirectory, "rng.mjs")).href);

const {
  WORLD_STATE_VERSION,
  createWorldState,
  getAliveCount,
  getSectorOffset,
  getWorldMemoryBytes,
  killAgent,
  makeWorldSnapshot,
  resetWorldState,
  spawnAgent,
  spawnRandomAgents
} = worldModule;

const { createRng } = rngModule;

assertEqual(WORLD_STATE_VERSION, "qubok_evolve.world_state.v1", "world state version");

const world = createWorldState({ capacity: 4, worldWidth: 100, worldHeight: 50, sectorCount: 8 });
assertEqual(world.capacity, 4, "capacity");
assertEqual(world.count, 0, "initial count");
assertEqual(world.x instanceof Float32Array, true, "x is Float32Array");
assertEqual(world.alive instanceof Uint8Array, true, "alive is Uint8Array");
assertEqual(world.speciesId instanceof Uint16Array, true, "speciesId is Uint16Array");
assertEqual(world.genomeId instanceof Uint32Array, true, "genomeId is Uint32Array");
assertEqual(world.sectorFood.length, 32, "sector pool length");

const first = spawnAgent(world, {
  x: 10,
  y: 20,
  headingX: 0,
  headingY: 0,
  energy: 55,
  speciesId: 3,
  genomeId: 1001
});

assertEqual(first, 0, "first index");
assertEqual(world.count, 1, "count after first spawn");
assertEqual(world.alive[0], 1, "first alive");
assertEqual(world.x[0], 10, "first x");
assertEqual(world.y[0], 20, "first y");
assertEqual(world.headingX[0], 1, "zero heading fallback x");
assertEqual(world.headingY[0], 0, "zero heading fallback y");
assertEqual(world.energy[0], 55, "energy");
assertEqual(world.sensorSectorBase[0], 0, "first sector base");
assertEqual(getSectorOffset(world, 0, 7), 7, "sector offset 0/7");

const second = spawnAgent(world, { headingX: 0, headingY: 2 });
assertEqual(second, 1, "second index");
assertAlmostEqual(world.headingX[1], 0, 0.00001, "normalized heading x");
assertAlmostEqual(world.headingY[1], 1, 0.00001, "normalized heading y");
assertEqual(world.sensorSectorBase[1], 8, "second sector base");

spawnAgent(world);
spawnAgent(world);
assertThrows(() => spawnAgent(world), "capacity exceeded");
assertEqual(getAliveCount(world), 4, "alive count");

killAgent(world, 1);
assertEqual(getAliveCount(world), 3, "alive after kill");

const memoryBytes = getWorldMemoryBytes(world);
if (memoryBytes <= 0) {
  throw new Error(`memoryBytes must be positive. Received: ${memoryBytes}`);
}

resetWorldState(world);
assertEqual(world.count, 0, "count after reset");
assertEqual(world.tick, 0, "tick after reset");
assertEqual(world.timeSeconds, 0, "time after reset");
assertEqual(getAliveCount(world), 0, "alive after reset");
assertEqual(world.x[0], 0, "x reset");

const worldA = createWorldState({ capacity: 16, worldWidth: 256, worldHeight: 128, sectorCount: 8 });
const worldB = createWorldState({ capacity: 16, worldWidth: 256, worldHeight: 128, sectorCount: 8 });
const worldC = createWorldState({ capacity: 16, worldWidth: 256, worldHeight: 128, sectorCount: 8 });

spawnRandomAgents(worldA, 12, createRng("qubok_evolve:world:test"));
spawnRandomAgents(worldB, 12, createRng("qubok_evolve:world:test"));
spawnRandomAgents(worldC, 12, createRng("qubok_evolve:world:different"));

const snapshotA = makeWorldSnapshot(worldA, 12);
const snapshotB = makeWorldSnapshot(worldB, 12);
const snapshotC = makeWorldSnapshot(worldC, 12);

assertEqual(JSON.stringify(snapshotA), JSON.stringify(snapshotB), "deterministic random world snapshot");

if (JSON.stringify(snapshotA) === JSON.stringify(snapshotC)) {
  throw new Error("different seed should produce different world snapshot");
}

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("world tests passed");

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
    .replaceAll("from './rng'", "from './rng.mjs'");

  await writeFile(outputPath, outputText, "utf8");
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertAlmostEqual(actual, expected, epsilon, label) {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`${label}: expected ${expected} +/- ${epsilon}, got ${actual}`);
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
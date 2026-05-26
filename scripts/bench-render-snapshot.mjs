import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_render_snapshot_bench");
const temporarySimDirectory = join(temporaryDirectory, "sim");
const temporarySharedDirectory = join(temporaryDirectory, "shared");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporarySimDirectory, { recursive: true });
await mkdir(temporarySharedDirectory, { recursive: true });

for (const [source, output] of [
  ["src/shared/perfMetrics.ts", "shared/perfMetrics.mjs"],
  ["src/sim/arrays.ts", "sim/arrays.mjs"],
  ["src/sim/rng.ts", "sim/rng.mjs"],
  ["src/sim/world.ts", "sim/world.mjs"],
  ["src/sim/movement.ts", "sim/movement.mjs"],
  ["src/sim/energy.ts", "sim/energy.mjs"],
  ["src/sim/spatialHash.ts", "sim/spatialHash.mjs"],
  ["src/sim/neighborQuery.ts", "sim/neighborQuery.mjs"],
  ["src/sim/resources.ts", "sim/resources.mjs"],
  ["src/sim/renderSnapshot.ts", "sim/renderSnapshot.mjs"],
  ["src/sim/demoSimulation.ts", "sim/demoSimulation.mjs"]
]) {
  await transpileSourceModule(source, output);
}

const { computeRenderSnapshotChecksum } = await import(pathToFileURL(join(temporarySimDirectory, "renderSnapshot.mjs")).href);
const { createDemoSimulation } = await import(pathToFileURL(join(temporarySimDirectory, "demoSimulation.mjs")).href);

const tiers = [];
for (const entityCount of [1_000, 5_000, 10_000]) {
  const sim = createDemoSimulation({
    seed: `qubok_evolve:m10:render-bench:${entityCount}`,
    capacity: entityCount,
    worldWidth: 2048,
    worldHeight: 2048,
    spatialCellSize: 64,
    neighborRadius: 96,
    resourceCapacity: Math.max(2048, Math.floor(entityCount * 1.5)),
    targetResourceCount: Math.max(1024, Math.floor(entityCount * 1.2)),
    resourcePickupRadius: 8
  });

  const iterations = entityCount >= 10_000 ? 45 : 90;
  let stepMsSum = 0;
  let checksum = 0;
  let energyMsSum = 0;

  for (let index = 0; index < iterations; index += 1) {
    const start = performance.now();
    const result = sim.step(1 / 60);
    stepMsSum += performance.now() - start;
    energyMsSum += result.energyMs;
    checksum = (checksum ^ computeRenderSnapshotChecksum(result.snapshot)) >>> 0;
  }

  tiers.push({
    entityCount,
    iterations,
    avgStepMs: round3(stepMsSum / iterations),
    avgEnergyMs: round3(energyMsSum / iterations),
    finalAlive: sim.getSnapshot().aliveCount,
    checksum
  });
}

await rm(temporaryDirectory, { force: true, recursive: true });
console.log(JSON.stringify({ bench: "render-snapshot:m10", tiers }, null, 2));

async function transpileSourceModule(sourceRelativePath, outputRelativePath) {
  const sourcePath = join(projectRoot, sourceRelativePath);
  const outputPath = join(temporaryDirectory, outputRelativePath);
  const sourceText = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(sourceText, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true }
  });
  const outputText = rewriteLocalImports(transpiled.outputText);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, outputText, "utf8");
}

function rewriteLocalImports(text) {
  return text
    .replaceAll('from "./arrays"', 'from "./arrays.mjs"')
    .replaceAll("from './arrays'", "from './arrays.mjs'")
    .replaceAll('from "./rng"', 'from "./rng.mjs"')
    .replaceAll("from './rng'", "from './rng.mjs'")
    .replaceAll('from "./world"', 'from "./world.mjs"')
    .replaceAll("from './world'", "from './world.mjs'")
    .replaceAll('from "./movement"', 'from "./movement.mjs"')
    .replaceAll("from './movement'", "from './movement.mjs'")
    .replaceAll('from "./energy"', 'from "./energy.mjs"')
    .replaceAll("from './energy'", "from './energy.mjs'")
    .replaceAll('from "./spatialHash"', 'from "./spatialHash.mjs"')
    .replaceAll("from './spatialHash'", "from './spatialHash.mjs'")
    .replaceAll('from "./neighborQuery"', 'from "./neighborQuery.mjs"')
    .replaceAll("from './neighborQuery'", "from './neighborQuery.mjs'")
    .replaceAll('from "./resources"', 'from "./resources.mjs"')
    .replaceAll("from './resources'", "from './resources.mjs'")
    .replaceAll('from "./renderSnapshot"', 'from "./renderSnapshot.mjs"')
    .replaceAll("from './renderSnapshot'", "from './renderSnapshot.mjs'")
    .replaceAll('from "../shared/perfMetrics"', 'from "../shared/perfMetrics.mjs"')
    .replaceAll("from '../shared/perfMetrics'", "from '../shared/perfMetrics.mjs");
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_energy_test");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

await transpileSimModule("arrays.ts", "arrays.mjs");
await transpileSimModule("world.ts", "world.mjs");
await transpileSimModule("energy.ts", "energy.mjs");

const { createWorldState, spawnAgent } = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);
const { ENERGY_SYSTEM_VERSION, applyEnergySurvival, getEnergySummary } = await import(pathToFileURL(join(temporaryDirectory, "energy.mjs")).href);

assertEqual(ENERGY_SYSTEM_VERSION, "qubok_evolve.energy.v1", "energy system version");

const world = createWorldState({ capacity: 4, worldWidth: 100, worldHeight: 100, sectorCount: 8 });
spawnAgent(world, { energy: 10, maxEnergy: 100, health: 100, metabolism: 2 });
spawnAgent(world, { energy: 0, maxEnergy: 100, health: 0.2, metabolism: 0 });
spawnAgent(world, { energy: 0.1, maxEnergy: 100, health: 0.6, metabolism: 10 });

const stats = applyEnergySurvival(world, {
  deltaSeconds: 0.1,
  basalMetabolismScale: 1,
  starvationDamagePerSecond: 3,
  energyDebtDamageScale: 0.5,
  killOnZeroHealth: true
});

assertEqual(stats.checkedCount, 3, "checked count");
assertEqual(stats.aliveBefore, 3, "alive before");
assertEqual(stats.starvingCount, 2, "starving count");
assertEqual(stats.deathsThisStep, 2, "deaths this step");
assertEqual(stats.aliveAfter, 1, "alive after");
assertAlmostEqual(stats.basalEnergySpent, 1.2, 0.00001, "basal energy spent");
assertAlmostEqual(stats.starvationDamage, 1.05, 0.00001, "starvation damage total");
assertAlmostEqual(world.energy[0], 9.8, 0.00001, "survivor energy");
assertEqual(world.alive[0], 1, "survivor alive");
assertEqual(world.alive[1], 0, "zero energy agent dead");
assertEqual(world.alive[2], 0, "energy debt agent dead");
assertAlmostEqual(world.damageTaken[1], 0.3, 0.00001, "starvation damage agent 1");
assertAlmostEqual(world.damageTaken[2], 0.75, 0.00001, "starvation damage agent 2");

const summary = getEnergySummary(world);
assertEqual(summary.aliveCount, 1, "summary alive count");
assertEqual(summary.starvingCount, 0, "summary starving count");
assertAlmostEqual(summary.averageEnergy01, 0.098, 0.00001, "summary average energy");

const rescuedWorld = createWorldState({ capacity: 2, worldWidth: 100, worldHeight: 100, sectorCount: 8 });
spawnAgent(rescuedWorld, { energy: 0.05, maxEnergy: 100, health: 2, metabolism: 0.1 });
rescuedWorld.energy[0] += 10;
const rescuedStats = applyEnergySurvival(rescuedWorld, {
  deltaSeconds: 0.1,
  basalMetabolismScale: 1,
  starvationDamagePerSecond: 20,
  energyDebtDamageScale: 1,
  killOnZeroHealth: true
});
assertEqual(rescuedStats.starvingCount, 0, "rescued starving count");
assertEqual(rescuedStats.deathsThisStep, 0, "rescued deaths");
assertEqual(rescuedWorld.alive[0], 1, "rescued agent alive");

assertThrows(() => applyEnergySurvival(world, { deltaSeconds: 0 }), "delta zero rejected");
assertThrows(() => applyEnergySurvival(world, { deltaSeconds: 1 }), "delta too large rejected");
assertThrows(() => applyEnergySurvival(world, { deltaSeconds: Number.NaN }), "delta NaN rejected");

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("energy tests passed");

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
    .replaceAll('from "./world"', 'from "./world.mjs"')
    .replaceAll("from './world'", "from './world.mjs'");
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

function assertAlmostEqual(actual, expected, epsilon, label) {
  if (Math.abs(actual - expected) > epsilon) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

function assertThrows(fn, label) {
  let threw = false;
  try { fn(); } catch { threw = true; }
  if (!threw) throw new Error(`${label}: expected throw`);
}
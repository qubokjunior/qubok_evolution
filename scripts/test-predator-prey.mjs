import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_predator_prey_test");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

await transpileSimModule("arrays.ts", "arrays.mjs");
await transpileSimModule("world.ts", "world.mjs");
await transpileSimModule("spatialHash.ts", "spatialHash.mjs");
await transpileSimModule("neighborQuery.ts", "neighborQuery.mjs");
await transpileSimModule("predatorPrey.ts", "predatorPrey.mjs");

const { createWorldState, spawnAgent } = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);
const { buildSpatialHashGrid, createSpatialHashGrid } = await import(pathToFileURL(join(temporaryDirectory, "spatialHash.mjs")).href);
const {
  DIET_MEAT,
  DIET_PLANT,
  DIET_OMNIVORE,
  PREDATOR_PREY_SYSTEM_VERSION,
  applyPredatorPreyInteraction
} = await import(pathToFileURL(join(temporaryDirectory, "predatorPrey.mjs")).href);

assertEqual(PREDATOR_PREY_SYSTEM_VERSION, "qubok_evolve.predator_prey.v1", "system version");
assertEqual(DIET_OMNIVORE, DIET_MEAT | DIET_PLANT, "omnivore mask");

{
  const { world, grid } = makeWorldAndGrid(8);
  const predator = spawnAgent(world, {
    x: 10,
    y: 10,
    dietMask: DIET_MEAT,
    speciesId: 1,
    mouthPower: 20,
    energy: 20,
    maxEnergy: 100,
    health: 100
  });
  const prey = spawnAgent(world, {
    x: 15,
    y: 10,
    dietMask: DIET_PLANT,
    speciesId: 2,
    armor: 0,
    health: 15,
    energy: 30,
    maxEnergy: 60
  });
  buildSpatialHashGrid(grid, world);

  const stats = applyPredatorPreyInteraction(world, grid, {
    attackRadius: 10,
    damageScale: 1,
    actionEnergyCost: 1,
    energyGainPerDamage: 0,
    preyEnergyHarvestRatio: 0,
    sameSpeciesProtection: true
  });

  assertEqual(stats.checkedCount, 1, "checked count after prey dies before its loop turn");
  assertEqual(stats.eligiblePredatorCount, 1, "eligible predator count");
  assertEqual(stats.attacksThisStep, 1, "attack count");
  assertEqual(stats.killsThisStep, 1, "kill count");
  assertClose(stats.damageDealt, 20, 0.00001, "damage dealt");
  assertEqual(world.alive[prey], 0, "prey dead");
  assertEqual(world.kills[predator], 1, "predator kill counter");
  assertClose(world.energy[predator], 19, 0.00001, "predator paid action cost");
}

{
  const { world, grid } = makeWorldAndGrid(8);
  const predator = spawnAgent(world, {
    x: 20,
    y: 20,
    dietMask: DIET_MEAT,
    speciesId: 1,
    mouthPower: 10,
    energy: 40,
    maxEnergy: 100,
    health: 100
  });
  const prey = spawnAgent(world, {
    x: 26,
    y: 20,
    dietMask: DIET_PLANT,
    speciesId: 2,
    armor: 2,
    health: 100,
    energy: 50,
    maxEnergy: 50
  });
  buildSpatialHashGrid(grid, world);

  const stats = applyPredatorPreyInteraction(world, grid, {
    attackRadius: 12,
    damageScale: 1,
    armorAbsorptionScale: 1,
    minimumDamage: 0,
    actionEnergyCost: 1,
    energyGainPerDamage: 0.5,
    preyEnergyHarvestRatio: 0
  });

  assertEqual(stats.attacksThisStep, 1, "single damage attack");
  assertEqual(stats.killsThisStep, 0, "no kill on partial damage");
  assertClose(stats.damageDealt, 8, 0.00001, "armor-reduced damage");
  assertClose(world.health[prey], 92, 0.00001, "prey health after hit");
  assertClose(world.energy[predator], 43, 0.00001, "predator energy gain minus action cost");
  assertEqual(world.alive[prey], 1, "prey still alive");
}

{
  const { world, grid } = makeWorldAndGrid(8);
  spawnAgent(world, { x: 10, y: 10, dietMask: DIET_MEAT, speciesId: 7, mouthPower: 50, energy: 20, maxEnergy: 100 });
  const sameSpeciesPrey = spawnAgent(world, { x: 11, y: 10, dietMask: DIET_PLANT, speciesId: 7, health: 20, energy: 10 });
  buildSpatialHashGrid(grid, world);

  const protectedStats = applyPredatorPreyInteraction(world, grid, {
    attackRadius: 10,
    sameSpeciesProtection: true
  });

  assertEqual(protectedStats.attacksThisStep, 0, "same species protected");
  assertEqual(protectedStats.rejectedSameSpeciesCount, 1, "same species rejected count");
  assertEqual(world.alive[sameSpeciesPrey], 1, "same species prey survives");

  const unprotectedStats = applyPredatorPreyInteraction(world, grid, {
    attackRadius: 10,
    sameSpeciesProtection: false,
    preyEnergyHarvestRatio: 0,
    energyGainPerDamage: 0
  });

  assertEqual(unprotectedStats.attacksThisStep, 1, "same species can be attacked when disabled");
  assertEqual(world.alive[sameSpeciesPrey], 0, "same species prey dead after disabled protection");
}

{
  const { world, grid } = makeWorldAndGrid(12);
  spawnAgent(world, { x: 50, y: 50, dietMask: DIET_MEAT, speciesId: 1, mouthPower: 20, energy: 80, maxEnergy: 100 });
  const preyA = spawnAgent(world, { x: 52, y: 50, dietMask: DIET_PLANT, speciesId: 2, health: 8, energy: 10 });
  const preyB = spawnAgent(world, { x: 54, y: 50, dietMask: DIET_PLANT, speciesId: 2, health: 8, energy: 10 });
  const preyC = spawnAgent(world, { x: 80, y: 50, dietMask: DIET_PLANT, speciesId: 2, health: 8, energy: 10 });
  buildSpatialHashGrid(grid, world);

  const stats = applyPredatorPreyInteraction(world, grid, {
    attackRadius: 10,
    maxAttacksPerPredator: 2,
    energyGainPerDamage: 0,
    preyEnergyHarvestRatio: 0
  });

  assertEqual(stats.attacksThisStep, 2, "max two attacks");
  assertEqual(stats.killsThisStep, 2, "two kills");
  assertEqual(world.alive[preyA], 0, "prey A dead");
  assertEqual(world.alive[preyB], 0, "prey B dead");
  assertEqual(world.alive[preyC], 1, "out-of-radius prey survives");
}

{
  const { world, grid } = makeWorldAndGrid(8);
  spawnAgent(world, { x: 10, y: 10, dietMask: DIET_PLANT, speciesId: 1, mouthPower: 50, energy: 50 });
  spawnAgent(world, { x: 11, y: 10, dietMask: DIET_PLANT, speciesId: 2, health: 10 });
  buildSpatialHashGrid(grid, world);
  const stats = applyPredatorPreyInteraction(world, grid, { attackRadius: 10 });
  assertEqual(stats.eligiblePredatorCount, 0, "plant-only eater is not predator");
  assertEqual(stats.attacksThisStep, 0, "no attack from non-predator");
}

assertThrows(() => applyPredatorPreyInteraction(makeWorldAndGrid(2).world, makeWorldAndGrid(2).grid, { attackRadius: 0 }), "zero radius");
assertThrows(() => applyPredatorPreyInteraction(makeWorldAndGrid(2).world, makeWorldAndGrid(2).grid, { predatorDietMask: 0 }), "zero predator mask");
assertThrows(() => applyPredatorPreyInteraction(makeWorldAndGrid(2).world, makeWorldAndGrid(2).grid, { maxAttacksPerPredator: -1 }), "negative max attacks");

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("predator prey tests passed");

function makeWorldAndGrid(capacity) {
  const world = createWorldState({ capacity, worldWidth: 128, worldHeight: 128, sectorCount: 8 });
  const grid = createSpatialHashGrid({ capacity, worldWidth: 128, worldHeight: 128, cellSize: 16 });
  return { world, grid };
}

async function transpileSimModule(sourceName, outputName) {
  const sourcePath = join(projectRoot, "src", "sim", sourceName);
  const sourceText = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(sourceText, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true }
  });
  let output = transpiled.outputText
    .replaceAll('from "./arrays"', 'from "./arrays.mjs"')
    .replaceAll('from "./world"', 'from "./world.mjs"')
    .replaceAll('from "./spatialHash"', 'from "./spatialHash.mjs"')
    .replaceAll('from "./neighborQuery"', 'from "./neighborQuery.mjs"');
  await writeFile(join(temporaryDirectory, outputName), output, "utf8");
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertClose(actual, expected, tolerance, label) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertThrows(fn, label) {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  if (!threw) {
    throw new Error(`${label}: expected throw`);
  }
}
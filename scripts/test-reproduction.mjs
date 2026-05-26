import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_reproduction_test");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

await transpileSimModule("arrays.ts", "arrays.mjs");
await transpileSimModule("rng.ts", "rng.mjs");
await transpileSimModule("mutation.ts", "mutation.mjs");
await transpileSimModule("world.ts", "world.mjs");
await transpileSimModule("reproduction.ts", "reproduction.mjs");

const { createRng } = await import(pathToFileURL(join(temporaryDirectory, "rng.mjs")).href);
const { createWorldState, spawnAgent } = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);
const {
  applyReproduction,
  createReproductionMutationRules,
  REPRODUCTION_SYSTEM_VERSION
} = await import(pathToFileURL(join(temporaryDirectory, "reproduction.mjs")).href);

assertEqual(REPRODUCTION_SYSTEM_VERSION, "qubok_evolve.reproduction.v2", "system version");

{
  const rules = createReproductionMutationRules(0.25, 2);
  assertEqual(rules.radius.probability, 0.25, "rule probability override");
  assertClose(rules.radius.standardDeviation, 0.36, 0.000001, "rule standard deviation scale");
}

{
  const world = createWorldState({ capacity: 8, worldWidth: 100, worldHeight: 100 });
  const parent = spawnAgent(world, {
    x: 50,
    y: 50,
    vx: 10,
    vy: -4,
    radius: 3,
    mass: 2,
    drag: 0.03,
    maxSpeed: 80,
    turnRate: 5,
    energy: 120,
    maxEnergy: 150,
    stamina: 40,
    maxStamina: 60,
    health: 90,
    metabolism: 0.1,
    speciesId: 3,
    genomeId: 77,
    generationId: 4,
    colorRGBA: 0xaabbccff
  });
  world.age[parent] = 9;

  const stats = applyReproduction(world, createRng("birth-basic"), {
    energyThreshold: 100,
    energyCost: 40,
    childEnergy: 30,
    minAgeSeconds: 2,
    maxBirthsPerStep: 1,
    spawnRadius: 0,
    mutationStandardDeviationScale: 0,
    mutationChance: 1,
    inheritVelocityScale: 0.5
  });

  assertEqual(stats.checkedCount, 1, "checked count");
  assertEqual(stats.eligibleCount, 1, "eligible count");
  assertEqual(stats.birthsThisStep, 1, "birth count");
  assertEqual(stats.blockedByCapacity, 0, "blocked count");
  assertEqual(stats.mutationAttempts, 17, "mutation attempts from dedicated module");
  assertEqual(stats.mutationChangedCount, 0, "zero scale mutation changes nothing");
  assertEqual(world.count, 2, "world count after birth");
  assertClose(world.energy[parent], 80, 0.00001, "parent energy after cost");
  assertClose(world.energy[1], 30, 0.00001, "child energy");
  assertEqual(world.parentGenomeId[1], 77, "child parent genome id");
  assertEqual(world.generationId[1], 5, "child generation id");
  assertEqual(world.offspringCount[parent], 1, "parent offspring count");
  assertEqual(world.speciesId[1], 3, "child species id");
  assertEqual(world.colorRGBA[1], 0xaabbccff, "child color");
  assertClose(world.radius[1], world.radius[parent], 0.00001, "child radius inheritance with zero mutation");
}

{
  const world = createWorldState({ capacity: 8, worldWidth: 100, worldHeight: 100 });
  const parent = spawnAgent(world, {
    energy: 120,
    maxEnergy: 150,
    age: 0,
    radius: 3,
    mass: 2,
    maxSpeed: 80,
    genomeId: 20
  });
  world.age[parent] = 10;
  const stats = applyReproduction(world, createRng("forced-mutation"), {
    energyThreshold: 100,
    energyCost: 40,
    childEnergy: 30,
    minAgeSeconds: 2,
    maxBirthsPerStep: 1,
    spawnRadius: 0,
    mutationChance: 1,
    mutationStandardDeviationScale: 1
  });

  assertEqual(stats.birthsThisStep, 1, "forced mutation birth count");
  assertEqual(stats.mutationAttempts, 17, "forced mutation attempts");
  if (stats.mutationChangedCount <= 0) {
    throw new Error("forced mutation should change at least one phenotype parameter");
  }
  if (stats.mutationAbsoluteDeltaSum <= 0) {
    throw new Error("forced mutation should accumulate absolute mutation delta");
  }
}

{
  const world = createWorldState({ capacity: 4, worldWidth: 100, worldHeight: 100 });
  const parent = spawnAgent(world, { energy: 40, maxEnergy: 100, genomeId: 1 });
  world.age[parent] = 100;
  const stats = applyReproduction(world, createRng("too-low-energy"), { energyThreshold: 60 });
  assertEqual(stats.birthsThisStep, 0, "no birth below energy threshold");
  assertEqual(world.count, 1, "world count below threshold");
}

{
  const world = createWorldState({ capacity: 4, worldWidth: 100, worldHeight: 100 });
  const parent = spawnAgent(world, { energy: 100, maxEnergy: 100, genomeId: 1 });
  world.age[parent] = 0.5;
  const stats = applyReproduction(world, createRng("too-young"), { energyThreshold: 80, minAgeSeconds: 2 });
  assertEqual(stats.birthsThisStep, 0, "no birth below min age");
  assertEqual(world.count, 1, "world count below age");
}

{
  const world = createWorldState({ capacity: 2, worldWidth: 100, worldHeight: 100 });
  const a = spawnAgent(world, { energy: 100, maxEnergy: 100, genomeId: 1 });
  const b = spawnAgent(world, { energy: 100, maxEnergy: 100, genomeId: 2 });
  world.age[a] = 10;
  world.age[b] = 10;
  const stats = applyReproduction(world, createRng("capacity-block"), { energyThreshold: 80, minAgeSeconds: 1 });
  assertEqual(stats.birthsThisStep, 0, "no birth when capacity full");
  assertEqual(stats.blockedByCapacity, 2, "capacity blocked two eligible parents");
}

{
  const worldA = makeDeterminismWorld();
  const worldB = makeDeterminismWorld();
  const config = {
    energyThreshold: 80,
    energyCost: 25,
    childEnergy: 20,
    minAgeSeconds: 1,
    maxBirthsPerStep: 3,
    spawnRadius: 12,
    mutationChance: 1,
    mutationStandardDeviationScale: 1
  };
  const statsA = applyReproduction(worldA, createRng("same-seed"), config);
  const statsB = applyReproduction(worldB, createRng("same-seed"), config);

  assertEqual(statsA.birthsThisStep, statsB.birthsThisStep, "deterministic birth count");
  assertEqual(statsA.mutationChangedCount, statsB.mutationChangedCount, "deterministic mutation count");
  assertClose(statsA.mutationAbsoluteDeltaSum, statsB.mutationAbsoluteDeltaSum, 0.00001, "deterministic mutation delta sum");
  assertEqual(worldA.count, worldB.count, "deterministic world count");
  for (let index = 0; index < worldA.count; index += 1) {
    assertClose(worldA.x[index], worldB.x[index], 0.00001, `deterministic x ${index}`);
    assertClose(worldA.y[index], worldB.y[index], 0.00001, `deterministic y ${index}`);
    assertClose(worldA.radius[index], worldB.radius[index], 0.00001, `deterministic radius ${index}`);
    assertClose(worldA.maxSpeed[index], worldB.maxSpeed[index], 0.00001, `deterministic maxSpeed ${index}`);
    assertEqual(worldA.genomeId[index], worldB.genomeId[index], `deterministic genome ${index}`);
  }
}

{
  const world = makeDeterminismWorld();
  const stats = applyReproduction(world, createRng("max-births"), {
    energyThreshold: 80,
    minAgeSeconds: 1,
    maxBirthsPerStep: 2,
    mutationStandardDeviationScale: 0
  });
  assertEqual(stats.eligibleCount, 5, "eligible before max cap");
  assertEqual(stats.birthsThisStep, 2, "max births per step respected");
}

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("reproduction tests passed");

async function transpileSimModule(sourceName, outputName) {
  const sourcePath = join(projectRoot, "src", "sim", sourceName);
  const sourceText = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(sourceText, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      strict: true
    }
  });
  let output = transpiled.outputText.replaceAll('from "./arrays"', 'from "./arrays.mjs"');
  output = output.replaceAll('from "./rng"', 'from "./rng.mjs"');
  output = output.replaceAll('from "./world"', 'from "./world.mjs"');
  output = output.replaceAll('from "./mutation"', 'from "./mutation.mjs"');
  await writeFile(join(temporaryDirectory, outputName), output, "utf8");
}

function makeDeterminismWorld() {
  const world = createWorldState({ capacity: 12, worldWidth: 120, worldHeight: 120 });
  for (let index = 0; index < 5; index += 1) {
    const agent = spawnAgent(world, {
      x: 20 + index * 8,
      y: 40 + index * 5,
      vx: index,
      vy: -index,
      radius: 3 + index * 0.1,
      mass: 1 + index * 0.05,
      energy: 100 + index,
      maxEnergy: 140,
      maxSpeed: 60 + index,
      genomeId: 100 + index,
      generationId: index,
      speciesId: index % 2
    });
    world.age[agent] = 5 + index;
  }
  return world;
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
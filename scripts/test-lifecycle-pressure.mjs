import { rmSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceSimDir = resolve(projectRoot, "src/sim");
const tmpRoot = resolve(projectRoot, ".tmp_lifecycle_pressure_test");
const tmpSimDir = resolve(tmpRoot, "sim");

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

rmSync(tmpRoot, { recursive: true, force: true });
mkdirSync(tmpSimDir, { recursive: true });

for (const entry of readdirSync(sourceSimDir)) {
  if (!entry.endsWith(".ts")) {
    continue;
  }

  const sourcePath = join(sourceSimDir, entry);
  const source = readFileSync(sourcePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    fileName: sourcePath,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      isolatedModules: true,
      removeComments: false
    },
    reportDiagnostics: true
  });

  const blockingDiagnostics = (transpiled.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
  );

  if (blockingDiagnostics.length > 0) {
    const message = blockingDiagnostics
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))
      .join("\n");
    throw new Error(`TypeScript transpile failed for ${entry}:\n${message}`);
  }

  const output = rewriteRelativeImports(transpiled.outputText);
  const outputName = basename(entry, ".ts") + ".mjs";
  writeFileSync(join(tmpSimDir, outputName), output, "utf8");
}

const demoSimulationModule = await import(pathToFileURL(join(tmpSimDir, "demoSimulation.mjs")).href);
const worldModule = await import(pathToFileURL(join(tmpSimDir, "world.mjs")).href);
const spatialHashModule = await import(pathToFileURL(join(tmpSimDir, "spatialHash.mjs")).href);
const predatorPreyModule = await import(pathToFileURL(join(tmpSimDir, "predatorPrey.mjs")).href);

const { createDemoSimulation } = demoSimulationModule;
const { createWorldState, getReusableSlotCount, spawnAgent } = worldModule;
const { buildSpatialHashGrid, createSpatialHashGrid } = spatialHashModule;
const { DIET_MEAT, DIET_PLANT, applyPredatorPreyInteraction } = predatorPreyModule;

// m28 loop under test: death -> reusable slot -> birth.
{
  const demo = createDemoSimulation({
    seed: "qubok_evolve:test:lifecycle_pressure:m28",
    capacity: 12,
    initialAgentCount: 12,
    worldWidth: 512,
    worldHeight: 512,
    resourceCapacity: 16,
    targetResourceCount: 0,
    reproductionEnergyThreshold: 88,
    spawnMaxAttempts: 64,
    spawnClearanceRadius: 0
  });

  const world = demo.world;
  assert(world.count === world.capacity, "scenario must begin at capacity");
  assert(world.reusableSlotCount === 0, "scenario must begin without reusable slots");

  const parent = 0;
  const victim = 1;

  for (let index = 0; index < world.count; index += 1) {
    world.alive[index] = 1;
    world.reusableSlotFlags[index] = 0;
    world.energy[index] = 10;
    world.maxEnergy[index] = 100;
    world.health[index] = 100;
    world.age[index] = 0;
    world.metabolism[index] = 0;
    world.mouthPower[index] = 0;
    world.dietMask[index] = DIET_PLANT;
    world.speciesId[index] = index + 1;
    world.vx[index] = 0;
    world.vy[index] = 0;
  }

  world.reusableSlotCount = 0;
  world.spawnReusedSlotCount = 0;

  world.x[parent] = 32;
  world.y[parent] = 32;
  world.energy[parent] = 150;
  world.maxEnergy[parent] = 200;
  world.health[parent] = 100;
  world.age[parent] = 10;
  world.metabolism[parent] = 0;
  world.mouthPower[parent] = 0;
  world.dietMask[parent] = DIET_PLANT;
  world.speciesId[parent] = 77;
  world.genomeId[parent] = 9001;

  world.health[victim] = 0;
  world.energy[victim] = 0;

  const appendedBefore = world.spawnAppendedSlotCount;
  const reusedBefore = world.spawnReusedSlotCount;

  const result = demo.step(1 / 60);

  assert(result.energyStats.deathsThisStep === 1, `expected exactly one energy death, got ${result.energyStats.deathsThisStep}`);
  assert(result.reproductionStats.eligibleCount >= 1, "controlled parent should be reproduction-eligible");
  assert(result.reproductionStats.birthsThisStep === 1, `expected one birth into reusable slot, got ${result.reproductionStats.birthsThisStep}`);
  assert(result.reproductionStats.blockedByCapacity === 0, "capacity should not block while the death-created slot is reusable");
  assert(world.count === world.capacity, "reuse must not append beyond capacity");
  assert(world.spawnAppendedSlotCount === appendedBefore, "controlled birth should not append a new historical slot");
  assert(world.spawnReusedSlotCount === reusedBefore + 1, "controlled birth should reuse the death-created slot");
  assert(world.reusableSlotCount === 0, "birth should consume the reusable slot in the same tick");
  assert(result.snapshot.spawnReusedSlotCount === world.spawnReusedSlotCount, "snapshot must expose reused spawn count");
  assert(result.snapshot.reusableSlotCount === world.reusableSlotCount, "snapshot must expose current reusable slot count");
  assert(result.snapshotStats.aliveCount === world.capacity, "one death plus one birth should restore alive population to capacity");
}

// Predator/prey kill path must also feed the same free-list.
{
  const world = createWorldState({ capacity: 2, worldWidth: 128, worldHeight: 128, sectorCount: 8 });
  const predator = spawnAgent(world, {
    x: 10,
    y: 10,
    energy: 50,
    maxEnergy: 100,
    health: 100,
    dietMask: DIET_MEAT,
    mouthPower: 20,
    speciesId: 1,
    genomeId: 1
  });
  const prey = spawnAgent(world, {
    x: 11,
    y: 10,
    energy: 30,
    maxEnergy: 100,
    health: 4,
    dietMask: DIET_PLANT,
    armor: 0,
    speciesId: 2,
    genomeId: 2
  });

  const grid = createSpatialHashGrid({ capacity: 2, worldWidth: 128, worldHeight: 128, cellSize: 32 });
  buildSpatialHashGrid(grid, world);

  const stats = applyPredatorPreyInteraction(world, grid, {
    attackRadius: 8,
    maxAttacksPerPredator: 1,
    damageScale: 1,
    sameSpeciesProtection: true,
    actionEnergyCost: 0,
    energyGainPerDamage: 0,
    preyEnergyHarvestRatio: 0
  });

  assert(predator === 0, "predator index sanity");
  assert(prey === 1, "prey index sanity");
  assert(stats.killsThisStep === 1, "predator/prey should kill prey in controlled setup");
  assert(world.alive[prey] === 0, "prey should be dead after attack");
  assert(getReusableSlotCount(world) === 1, "predator/prey kill should create one reusable slot");

  const reused = spawnAgent(world, { x: 50, y: 50, genomeId: 3 });
  assert(reused === prey, "spawn after predator/prey death should reuse prey slot");
}

rmSync(tmpRoot, { recursive: true, force: true });
console.log("lifecycle pressure tests passed");

function rewriteRelativeImports(source) {
  return source
    .replace(/(from\s+["'])(\.{1,2}\/[^"']+)(["'])/g, (_, prefix, specifier, suffix) => {
      return `${prefix}${toMjsSpecifier(specifier)}${suffix}`;
    })
    .replace(/(import\s*\(\s*["'])(\.{1,2}\/[^"']+)(["']\s*\))/g, (_, prefix, specifier, suffix) => {
      return `${prefix}${toMjsSpecifier(specifier)}${suffix}`;
    });
}

function toMjsSpecifier(specifier) {
  if (/\.(mjs|js|json)$/.test(specifier)) {
    return specifier;
  }

  return `${specifier}.mjs`;
}

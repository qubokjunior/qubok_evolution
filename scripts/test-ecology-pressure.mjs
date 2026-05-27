import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_ecology_pressure_test");
const simModules = [
  "arrays",
  "world",
  "rng",
  "resources",
  "energy",
  "mutation",
  "terrain",
  "obstacleMask",
  "spawnValidation",
  "reproduction",
  "spatialHash",
  "neighborQuery",
  "predatorPrey",
  "ecologyPressure"
];

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });
for (const moduleName of simModules) await transpileSimModule(`${moduleName}.ts`, `${moduleName}.mjs`);

const { createWorldState, spawnAgent } = await importSimModule("world");
const { createRng } = await importSimModule("rng");
const { createResourceLayer, spawnResource, rebuildResourceGrid, consumeResourcesForWorld } = await importSimModule("resources");
const { applyEnergySurvival } = await importSimModule("energy");
const { applyReproduction } = await importSimModule("reproduction");
const { createSpatialHashGrid, buildSpatialHashGrid } = await importSimModule("spatialHash");
const { applyPredatorPreyInteraction, DIET_MEAT, DIET_PLANT } = await importSimModule("predatorPrey");
const {
  ECOLOGY_PRESSURE_VERSION,
  ECOLOGY_PRESSURE_PRESETS,
  ECOLOGY_PRESSURE_PRESET_CONFIGS,
  DEFAULT_ECOLOGY_PRESSURE_CONFIG,
  isEcologyPressurePreset,
  makeEcologyPressureConfig,
  makeEcologyPressureReadout
} = await importSimModule("ecologyPressure");

assertEqual(ECOLOGY_PRESSURE_VERSION, "qubok_evolve.ecology_pressure.m50", "ecology pressure version");
assert(ECOLOGY_PRESSURE_PRESETS.includes("neutral_lab"), "neutral preset missing");
assert(ECOLOGY_PRESSURE_PRESETS.includes("scarce_food"), "scarce food preset missing");
assert(ECOLOGY_PRESSURE_PRESETS.includes("predator_pressure"), "predator pressure preset missing");
assert(ECOLOGY_PRESSURE_PRESETS.includes("terrain_habitat"), "terrain habitat preset missing");
assert(ECOLOGY_PRESSURE_PRESETS.includes("field_current_stress"), "field current stress preset missing");
assertEqual(DEFAULT_ECOLOGY_PRESSURE_CONFIG.ecologyPreset, "neutral_lab", "default preset");
assertEqual(isEcologyPressurePreset("predator_pressure"), true, "known preset guard");
assertEqual(isEcologyPressurePreset("unknown"), false, "unknown preset guard");
assertEqual(Object.keys(ECOLOGY_PRESSURE_PRESET_CONFIGS).length, ECOLOGY_PRESSURE_PRESETS.length, "preset config count");
assertEqual(ECOLOGY_PRESSURE_PRESET_CONFIGS.neutral_lab.basalMetabolismScale, undefined, "neutral preset should inherit neutral defaults");

const resolvedDefault = makeEcologyPressureConfig({}, { resourceCapacity: 1024 });
assertEqual(resolvedDefault.ecologyPreset, "neutral_lab", "default resolved preset");
assertEqual(resolvedDefault.resourceTargetCount, 1024, "resource target clamps to capacity");
assertEqual(resolvedDefault.basalMetabolismScale, 0, "default basal scale keeps current demo neutral");

const scarceFoodPreset = makeEcologyPressureConfig({ ecologyPreset: "scarce_food" }, { resourceCapacity: 4096 });
assertEqual(scarceFoodPreset.ecologyPreset, "scarce_food", "scarce preset key");
assertEqual(scarceFoodPreset.resourceTargetCount, 600, "scarce preset resource target");
assertEqual(scarceFoodPreset.basalMetabolismScale, 1, "scarce preset metabolism");
assertEqual(scarceFoodPreset.starvationEnergyThreshold, 4, "scarce preset starvation threshold");
assertEqual(scarceFoodPreset.reproductionEnergyThreshold, 96, "scarce preset reproduction threshold");
assertEqual(scarceFoodPreset.reproductionEnergyCost, 52, "scarce preset reproduction cost");

const predatorPreset = makeEcologyPressureConfig({ ecologyPreset: "predator_pressure" }, { resourceCapacity: 4096 });
assertEqual(predatorPreset.resourceTargetCount, 1800, "predator preset resource target");
assertAlmostEqual(predatorPreset.basalMetabolismScale, 0.35, 0.000001, "predator preset metabolism");
assertEqual(predatorPreset.predatorAttackRadius, 36, "predator preset radius");
assertAlmostEqual(predatorPreset.predatorDamageScale, 1.35, 0.000001, "predator preset damage scale");

const terrainPreset = makeEcologyPressureConfig({ ecologyPreset: "terrain_habitat" }, { resourceCapacity: 4096 });
assertEqual(terrainPreset.resourceTargetCount, 1600, "terrain preset resource target");
assertAlmostEqual(terrainPreset.basalMetabolismScale, 0.5, 0.000001, "terrain preset metabolism");

const fieldPreset = makeEcologyPressureConfig({ ecologyPreset: "field_current_stress" }, { resourceCapacity: 4096 });
assertEqual(fieldPreset.resourceTargetCount, 1800, "field preset resource target");
assertAlmostEqual(fieldPreset.basalMetabolismScale, 0.75, 0.000001, "field preset metabolism");
assertEqual(fieldPreset.reproductionEnergyCost, 48, "field preset reproduction cost");

const overriddenPreset = makeEcologyPressureConfig({ ecologyPreset: "scarce_food", resourceTargetCount: 333, basalMetabolismScale: 2.25 }, { resourceCapacity: 4096 });
assertEqual(overriddenPreset.resourceTargetCount, 333, "explicit resource target overrides preset");
assertAlmostEqual(overriddenPreset.basalMetabolismScale, 2.25, 0.000001, "explicit metabolism overrides preset");

const resolved = makeEcologyPressureConfig({
  ecologyPreset: "scarce_food",
  basalMetabolismScale: 2,
  starvationEnergyThreshold: -10,
  starvationDamagePerSecond: Number.NaN,
  resourceTargetCount: 9999,
  resourceRespawnPerSecond: 12.5,
  reproductionEnergyThreshold: 70,
  reproductionEnergyCost: 30,
  predatorAttackRadius: 44,
  predatorDamageScale: 1.25
}, { resourceCapacity: 256 });
assertEqual(resolved.ecologyPreset, "scarce_food", "resolved preset");
assertEqual(resolved.resourceTargetCount, 256, "resource target clamped");
assertEqual(resolved.starvationEnergyThreshold, 0, "starvation threshold clamps low");
assertEqual(resolved.starvationDamagePerSecond, 0, "nan damage falls back to min");
assertAlmostEqual(resolved.resourceRespawnPerSecond, 12.5, 0.000001, "respawn rate");
assertAlmostEqual(resolved.predatorDamageScale, 1.25, 0.000001, "predator damage scale");

const shapeWorld = {
  capacity: 4,
  count: 4,
  reusableSlotCount: 1,
  alive: Uint8Array.from([1, 1, 0, 1]),
  energy: Float32Array.from([50, 10, 0, 100]),
  maxEnergy: Float32Array.from([100, 100, 100, 100])
};
const shapeResources = { aliveCount: 7 };
const shapeReadout = makeEcologyPressureReadout({
  world: shapeWorld,
  resources: shapeResources,
  config: resolved,
  energyStats: { averageEnergy01: 0.533333333, aliveAfter: 3, starvingCount: 1, starvationDamage: 4.5, deathsThisStep: 2 },
  reproductionStats: { birthsThisStep: 3, blockedByCapacity: 5 },
  predatorPreyStats: { attacksThisStep: 6, killsThisStep: 2 },
  resourcePickupStats: { consumedCount: 9, energyTransferred: 81 },
  resourceRespawnStats: { spawnedCount: 11 }
});
assertEqual(shapeReadout.version, ECOLOGY_PRESSURE_VERSION, "readout version");
assertEqual(shapeReadout.ecologyPreset, "scarce_food", "readout preset");
assertEqual(shapeReadout.resourceTargetCount, 256, "readout resource target");
assertEqual(shapeReadout.resourceAliveCount, 7, "readout resource alive");
assertEqual(shapeReadout.foodPickupCount, 9, "readout pickups");
assertAlmostEqual(shapeReadout.minimumEnergy01, 0.1, 0.000001, "minimum energy");
assertAlmostEqual(shapeReadout.maximumEnergy01, 1, 0.000001, "maximum energy");
assertEqual(shapeReadout.birthsThisStep, 3, "births");
assertEqual(shapeReadout.blockedBirthsByCapacity, 5, "blocked births");
assertEqual(shapeReadout.predatorKillsThisStep, 2, "predator kills");
assertAlmostEqual(shapeReadout.populationPressure01, 0.75, 0.000001, "population pressure");

const foodWorld = createWorldState({ capacity: 1, worldWidth: 64, worldHeight: 64, sectorCount: 4 });
const eater = spawnAgent(foodWorld, { x: 16, y: 16, radius: 2, energy: 10, maxEnergy: 100, health: 100, metabolism: 0.02 });
const foodLayer = createResourceLayer({ capacity: 2, worldWidth: 64, worldHeight: 64, cellSize: 16 });
spawnResource(foodLayer, { x: 16, y: 16, energy: 15, radius: 2 });
rebuildResourceGrid(foodLayer);
const pickupStats = consumeResourcesForWorld(foodLayer, foodWorld, { pickupRadius: 4, maxPickupsPerAgent: 1 });
assertEqual(pickupStats.consumedCount, 1, "scarce food pickup consumed");
assertAlmostEqual(pickupStats.energyTransferred, 15, 0.000001, "scarce food energy transferred");
assertAlmostEqual(foodWorld.energy[eater], 25, 0.000001, "eater energy after pickup");
assertEqual(foodLayer.aliveCount, 0, "resource alive after pickup");
const foodEnergyStats = applyEnergySurvival(foodWorld, { deltaSeconds: 0.1, basalMetabolismScale: 1, starvationEnergyThreshold: 1, starvationDamagePerSecond: 18, killOnZeroHealth: true });
assert(foodEnergyStats.basalEnergySpent > 0, "scarce food scenario must spend basal energy");
assertEqual(foodEnergyStats.deathsThisStep, 0, "scarce food eater should survive this step");

const starvationWorld = createWorldState({ capacity: 2, worldWidth: 64, worldHeight: 64, sectorCount: 4 });
const starving = spawnAgent(starvationWorld, { x: 8, y: 8, energy: 0, maxEnergy: 100, health: 1, metabolism: 0 });
const starvationStats = applyEnergySurvival(starvationWorld, { deltaSeconds: 0.1, basalMetabolismScale: 0, starvationEnergyThreshold: 10, starvationDamagePerSecond: 20, energyDebtDamageScale: 1, killOnZeroHealth: true });
assertEqual(starvationStats.starvingCount, 1, "starving count");
assertEqual(starvationStats.deathsThisStep, 1, "starvation death count");
assertEqual(starvationWorld.alive[starving], 0, "starving agent killed");
assertEqual(starvationWorld.reusableSlotCount, 1, "starvation death produces reusable slot");
const reused = spawnAgent(starvationWorld, { x: 12, y: 12 });
assertEqual(reused, starving, "starvation death slot reused");
assertEqual(starvationWorld.spawnReusedSlotCount, 1, "starvation reuse counter");

const birthWorld = createWorldState({ capacity: 3, worldWidth: 64, worldHeight: 64, sectorCount: 4 });
const parent = spawnAgent(birthWorld, { x: 32, y: 32, energy: 100, maxEnergy: 100, health: 100, radius: 2, genomeId: 1 });
birthWorld.age[parent] = 10;
const birthStats = applyReproduction(birthWorld, createRng("m50-a2-birth"), { energyThreshold: 50, energyCost: 10, childEnergy: 20, minAgeSeconds: 0, maxBirthsPerStep: 1, spawnRadius: 1, mutationChance: 0, mutationStandardDeviationScale: 0 });
assertEqual(birthStats.eligibleCount, 1, "birth eligible count");
assertEqual(birthStats.birthsThisStep, 1, "birth count");
assertEqual(birthWorld.count, 2, "world count after birth");
assertAlmostEqual(birthWorld.energy[parent], 90, 0.000001, "parent energy spent");

const blockedWorld = createWorldState({ capacity: 1, worldWidth: 64, worldHeight: 64, sectorCount: 4 });
const blockedParent = spawnAgent(blockedWorld, { x: 32, y: 32, energy: 100, maxEnergy: 100, health: 100, radius: 2, genomeId: 1 });
blockedWorld.age[blockedParent] = 10;
const blockedStats = applyReproduction(blockedWorld, createRng("m50-a2-blocked"), { energyThreshold: 50, energyCost: 10, childEnergy: 20, minAgeSeconds: 0, maxBirthsPerStep: 1, spawnRadius: 1, mutationChance: 0, mutationStandardDeviationScale: 0 });
assertEqual(blockedStats.eligibleCount, 1, "blocked eligible count");
assertEqual(blockedStats.birthsThisStep, 0, "blocked birth count");
assertEqual(blockedStats.blockedByCapacity, 1, "blocked by capacity count");

const predatorWorld = createWorldState({ capacity: 2, worldWidth: 64, worldHeight: 64, sectorCount: 4 });
spawnAgent(predatorWorld, { x: 20, y: 20, radius: 2, energy: 50, maxEnergy: 100, health: 100, dietMask: DIET_MEAT, mouthPower: 20, armor: 0, speciesId: 1 });
const prey = spawnAgent(predatorWorld, { x: 22, y: 20, radius: 2, energy: 20, maxEnergy: 100, health: 5, dietMask: DIET_PLANT, mouthPower: 0, armor: 0, speciesId: 2 });
const predatorGrid = createSpatialHashGrid({ capacity: 2, worldWidth: 64, worldHeight: 64, cellSize: 16 });
buildSpatialHashGrid(predatorGrid, predatorWorld);
const predatorStats = applyPredatorPreyInteraction(predatorWorld, predatorGrid, { attackRadius: 8, maxAttacksPerPredator: 1, sameSpeciesProtection: true, damageScale: 1, armorAbsorptionScale: 0, minimumDamage: 0, actionEnergyCost: 0, energyGainPerDamage: 0, preyEnergyHarvestRatio: 0 });
assertEqual(predatorStats.attacksThisStep, 1, "predator attack count");
assertEqual(predatorStats.killsThisStep, 1, "predator kill count");
assertEqual(predatorWorld.alive[prey], 0, "prey killed");
assertEqual(predatorWorld.reusableSlotCount, 1, "predator kill produces reusable slot");

const scenarioConfig = makeEcologyPressureConfig({ ecologyPreset: "scarce_food", resourceTargetCount: 2, basalMetabolismScale: 1, reproductionEnergyThreshold: 50, reproductionEnergyCost: 10, predatorAttackRadius: 8, predatorDamageScale: 1 }, { resourceCapacity: 2 });
const scenarioReadout = makeEcologyPressureReadout({
  world: foodWorld,
  resources: foodLayer,
  config: scenarioConfig,
  energyStats: foodEnergyStats,
  reproductionStats: blockedStats,
  predatorPreyStats: predatorStats,
  resourcePickupStats: pickupStats,
  resourceRespawnStats: { spawnedCount: 0 }
});
assertEqual(scenarioReadout.ecologyPreset, "scarce_food", "scenario readout preset");
assertEqual(scenarioReadout.foodPickupCount, 1, "scenario readout pickup count");
assertEqual(scenarioReadout.blockedBirthsByCapacity, 1, "scenario readout blocked births");
assertEqual(scenarioReadout.predatorKillsThisStep, 1, "scenario readout predator kills");
assertFiniteReadout(scenarioReadout, "scenario ecology readout");

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("ecology pressure tests passed");

async function importSimModule(moduleName) {
  return import(pathToFileURL(join(temporaryDirectory, `${moduleName}.mjs`)).href + `?t=${Date.now()}`);
}

async function transpileSimModule(sourceName, outputName) {
  const sourcePath = join(projectRoot, "src", "sim", sourceName);
  const outputPath = join(temporaryDirectory, outputName);
  const sourceText = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(sourceText, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true } });
  await writeFile(outputPath, rewriteImports(transpiled.outputText), "utf8");
}

function rewriteImports(outputText) {
  let rewritten = outputText;
  for (const moduleName of simModules) {
    rewritten = rewritten
      .replaceAll(`from "./${moduleName}"`, `from "./${moduleName}.mjs"`)
      .replaceAll(`from './${moduleName}'`, `from './${moduleName}.mjs'`);
  }
  return rewritten;
}

function assertFiniteReadout(readout, label) {
  for (const [key, value] of Object.entries(readout)) {
    if (typeof value === "number" && !Number.isFinite(value)) throw new Error(`${label}: ${key} is not finite: ${value}`);
  }
}
function assert(condition, label) { if (!condition) throw new Error(label); }
function assertEqual(actual, expected, label) { if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`); }
function assertAlmostEqual(actual, expected, epsilon, label) { if (Math.abs(actual - expected) > epsilon) throw new Error(`${label}: expected ${expected} +/- ${epsilon}, got ${actual}`); }

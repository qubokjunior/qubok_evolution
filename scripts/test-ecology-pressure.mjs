import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_ecology_pressure_test");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });
await transpileSimModule("ecologyPressure.ts", "ecologyPressure.mjs");

const {
  ECOLOGY_PRESSURE_VERSION,
  ECOLOGY_PRESSURE_PRESETS,
  DEFAULT_ECOLOGY_PRESSURE_CONFIG,
  isEcologyPressurePreset,
  makeEcologyPressureConfig,
  makeEcologyPressureReadout
} = await import(pathToFileURL(join(temporaryDirectory, "ecologyPressure.mjs")).href);

assertEqual(ECOLOGY_PRESSURE_VERSION, "qubok_evolve.ecology_pressure.m50", "ecology pressure version");
assert(ECOLOGY_PRESSURE_PRESETS.includes("neutral_lab"), "neutral preset missing");
assert(ECOLOGY_PRESSURE_PRESETS.includes("scarce_food"), "scarce food preset missing");
assertEqual(DEFAULT_ECOLOGY_PRESSURE_CONFIG.ecologyPreset, "neutral_lab", "default preset");
assertEqual(isEcologyPressurePreset("predator_pressure"), true, "known preset guard");
assertEqual(isEcologyPressurePreset("unknown"), false, "unknown preset guard");

const resolvedDefault = makeEcologyPressureConfig({}, { resourceCapacity: 1024 });
assertEqual(resolvedDefault.resourceTargetCount, 1024, "resource target clamps to capacity");
assertEqual(resolvedDefault.basalMetabolismScale, 0, "default basal scale keeps current demo neutral");

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

const world = {
  capacity: 4,
  count: 4,
  reusableSlotCount: 1,
  alive: Uint8Array.from([1, 1, 0, 1]),
  energy: Float32Array.from([50, 10, 0, 100]),
  maxEnergy: Float32Array.from([100, 100, 100, 100])
};
const resources = { aliveCount: 7 };
const readout = makeEcologyPressureReadout({
  world,
  resources,
  config: resolved,
  energyStats: { averageEnergy01: 0.533333333, aliveAfter: 3, starvingCount: 1, starvationDamage: 4.5, deathsThisStep: 2 },
  reproductionStats: { birthsThisStep: 3, blockedByCapacity: 5 },
  predatorPreyStats: { attacksThisStep: 6, killsThisStep: 2 },
  resourcePickupStats: { consumedCount: 9, energyTransferred: 81 },
  resourceRespawnStats: { spawnedCount: 11 }
});
assertEqual(readout.version, ECOLOGY_PRESSURE_VERSION, "readout version");
assertEqual(readout.ecologyPreset, "scarce_food", "readout preset");
assertEqual(readout.resourceTargetCount, 256, "readout resource target");
assertEqual(readout.resourceAliveCount, 7, "readout resource alive");
assertEqual(readout.foodPickupCount, 9, "readout pickups");
assertAlmostEqual(readout.minimumEnergy01, 0.1, 0.000001, "minimum energy");
assertAlmostEqual(readout.maximumEnergy01, 1, 0.000001, "maximum energy");
assertEqual(readout.birthsThisStep, 3, "births");
assertEqual(readout.blockedBirthsByCapacity, 5, "blocked births");
assertEqual(readout.predatorKillsThisStep, 2, "predator kills");
assertAlmostEqual(readout.populationPressure01, 0.75, 0.000001, "population pressure");

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("ecology pressure tests passed");

async function transpileSimModule(sourceName, outputName) {
  const sourcePath = join(projectRoot, "src", "sim", sourceName);
  const outputPath = join(temporaryDirectory, outputName);
  const sourceText = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(sourceText, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true } });
  await writeFile(outputPath, transpiled.outputText, "utf8");
}

function assert(condition, label) { if (!condition) throw new Error(label); }
function assertEqual(actual, expected, label) { if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`); }
function assertAlmostEqual(actual, expected, epsilon, label) { if (Math.abs(actual - expected) > epsilon) throw new Error(`${label}: expected ${expected} +/- ${epsilon}, got ${actual}`); }

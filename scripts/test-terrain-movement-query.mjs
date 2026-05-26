import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_terrain_movement_query_test");
const TEST_DELTA_SECONDS = 0.25;

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });
await transpileSimModule("arrays.ts", "arrays.mjs");
await transpileSimModule("terrain.ts", "terrain.mjs");
await transpileSimModule("world.ts", "world.mjs");
await transpileSimModule("movement.ts", "movement.mjs");

const terrainModule = await import(pathToFileURL(join(temporaryDirectory, "terrain.mjs")).href);
const worldModule = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);
const movementModule = await import(pathToFileURL(join(temporaryDirectory, "movement.mjs")).href);

const { createTerrainLayer, setTerrainCellMaterial } = terrainModule;
const { createWorldState, spawnAgent } = worldModule;
const { stepMovement } = movementModule;

const terrain = createTerrainLayer({ worldWidth: 100, worldHeight: 20, cellSize: 10 });
setTerrainCellMaterial(terrain, 5, 0, 2);

const worldWithoutTerrain = createWorldState({ capacity: 2, worldWidth: 100, worldHeight: 20, sectorCount: 8 });
const worldWithTerrain = createWorldState({ capacity: 2, worldWidth: 100, worldHeight: 20, sectorCount: 8 });

const agentInput = {
  x: 55,
  y: 5,
  vx: 0,
  vy: 0,
  fx: 100,
  fy: 0,
  headingX: 1,
  headingY: 0,
  radius: 2,
  mass: 1,
  drag: 0,
  maxSpeed: 100,
  turnRate: 1,
  energy: 100,
  stamina: 10,
  health: 100,
  metabolism: 0,
  maxEnergy: 100,
  maxStamina: 10,
  dietMask: 1,
  landThrust: 1,
  waterThrust: 0,
  flowAffinity: 0,
  terrainAffinity: 1,
  visionRadius: 64,
  visionCosHalfCone: 0,
  componentFlags: 1,
  archetypeId: 1,
  speciesId: 1,
  genomeId: 1,
  generationId: 0,
  parentGenomeId: 0,
  colorRGBA: 0xffffffff
};

spawnAgent(worldWithoutTerrain, agentInput);
spawnAgent(worldWithTerrain, agentInput);

const baseline = stepMovement(worldWithoutTerrain, { deltaSeconds: TEST_DELTA_SECONDS, boundsMode: "none", clearForces: false, minimumEnergy: -1 });
const terrainInfluenced = stepMovement(worldWithTerrain, { deltaSeconds: TEST_DELTA_SECONDS, boundsMode: "none", clearForces: false, minimumEnergy: -1, terrain });

assertEqual(baseline.terrainMovementSampleCount, 0, "baseline terrain sample count");
assertEqual(terrainInfluenced.terrainMovementSampleCount, 1, "terrain sample count");
assertAlmostEqual(terrainInfluenced.terrainMovementCostSum, 1.75, 0.00001, "terrain movement cost sum");
assertAlmostEqual(terrainInfluenced.terrainDragSum, 0.25, 0.00001, "terrain drag sum");
assert(worldWithTerrain.x[0] < worldWithoutTerrain.x[0], "terrain should reduce traveled distance on high-cost material");
assert(terrainInfluenced.energySpent > baseline.energySpent, "terrain movement cost should increase energy spent relative to same distance scale");
assert(terrainInfluenced.distanceAccumulated < baseline.distanceAccumulated, "terrain movement should reduce distance accumulated");

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("terrain movement query tests passed");

async function transpileSimModule(sourceName, outputName) {
  const sourcePath = join(projectRoot, "src", "sim", sourceName);
  const outputPath = join(temporaryDirectory, outputName);
  const sourceText = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(sourceText, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true } });
  let outputText = transpiled.outputText;
  outputText = outputText.replaceAll('from "./arrays"', 'from "./arrays.mjs"');
  outputText = outputText.replaceAll('from "./terrain"', 'from "./terrain.mjs"');
  outputText = outputText.replaceAll('from "./world"', 'from "./world.mjs"');
  await writeFile(outputPath, outputText, "utf8");
}

function assert(condition, label) {
  if (!condition) throw new Error(label);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

function assertAlmostEqual(actual, expected, epsilon, label) {
  if (Math.abs(actual - expected) > epsilon) throw new Error(`${label}: expected ${expected} +/- ${epsilon}, got ${actual}`);
}

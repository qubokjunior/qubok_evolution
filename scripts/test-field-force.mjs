import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_field_force_test");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

for (const moduleName of ["arrays.ts", "field.ts", "world.ts", "fieldForce.ts"]) {
  await transpileSimModule(moduleName, moduleName.replace(".ts", ".mjs"));
}

const { createEnvironmentalFieldLayer, setFieldCell } = await import(pathToFileURL(join(temporaryDirectory, "field.mjs")).href);
const { createWorldState, spawnAgent, killAgent } = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);
const { FIELD_FORCE_VERSION, DEFAULT_FIELD_FORCE_CONFIG, applyFieldForces, makeFieldForceConfig } = await import(pathToFileURL(join(temporaryDirectory, "fieldForce.mjs")).href);

assertEqual(FIELD_FORCE_VERSION, "qubok_evolve.field_force.m47", "field force version");
assertEqual(DEFAULT_FIELD_FORCE_CONFIG.enabled, false, "default disabled");
assertAlmostEqual(DEFAULT_FIELD_FORCE_CONFIG.strength, 1, 0.000001, "default strength");
assertAlmostEqual(DEFAULT_FIELD_FORCE_CONFIG.maxForcePerAgent, 1000, 0.000001, "default max force");

const clampedConfig = makeFieldForceConfig({ enabled: true, strength: -1, maxForcePerAgent: -5, minActiveMagnitude: -2 });
assertEqual(clampedConfig.enabled, true, "enabled preserved");
assertAlmostEqual(clampedConfig.strength, 0, 0.000001, "strength clamps low");
assertAlmostEqual(clampedConfig.maxForcePerAgent, 0, 0.000001, "max force clamps low");
assertAlmostEqual(clampedConfig.minActiveMagnitude, 0, 0.000001, "min active clamps low");

const disabledWorld = createWorldState({ capacity: 2, worldWidth: 20, worldHeight: 20 });
const disabledIndex = spawnAgent(disabledWorld, { x: 5, y: 5, flowAffinity: 1 });
const disabledField = createEnvironmentalFieldLayer({ worldWidth: 20, worldHeight: 20, cellSize: 10, defaultFlowX: 10, defaultFlowY: 0 });
const disabledMetrics = applyFieldForces(disabledWorld, disabledField);
assertEqual(disabledMetrics.enabled, false, "default metrics disabled");
assertEqual(disabledMetrics.sampleCount, 0, "disabled no samples");
assertAlmostEqual(disabledWorld.fx[disabledIndex], 0, 0.000001, "disabled no force x");
assertAlmostEqual(disabledWorld.fy[disabledIndex], 0, 0.000001, "disabled no force y");

const zeroStrengthMetrics = applyFieldForces(disabledWorld, disabledField, { enabled: true, strength: 0 });
assertEqual(zeroStrengthMetrics.sampleCount, 0, "zero strength no samples");
assertAlmostEqual(disabledWorld.fx[disabledIndex], 0, 0.000001, "zero strength no force x");

const zeroFieldWorld = createWorldState({ capacity: 2, worldWidth: 20, worldHeight: 20 });
const zeroFieldIndex = spawnAgent(zeroFieldWorld, { x: 5, y: 5, flowAffinity: 1 });
const zeroField = createEnvironmentalFieldLayer({ worldWidth: 20, worldHeight: 20, cellSize: 10 });
const zeroFieldMetrics = applyFieldForces(zeroFieldWorld, zeroField, { enabled: true, strength: 1 });
assertEqual(zeroFieldMetrics.sampleCount, 1, "zero field sample count");
assertEqual(zeroFieldMetrics.affectedAgentCount, 0, "zero field affected count");
assertAlmostEqual(zeroFieldWorld.fx[zeroFieldIndex], 0, 0.000001, "zero field no force x");
assertAlmostEqual(zeroFieldWorld.fy[zeroFieldIndex], 0, 0.000001, "zero field no force y");

const forceWorld = createWorldState({ capacity: 4, worldWidth: 40, worldHeight: 20 });
const a = spawnAgent(forceWorld, { x: 5, y: 5, flowAffinity: 1 });
const b = spawnAgent(forceWorld, { x: 15, y: 5, flowAffinity: 0.5 });
const dead = spawnAgent(forceWorld, { x: 25, y: 5, flowAffinity: 1 });
killAgent(forceWorld, dead);
const forceField = createEnvironmentalFieldLayer({ worldWidth: 40, worldHeight: 20, cellSize: 10 });
setFieldCell(forceField, 0, 0, 4, 0);
setFieldCell(forceField, 1, 0, 0, 4);
setFieldCell(forceField, 2, 0, 100, 0);
const beforeFlowX = Array.from(forceField.flowX);
const beforeFlowY = Array.from(forceField.flowY);
const forceMetrics = applyFieldForces(forceWorld, forceField, { enabled: true, strength: 2, maxForcePerAgent: 6 });
assertEqual(forceMetrics.agentCount, 2, "alive-only agent count");
assertEqual(forceMetrics.ignoredDeadCount, 1, "dead ignored count");
assertEqual(forceMetrics.sampleCount, 2, "sample alive-only");
assertEqual(forceMetrics.affectedAgentCount, 2, "affected count");
assertEqual(forceMetrics.clampCount, 1, "clamp count");
assertAlmostEqual(forceWorld.fx[a], 6, 0.000001, "clamped first force x");
assertAlmostEqual(forceWorld.fy[a], 0, 0.000001, "first force y");
assertAlmostEqual(forceWorld.fx[b], 0, 0.000001, "second force x");
assertAlmostEqual(forceWorld.fy[b], 4, 0.000001, "second force y unclamped");
assertAlmostEqual(forceWorld.fx[dead], 0, 0.000001, "dead force x unchanged");
assertArrayAlmostEqual(Array.from(forceField.flowX), beforeFlowX, 0.000001, "field flowX not mutated");
assertArrayAlmostEqual(Array.from(forceField.flowY), beforeFlowY, 0.000001, "field flowY not mutated");
assertFinite(forceMetrics.totalForceMagnitude, "force magnitude finite");
assertFinite(forceMetrics.maxForceMagnitude, "max force finite");

const first = createWorldState({ capacity: 2, worldWidth: 20, worldHeight: 20 });
const second = createWorldState({ capacity: 2, worldWidth: 20, worldHeight: 20 });
spawnAgent(first, { x: 5, y: 5, flowAffinity: 1 });
spawnAgent(second, { x: 5, y: 5, flowAffinity: 1 });
const deterministicField = createEnvironmentalFieldLayer({ worldWidth: 20, worldHeight: 20, cellSize: 10, defaultFlowX: 3, defaultFlowY: 4 });
const metricsA = applyFieldForces(first, deterministicField, { enabled: true, strength: 1 });
const metricsB = applyFieldForces(second, deterministicField, { enabled: true, strength: 1 });
assertAlmostEqual(metricsA.totalForceMagnitude, metricsB.totalForceMagnitude, 0.000001, "deterministic magnitude");
assertAlmostEqual(first.fx[0], second.fx[0], 0.000001, "deterministic fx");
assertAlmostEqual(first.fy[0], second.fy[0], 0.000001, "deterministic fy");

assertThrows(() => makeFieldForceConfig({ strength: Number.NaN }), "nan strength throws");
assertThrows(() => applyFieldForces(first, deterministicField, { enabled: true, maxForcePerAgent: Number.POSITIVE_INFINITY }), "infinite max force throws");
first.flowAffinity[0] = Number.NaN;
assertThrows(() => applyFieldForces(first, deterministicField, { enabled: true }), "non-finite affinity throws");

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("field force tests passed");

async function transpileSimModule(sourceName, outputName) {
  const sourcePath = join(projectRoot, "src", "sim", sourceName);
  const outputPath = join(temporaryDirectory, outputName);
  const sourceText = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(sourceText, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true } });
  const outputText = transpiled.outputText
    .replaceAll('from "./arrays"', 'from "./arrays.mjs"')
    .replaceAll("from './arrays'", "from './arrays.mjs'")
    .replaceAll('from "./field"', 'from "./field.mjs"')
    .replaceAll("from './field'", "from './field.mjs'")
    .replaceAll('from "./world"', 'from "./world.mjs"')
    .replaceAll("from './world'", "from './world.mjs'");
  await writeFile(outputPath, outputText, "utf8");
}

function assertEqual(actual, expected, label) { if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`); }
function assertAlmostEqual(actual, expected, epsilon, label) { if (Math.abs(actual - expected) > epsilon) throw new Error(`${label}: expected ${expected} +/- ${epsilon}, got ${actual}`); }
function assertArrayAlmostEqual(actual, expected, epsilon, label) { if (actual.length !== expected.length) throw new Error(`${label}: length mismatch`); for (let index = 0; index < actual.length; index += 1) assertAlmostEqual(actual[index], expected[index], epsilon, `${label}[${index}]`); }
function assertFinite(actual, label) { if (!Number.isFinite(actual)) throw new Error(`${label}: expected finite number, got ${actual}`); }
function assertThrows(fn, label) { let thrown = false; try { fn(); } catch { thrown = true; } if (!thrown) throw new Error(`${label}: expected function to throw`); }

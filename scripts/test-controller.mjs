import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_controller_test");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

for (const moduleName of ["arrays.ts", "world.ts", "controller.ts"]) {
  await transpileSimModule(moduleName, moduleName.replace(".ts", ".mjs"));
}

const { createWorldState, spawnAgent, killAgent } = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);
const { CONTROLLER_VERSION, DEFAULT_AGENT_CONTROLLER_CONFIG, createAgentControllerOutput, clearAgentControllerOutput, makeAgentControllerConfig, stepAgentController } = await import(pathToFileURL(join(temporaryDirectory, "controller.mjs")).href);

assertEqual(CONTROLLER_VERSION, "qubok_evolve.controller.m48", "controller version");
assertEqual(DEFAULT_AGENT_CONTROLLER_CONFIG.enabled, false, "default disabled");
assertAlmostEqual(DEFAULT_AGENT_CONTROLLER_CONFIG.strength, 1, 0.000001, "default strength");
assertAlmostEqual(DEFAULT_AGENT_CONTROLLER_CONFIG.maxIntentPerAgent, 1, 0.000001, "default max intent");

const output = createAgentControllerOutput(4);
assertEqual(output.version, CONTROLLER_VERSION, "output version");
assertEqual(output.capacity, 4, "output capacity");
output.intentX[0] = 9;
output.intentY[0] = -3;
output.intentMagnitude[0] = 10;
clearAgentControllerOutput(output, 1);
assertAlmostEqual(output.intentX[0], 0, 0.000001, "clear intent x");
assertAlmostEqual(output.intentY[0], 0, 0.000001, "clear intent y");
assertAlmostEqual(output.intentMagnitude[0], 0, 0.000001, "clear intent magnitude");
assertThrows(() => createAgentControllerOutput(0), "zero output capacity throws");
assertThrows(() => clearAgentControllerOutput(output, 5), "clear count too high throws");

const clampedConfig = makeAgentControllerConfig({ enabled: true, strength: -1, maxIntentPerAgent: -5 });
assertEqual(clampedConfig.enabled, true, "enabled preserved");
assertAlmostEqual(clampedConfig.strength, 0, 0.000001, "strength clamps low");
assertAlmostEqual(clampedConfig.maxIntentPerAgent, 0, 0.000001, "max intent clamps low");
assertThrows(() => makeAgentControllerConfig({ strength: Number.NaN }), "nan strength throws");

const disabledWorld = createWorldState({ capacity: 2, worldWidth: 20, worldHeight: 20, sectorCount: 4 });
spawnAgent(disabledWorld, { x: 5, y: 5 });
const disabledOutput = createAgentControllerOutput(2);
disabledOutput.intentX[0] = 5;
const disabledMetrics = stepAgentController(disabledWorld, disabledOutput);
assertEqual(disabledMetrics.enabled, false, "disabled metrics disabled");
assertEqual(disabledMetrics.sampleCount, 0, "disabled no samples");
assertAlmostEqual(disabledOutput.intentX[0], 5, 0.000001, "disabled no output mutation");

const zeroStrengthMetrics = stepAgentController(disabledWorld, disabledOutput, { enabled: true, strength: 0 });
assertEqual(zeroStrengthMetrics.sampleCount, 0, "zero strength no samples");
assertAlmostEqual(disabledOutput.intentX[0], 5, 0.000001, "zero strength no output mutation");

const zeroWorld = createWorldState({ capacity: 2, worldWidth: 20, worldHeight: 20, sectorCount: 4 });
const zeroIndex = spawnAgent(zeroWorld, { x: 5, y: 5 });
const zeroOutput = createAgentControllerOutput(2);
const zeroMetrics = stepAgentController(zeroWorld, zeroOutput, { enabled: true, strength: 1 });
assertEqual(zeroMetrics.sampleCount, 1, "zero observation sample count");
assertEqual(zeroMetrics.affectedAgentCount, 0, "zero observation affected count");
assertEqual(zeroMetrics.zeroIntentCount, 1, "zero observation zero intent count");
assertAlmostEqual(zeroOutput.intentX[zeroIndex], 0, 0.000001, "zero observation intent x");
assertAlmostEqual(zeroOutput.intentY[zeroIndex], 0, 0.000001, "zero observation intent y");

const world = createWorldState({ capacity: 4, worldWidth: 40, worldHeight: 20, sectorCount: 4 });
const a = spawnAgent(world, { x: 5, y: 5 });
const b = spawnAgent(world, { x: 15, y: 5 });
const dead = spawnAgent(world, { x: 25, y: 5 });
killAgent(world, dead);
world.sectorFood[world.sensorSectorBase[a] + 0] = 10;
world.sectorThreat[world.sensorSectorBase[b] + 1] = 2;
world.flowSampleX[b] = 1;
const controllerOutput = createAgentControllerOutput(4);
const metrics = stepAgentController(world, controllerOutput, { enabled: true, strength: 1, maxIntentPerAgent: 3, foodWeight: 1, threatWeight: 1, flowWeight: 1 });
assertEqual(metrics.agentCount, 2, "alive-only agent count");
assertEqual(metrics.ignoredDeadCount, 1, "dead ignored count");
assertEqual(metrics.sampleCount, 2, "sample alive-only");
assertEqual(metrics.affectedAgentCount, 2, "affected count");
assertEqual(metrics.clampCount, 1, "clamp count");
assertAlmostEqual(controllerOutput.intentX[a], 3, 0.000001, "clamped food intent x");
assertAlmostEqual(controllerOutput.intentY[a], 0, 0.000001, "clamped food intent y");
assertAlmostEqual(controllerOutput.intentX[b], 1, 0.000001, "flow plus threat intent x");
assertAlmostEqual(controllerOutput.intentY[b], -2, 0.000001, "threat avoidance intent y");
assertAlmostEqual(controllerOutput.intentMagnitude[dead], 0, 0.000001, "dead intent magnitude unchanged zero");
assertFinite(metrics.totalIntentMagnitude, "total intent magnitude finite");
assertFinite(metrics.maxIntentMagnitude, "max intent finite");

const first = createWorldState({ capacity: 2, worldWidth: 20, worldHeight: 20, sectorCount: 4 });
const second = createWorldState({ capacity: 2, worldWidth: 20, worldHeight: 20, sectorCount: 4 });
spawnAgent(first, { x: 5, y: 5 });
spawnAgent(second, { x: 5, y: 5 });
first.sectorFood[first.sensorSectorBase[0] + 0] = 3;
second.sectorFood[second.sensorSectorBase[0] + 0] = 3;
const firstOutput = createAgentControllerOutput(2);
const secondOutput = createAgentControllerOutput(2);
const metricsA = stepAgentController(first, firstOutput, { enabled: true });
const metricsB = stepAgentController(second, secondOutput, { enabled: true });
assertAlmostEqual(metricsA.totalIntentMagnitude, metricsB.totalIntentMagnitude, 0.000001, "deterministic magnitude");
assertAlmostEqual(firstOutput.intentX[0], secondOutput.intentX[0], 0.000001, "deterministic intent x");
assertAlmostEqual(firstOutput.intentY[0], secondOutput.intentY[0], 0.000001, "deterministic intent y");

const capacityWorld = createWorldState({ capacity: 2, worldWidth: 20, worldHeight: 20, sectorCount: 4 });
spawnAgent(capacityWorld, { x: 5, y: 5 });
spawnAgent(capacityWorld, { x: 10, y: 5 });
assertThrows(() => stepAgentController(capacityWorld, createAgentControllerOutput(1), { enabled: true }), "small output capacity throws");
first.flowSampleX[0] = Number.NaN;
assertThrows(() => stepAgentController(first, firstOutput, { enabled: true }), "non-finite intent throws");

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("controller tests passed");

async function transpileSimModule(sourceName, outputName) {
  const sourcePath = join(projectRoot, "src", "sim", sourceName);
  const outputPath = join(temporaryDirectory, outputName);
  const sourceText = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(sourceText, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true } });
  const outputText = transpiled.outputText
    .replaceAll('from "./arrays"', 'from "./arrays.mjs"')
    .replaceAll("from './arrays'", "from './arrays.mjs'")
    .replaceAll('from "./world"', 'from "./world.mjs"')
    .replaceAll("from './world'", "from './world.mjs'");
  await writeFile(outputPath, outputText, "utf8");
}

function assertEqual(actual, expected, label) { if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`); }
function assertAlmostEqual(actual, expected, epsilon, label) { if (Math.abs(actual - expected) > epsilon) throw new Error(`${label}: expected ${expected} +/- ${epsilon}, got ${actual}`); }
function assertFinite(actual, label) { if (!Number.isFinite(actual)) throw new Error(`${label}: expected finite number, got ${actual}`); }
function assertThrows(fn, label) { let thrown = false; try { fn(); } catch { thrown = true; } if (!thrown) throw new Error(`${label}: expected function to throw`); }

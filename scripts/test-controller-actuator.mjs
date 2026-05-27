import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_controller_actuator_test");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

for (const moduleName of ["arrays.ts", "world.ts", "controller.ts", "controllerActuator.ts"]) await transpileSimModule(moduleName, moduleName.replace(".ts", ".mjs"));

const { createWorldState, spawnAgent, killAgent } = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);
const { createAgentControllerOutput } = await import(pathToFileURL(join(temporaryDirectory, "controller.mjs")).href);
const { CONTROLLER_ACTUATOR_VERSION, DEFAULT_CONTROLLER_ACTUATOR_CONFIG, makeControllerActuatorConfig, applyControllerActuator } = await import(pathToFileURL(join(temporaryDirectory, "controllerActuator.mjs")).href);

assertEqual(CONTROLLER_ACTUATOR_VERSION, "qubok_evolve.controller_actuator.m49", "actuator version");
assertEqual(DEFAULT_CONTROLLER_ACTUATOR_CONFIG.enableControllerMovementInfluence, false, "default disabled");
assertAlmostEqual(DEFAULT_CONTROLLER_ACTUATOR_CONFIG.controllerForceScale, 1, 0.000001, "default force scale");
assertAlmostEqual(DEFAULT_CONTROLLER_ACTUATOR_CONFIG.controllerMaxForce, 1, 0.000001, "default max force");

const clampedConfig = makeControllerActuatorConfig({ enableControllerMovementInfluence: true, controllerForceScale: -1, controllerMaxForce: -5, minActiveIntentMagnitude: -2 });
assertEqual(clampedConfig.enableControllerMovementInfluence, true, "enabled preserved");
assertAlmostEqual(clampedConfig.controllerForceScale, 0, 0.000001, "force scale clamps low");
assertAlmostEqual(clampedConfig.controllerMaxForce, 0, 0.000001, "max force clamps low");
assertAlmostEqual(clampedConfig.minActiveIntentMagnitude, 0, 0.000001, "min active clamps low");
assertThrows(() => makeControllerActuatorConfig({ controllerForceScale: Number.NaN }), "nan force scale throws");

const disabledWorld = createWorldState({ capacity: 2, worldWidth: 20, worldHeight: 20, sectorCount: 4 });
spawnAgent(disabledWorld, { x: 5, y: 5 });
const disabledOutput = createAgentControllerOutput(2);
disabledOutput.intentX[0] = 3;
disabledOutput.intentY[0] = 4;
disabledOutput.intentMagnitude[0] = 5;
const disabledMetrics = applyControllerActuator(disabledWorld, disabledOutput);
assertEqual(disabledMetrics.enabled, false, "disabled metrics disabled");
assertEqual(disabledMetrics.sampleCount, 0, "disabled no samples");
assertAlmostEqual(disabledWorld.fx[0], 0, 0.000001, "disabled does not apply fx");
assertAlmostEqual(disabledWorld.fy[0], 0, 0.000001, "disabled does not apply fy");
assertAlmostEqual(disabledOutput.intentX[0], 3, 0.000001, "disabled does not mutate intent x");

const world = createWorldState({ capacity: 4, worldWidth: 40, worldHeight: 20, sectorCount: 4 });
const a = spawnAgent(world, { x: 5, y: 5 });
const b = spawnAgent(world, { x: 15, y: 5 });
const inactive = spawnAgent(world, { x: 25, y: 5 });
killAgent(world, inactive);
const output = createAgentControllerOutput(4);
output.intentX[a] = 3;
output.intentY[a] = 4;
output.intentMagnitude[a] = 5;
output.intentX[b] = 0.1;
output.intentY[b] = 0;
output.intentMagnitude[b] = 0.1;
output.intentX[inactive] = 99;
output.intentY[inactive] = 99;
output.intentMagnitude[inactive] = 140;
const metrics = applyControllerActuator(world, output, { enableControllerMovementInfluence: true, controllerForceScale: 2, controllerMaxForce: 6, minActiveIntentMagnitude: 0.5 });
assertEqual(metrics.enabled, true, "enabled metrics");
assertEqual(metrics.agentCount, 2, "alive agent count");
assertEqual(metrics.ignoredDeadCount, 1, "inactive ignored count");
assertEqual(metrics.sampleCount, 2, "sample alive-only");
assertEqual(metrics.affectedAgentCount, 1, "affected count");
assertEqual(metrics.zeroIntentCount, 1, "zero intent threshold count");
assertEqual(metrics.clampCount, 1, "clamp count");
assertAlmostEqual(world.fx[a], 3.6, 0.00001, "clamped force x");
assertAlmostEqual(world.fy[a], 4.8, 0.00001, "clamped force y");
assertAlmostEqual(world.fx[b], 0, 0.000001, "threshold no force x");
assertAlmostEqual(world.fy[inactive], 0, 0.000001, "inactive no force y");
assertAlmostEqual(output.intentX[a], 3, 0.000001, "intent x unchanged");
assertFinite(metrics.totalForceMagnitude, "total force magnitude finite");

const first = createWorldState({ capacity: 2, worldWidth: 20, worldHeight: 20, sectorCount: 4 });
const second = createWorldState({ capacity: 2, worldWidth: 20, worldHeight: 20, sectorCount: 4 });
spawnAgent(first, { x: 5, y: 5 });
spawnAgent(second, { x: 5, y: 5 });
const firstOutput = createAgentControllerOutput(2);
const secondOutput = createAgentControllerOutput(2);
for (const target of [firstOutput, secondOutput]) {
  target.intentX[0] = 0.25;
  target.intentY[0] = -0.75;
  target.intentMagnitude[0] = Math.hypot(0.25, -0.75);
}
const metricsA = applyControllerActuator(first, firstOutput, { enableControllerMovementInfluence: true, controllerForceScale: 3, controllerMaxForce: 10 });
const metricsB = applyControllerActuator(second, secondOutput, { enableControllerMovementInfluence: true, controllerForceScale: 3, controllerMaxForce: 10 });
assertAlmostEqual(metricsA.totalForceMagnitude, metricsB.totalForceMagnitude, 0.000001, "deterministic magnitude");
assertAlmostEqual(first.fx[0], second.fx[0], 0.000001, "deterministic fx");
assertAlmostEqual(first.fy[0], second.fy[0], 0.000001, "deterministic fy");

const capacityWorld = createWorldState({ capacity: 2, worldWidth: 20, worldHeight: 20, sectorCount: 4 });
spawnAgent(capacityWorld, { x: 5, y: 5 });
spawnAgent(capacityWorld, { x: 10, y: 5 });
assertThrows(() => applyControllerActuator(capacityWorld, createAgentControllerOutput(1), { enableControllerMovementInfluence: true }), "small output capacity throws");
firstOutput.intentX[0] = Number.NaN;
assertThrows(() => applyControllerActuator(first, firstOutput, { enableControllerMovementInfluence: true }), "non-finite intent throws");

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("controller actuator tests passed");

async function transpileSimModule(sourceName, outputName) {
  const sourcePath = join(projectRoot, "src", "sim", sourceName);
  const outputPath = join(temporaryDirectory, outputName);
  const sourceText = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(sourceText, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true } });
  const outputText = transpiled.outputText
    .replaceAll('from "./arrays"', 'from "./arrays.mjs"')
    .replaceAll('from "./world"', 'from "./world.mjs"')
    .replaceAll('from "./controller"', 'from "./controller.mjs"');
  await writeFile(outputPath, outputText, "utf8");
}

function assertEqual(actual, expected, label) { if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`); }
function assertAlmostEqual(actual, expected, epsilon, label) { if (Math.abs(actual - expected) > epsilon) throw new Error(`${label}: expected ${expected} +/- ${epsilon}, got ${actual}`); }
function assertFinite(actual, label) { if (!Number.isFinite(actual)) throw new Error(`${label}: expected finite number, got ${actual}`); }
function assertThrows(fn, label) { let thrown = false; try { fn(); } catch { thrown = true; } if (!thrown) throw new Error(`${label}: expected function to throw`); }

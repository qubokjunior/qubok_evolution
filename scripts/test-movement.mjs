import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_movement_test");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

await transpileSimModule("arrays.ts", "arrays.mjs");
await transpileSimModule("rng.ts", "rng.mjs");
await transpileSimModule("world.ts", "world.mjs");
await transpileSimModule("movement.ts", "movement.mjs");

const { createRng } = await import(pathToFileURL(join(temporaryDirectory, "rng.mjs")).href);
const { createWorldState, makeWorldSnapshot, spawnAgent, spawnRandomAgents } = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);
const { MOVEMENT_SYSTEM_VERSION, addForce, clearForces, setVelocityFromHeading, stepMovement } = await import(pathToFileURL(join(temporaryDirectory, "movement.mjs")).href);

assertEqual(MOVEMENT_SYSTEM_VERSION, "qubok_evolve.movement.v1", "movement version");

const world = createWorldState({ capacity: 4, worldWidth: 100, worldHeight: 100, sectorCount: 8 });
const first = spawnAgent(world, { x: 10, y: 20, vx: 3, vy: 4, mass: 1, drag: 0, maxSpeed: 10, metabolism: 0, energy: 100 });
const metrics = stepMovement(world, { deltaSeconds: 0.2, boundsMode: "none" });
assertEqual(first, 0, "first index");
assertEqual(world.tick, 1, "tick after first movement");
assertAlmostEqual(world.timeSeconds, 0.2, 0.000001, "time after first movement");
assertAlmostEqual(world.x[0], 10.6, 0.00001, "x after velocity integration");
assertAlmostEqual(world.y[0], 20.8, 0.00001, "y after velocity integration");
assertAlmostEqual(world.headingX[0], 0.6, 0.00001, "heading x from velocity");
assertAlmostEqual(world.headingY[0], 0.8, 0.00001, "heading y from velocity");
assertEqual(metrics.movedCount, 1, "moved count");
assertAlmostEqual(world.distanceExplored[0], 1, 0.00001, "distance explored");

const forceWorld = createWorldState({ capacity: 2, worldWidth: 100, worldHeight: 100 });
spawnAgent(forceWorld, { x: 0, y: 0, vx: 0, vy: 0, mass: 2, drag: 0, maxSpeed: 100, metabolism: 0, energy: 100 });
addForce(forceWorld, 0, 10, 0);
stepMovement(forceWorld, { deltaSeconds: 0.1, boundsMode: "none" });
assertAlmostEqual(forceWorld.vx[0], 0.5, 0.00001, "force affects velocity");
assertAlmostEqual(forceWorld.x[0], 0.05, 0.00001, "force affects position");
assertAlmostEqual(forceWorld.fx[0], 0, 0.00001, "forces clear by default");

const persistentForceWorld = createWorldState({ capacity: 1, worldWidth: 100, worldHeight: 100 });
spawnAgent(persistentForceWorld, { mass: 1, drag: 0, maxSpeed: 100, metabolism: 0, energy: 100 });
addForce(persistentForceWorld, 0, 1, 0);
stepMovement(persistentForceWorld, { deltaSeconds: 0.1, clearForces: false, boundsMode: "none" });
assertAlmostEqual(persistentForceWorld.fx[0], 1, 0.00001, "persistent force remains when requested");
clearForces(persistentForceWorld);
assertAlmostEqual(persistentForceWorld.fx[0], 0, 0.00001, "clearForces clears fx");

const clampWorld = createWorldState({ capacity: 1, worldWidth: 10, worldHeight: 10 });
spawnAgent(clampWorld, { x: 9, y: 9, vx: 50, vy: 50, mass: 1, drag: 0, maxSpeed: 100, metabolism: 0, energy: 100 });
stepMovement(clampWorld, { deltaSeconds: 0.1, boundsMode: "clamp" });
assertAlmostEqual(clampWorld.x[0], 10, 0.00001, "clamped x");
assertAlmostEqual(clampWorld.y[0], 10, 0.00001, "clamped y");

const wrapWorld = createWorldState({ capacity: 1, worldWidth: 10, worldHeight: 10 });
spawnAgent(wrapWorld, { x: 9, y: 1, vx: 20, vy: -20, mass: 1, drag: 0, maxSpeed: 100, metabolism: 0, energy: 100 });
stepMovement(wrapWorld, { deltaSeconds: 0.1, boundsMode: "wrap" });
assertAlmostEqual(wrapWorld.x[0], 1, 0.00001, "wrapped x");
assertAlmostEqual(wrapWorld.y[0], 9, 0.00001, "wrapped y");

const speedWorld = createWorldState({ capacity: 1, worldWidth: 100, worldHeight: 100 });
spawnAgent(speedWorld, { vx: 100, vy: 0, mass: 1, drag: 0, maxSpeed: 5, metabolism: 0, energy: 100 });
setVelocityFromHeading(speedWorld, 0, 80);
stepMovement(speedWorld, { deltaSeconds: 0.1, boundsMode: "none" });
assertAlmostEqual(Math.hypot(speedWorld.vx[0], speedWorld.vy[0]), 5, 0.00001, "velocity clamp to maxSpeed");

const deathWorld = createWorldState({ capacity: 1, worldWidth: 100, worldHeight: 100 });
spawnAgent(deathWorld, { vx: 0, vy: 0, metabolism: 10, energy: 1 });
const deathMetrics = stepMovement(deathWorld, { deltaSeconds: 0.2, boundsMode: "none" });
assertEqual(deathWorld.alive[0], 0, "dead after energy depletion");
assertEqual(deathMetrics.deadCount, 1, "dead metric");

const deterministicA = createWorldState({ capacity: 32, worldWidth: 256, worldHeight: 128, sectorCount: 8 });
const deterministicB = createWorldState({ capacity: 32, worldWidth: 256, worldHeight: 128, sectorCount: 8 });
spawnRandomAgents(deterministicA, 32, createRng("qubok_evolve:movement:test"));
spawnRandomAgents(deterministicB, 32, createRng("qubok_evolve:movement:test"));

for (let tick = 0; tick < 20; tick += 1) {
  for (let index = 0; index < deterministicA.count; index += 1) {
    const fx = Math.sin(index * 0.17 + tick * 0.11) * 0.5;
    const fy = Math.cos(index * 0.13 - tick * 0.07) * 0.5;
    addForce(deterministicA, index, fx, fy);
    addForce(deterministicB, index, fx, fy);
  }

  stepMovement(deterministicA, { deltaSeconds: 1 / 60, boundsMode: "wrap" });
  stepMovement(deterministicB, { deltaSeconds: 1 / 60, boundsMode: "wrap" });
}

assertEqual(JSON.stringify(makeWorldSnapshot(deterministicA, 16)), JSON.stringify(makeWorldSnapshot(deterministicB, 16)), "deterministic movement snapshot");

assertThrows(() => stepMovement(deterministicA, { deltaSeconds: 0 }), "zero delta rejected");
assertThrows(() => stepMovement(deterministicA, { deltaSeconds: 1 }), "huge delta rejected");

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("movement tests passed");

async function transpileSimModule(sourceName, outputName) {
  const sourcePath = join(projectRoot, "src", "sim", sourceName);
  const outputPath = join(temporaryDirectory, outputName);
  const sourceText = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(sourceText, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true } });
  const outputText = transpiled.outputText
    .replaceAll('from "./arrays"', 'from "./arrays.mjs"')
    .replaceAll("from './arrays'", "from './arrays.mjs'")
    .replaceAll('from "./rng"', 'from "./rng.mjs"')
    .replaceAll("from './rng'", "from './rng.mjs'")
    .replaceAll('from "./world"', 'from "./world.mjs"')
    .replaceAll("from './world'", "from './world.mjs'");
  await writeFile(outputPath, outputText, "utf8");
}

function assertEqual(actual, expected, label) { if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`); }
function assertAlmostEqual(actual, expected, epsilon, label) { if (Math.abs(actual - expected) > epsilon) throw new Error(`${label}: expected ${expected} +/- ${epsilon}, got ${actual}`); }
function assertThrows(fn, label) { let thrown = false; try { fn(); } catch { thrown = true; } if (!thrown) throw new Error(`${label}: expected function to throw`); }
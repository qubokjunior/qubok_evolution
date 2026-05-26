import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_neighbor_query_test");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

await transpileSimModule("arrays.ts", "arrays.mjs");
await transpileSimModule("world.ts", "world.mjs");
await transpileSimModule("spatialHash.ts", "spatialHash.mjs");
await transpileSimModule("neighborQuery.ts", "neighborQuery.mjs");

const { createWorldState, killAgent, spawnAgent } = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);
const { buildSpatialHashGrid, createSpatialHashGrid } = await import(pathToFileURL(join(temporaryDirectory, "spatialHash.mjs")).href);
const {
  NEIGHBOR_QUERY_VERSION,
  forEachNeighborInRadius,
  sampleLocalNeighborStats,
  writeNeighborsInRadius
} = await import(pathToFileURL(join(temporaryDirectory, "neighborQuery.mjs")).href);

assertEqual(NEIGHBOR_QUERY_VERSION, "qubok_evolve.neighbor_query.v1", "neighbor query version");

const world = createWorldState({ capacity: 12, worldWidth: 200, worldHeight: 200, sectorCount: 8 });
const grid = createSpatialHashGrid({ capacity: 12, worldWidth: 200, worldHeight: 200, cellSize: 10 });

const center = spawnAgent(world, { x: 50, y: 50 });
const nearA = spawnAgent(world, { x: 55, y: 50 });
const nearB = spawnAgent(world, { x: 50, y: 62 });
const farA = spawnAgent(world, { x: 70, y: 50 });
const farB = spawnAgent(world, { x: 50, y: 85 });
const deadNear = spawnAgent(world, { x: 54, y: 54 });
const edge = spawnAgent(world, { x: 2, y: 2 });
const edgeNear = spawnAgent(world, { x: 9, y: 3 });

killAgent(world, deadNear);
buildSpatialHashGrid(grid, world);

const visits = [];
const stats = forEachNeighborInRadius(grid, world, center, 15, (visit) => visits.push(visit));
const visitedIds = visits.map((visit) => visit.neighborIndex).sort((a, b) => a - b);

assertArrayEqual(visitedIds, [nearA, nearB], "radius neighbors");
assertEqual(stats.neighborCount, 2, "neighbor count");
assertEqual(stats.skippedSelfCount, 1, "skipped self");
assertEqual(stats.skippedDeadCount, 0, "dead not present after grid rebuild");
assertInRange(stats.candidateCount, 3, 12, "candidate count bounded");
assertAlmostEqual(visits[0].distanceSquared, 144, 200, "distance squared present");

const smallOutput = new Int32Array(1);
const writeSmall = writeNeighborsInRadius(grid, world, center, 15, smallOutput);
assertEqual(writeSmall.stats.neighborCount, 2, "write full neighbor count");
assertEqual(writeSmall.writtenCount, 1, "write small count");
assertEqual(writeSmall.truncated, true, "write truncated");

const largeOutput = new Int32Array(8);
const writeLarge = writeNeighborsInRadius(grid, world, center, 15, largeOutput);
assertEqual(writeLarge.stats.neighborCount, 2, "write large neighbor count");
assertEqual(writeLarge.writtenCount, 2, "write large count");
assertEqual(writeLarge.truncated, false, "write not truncated");

const edgeVisits = [];
const edgeStats = forEachNeighborInRadius(grid, world, edge, 10, (visit) => edgeVisits.push(visit.neighborIndex));
assertArrayEqual(edgeVisits, [edgeNear], "edge radius query");
assertInRange(edgeStats.visitedCellCount, 4, 9, "edge visited cells clamped");

const summary = sampleLocalNeighborStats(grid, world, { radius: 15, maxSampleCount: 4, stride: 1 });
assertEqual(summary.radius, 15, "summary radius");
assertEqual(summary.sampleCount, 4, "summary sample count");
assertInRange(summary.totalCandidates, 4, 48, "summary candidates");
assertInRange(summary.avgNeighborsPerAgent, 0.25, 3, "summary average neighbors");
assertInRange(summary.maxNeighborsForAgent, 1, 4, "summary max neighbors");

assertThrows(() => forEachNeighborInRadius(grid, world, center, 0, () => undefined), "zero radius");
assertThrows(() => sampleLocalNeighborStats(grid, world, { radius: 10, maxSampleCount: -1 }), "bad sample count");
assertThrows(() => sampleLocalNeighborStats(grid, world, { radius: 10, stride: 0 }), "bad stride");
assertThrows(() => forEachNeighborInRadius(createSpatialHashGrid({ capacity: 12, worldWidth: 100, worldHeight: 200, cellSize: 10 }), world, center, 10, () => undefined), "world mismatch");

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("neighbor query tests passed");

async function transpileSimModule(sourceName, outputName) {
  const sourcePath = join(projectRoot, "src", "sim", sourceName);
  const outputPath = join(temporaryDirectory, outputName);
  const sourceText = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(sourceText, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true }
  });
  const outputText = transpiled.outputText
    .replaceAll('from "./arrays"', 'from "./arrays.mjs"')
    .replaceAll("from './arrays'", "from './arrays.mjs'")
    .replaceAll('from "./world"', 'from "./world.mjs"')
    .replaceAll("from './world'", "from './world.mjs'")
    .replaceAll('from "./spatialHash"', 'from "./spatialHash.mjs"')
    .replaceAll("from './spatialHash'", "from './spatialHash.mjs'");
  await writeFile(outputPath, outputText, "utf8");
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

function assertArrayEqual(actual, expected, label) {
  if (actual.length !== expected.length) throw new Error(`${label}: length mismatch ${actual.length} !== ${expected.length}`);
  for (let index = 0; index < actual.length; index += 1) {
    if (actual[index] !== expected[index]) throw new Error(`${label}: index ${index}: expected ${expected[index]}, got ${actual[index]}`);
  }
}

function assertInRange(actual, min, max, label) {
  if (actual < min || actual > max) throw new Error(`${label}: expected ${actual} to be in ${min}..${max}`);
}

function assertAlmostEqual(actual, expected, epsilon, label) {
  if (Math.abs(actual - expected) > epsilon) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

function assertThrows(fn, label) {
  let thrown = false;
  try { fn(); } catch { thrown = true; }
  if (!thrown) throw new Error(`${label}: expected function to throw`);
}
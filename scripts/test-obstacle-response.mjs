import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_obstacle_response_test");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

for (const moduleName of ["arrays.ts", "world.ts", "movement.ts", "obstacleMask.ts", "obstacleResponse.ts"]) {
  await transpileSimModule(moduleName, moduleName.replace(".ts", ".mjs"));
}

const { createWorldState, spawnAgent } = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);
const { createObstacleMask, setObstacleCell } = await import(pathToFileURL(join(temporaryDirectory, "obstacleMask.mjs")).href);
const { clearForces } = await import(pathToFileURL(join(temporaryDirectory, "movement.mjs")).href);
const { OBSTACLE_RESPONSE_VERSION, applyObstacleSoftResponse } = await import(pathToFileURL(join(temporaryDirectory, "obstacleResponse.mjs")).href);

assertEqual(OBSTACLE_RESPONSE_VERSION, "qubok_evolve.obstacle_response.v2", "obstacle response version");

const world = createWorldState({ capacity: 4, worldWidth: 100, worldHeight: 100, sectorCount: 8 });
const mask = createObstacleMask({ worldWidth: 100, worldHeight: 100, cellSize: 10 });

const near = spawnAgent(world, {
  x: 50,
  y: 55,
  headingX: 1,
  headingY: 0,
  radius: 2,
  mass: 1,
  drag: 0,
  maxSpeed: 100,
  metabolism: 0,
  energy: 100
});

const far = spawnAgent(world, {
  x: 30,
  y: 70,
  headingX: 1,
  headingY: 0,
  radius: 2,
  mass: 1,
  drag: 0,
  maxSpeed: 100,
  metabolism: 0,
  energy: 100
});

const boundary = spawnAgent(world, {
  x: 2,
  y: 50,
  headingX: 1,
  headingY: 0,
  radius: 1,
  mass: 1,
  drag: 0,
  maxSpeed: 100,
  metabolism: 0,
  energy: 100
});

setObstacleCell(mask, 6, 5, true); // center around x=65, y=55, pushes near agent left

const stats = applyObstacleSoftResponse(world, mask, {
  responseRadius: 24,
  forceScale: 20,
  maxForcePerAgent: 50,
  includeWorldBounds: true
});

assertEqual(stats.checkedCount, 3, "checked count");
assertGreater(stats.obstacleCellChecks, 0, "cell checks");
assertEqual(stats.obstacleCellsSkippedByStride, 0, "no skipped cells at stride 1");
assertEqual(stats.obstacleCellCheckLimitHits, 0, "no limit hits by default");
assertGreater(stats.obstacleHits, 0, "obstacle hits");
assertGreater(stats.boundaryHits, 0, "boundary hits");
assertGreater(stats.forceAppliedCount, 0, "force applied count");
assertGreater(stats.totalForceMagnitude, 0, "total force magnitude");
assertLess(world.fx[near], 0, "near agent pushed left away from obstacle");
assertAlmostEqual(world.fy[near], 0, 0.000001, "near agent y force");
assertAlmostEqual(world.fx[far], 0, 0.000001, "far agent no obstacle force");
assertGreater(world.fx[boundary], 0, "boundary agent pushed inward");

clearForces(world);
const cappedStats = applyObstacleSoftResponse(world, mask, {
  responseRadius: 24,
  forceScale: 1000,
  maxForcePerAgent: 5,
  includeWorldBounds: true
});
assertLessOrEqual(cappedStats.maxForceMagnitude, 5.000001, "max force cap");

clearForces(world);
const boundsOnlyStats = applyObstacleSoftResponse(world, mask, {
  responseRadius: 24,
  forceScale: 20,
  includeWorldBounds: true,
  boundsOnly: true
});
assertEqual(boundsOnlyStats.obstacleCellChecks, 0, "bounds-only skips mask checks");
assertEqual(boundsOnlyStats.obstacleHits, 0, "bounds-only skips mask hits");
assertGreater(boundsOnlyStats.boundaryHits, 0, "bounds-only keeps boundary hits");

clearForces(world);
const limitedStats = applyObstacleSoftResponse(world, mask, {
  responseRadius: 48,
  forceScale: 20,
  includeWorldBounds: false,
  maxObstacleCellChecksPerAgent: 1
});
assertGreater(limitedStats.obstacleCellCheckLimitHits, 0, "cell-check limit hit");
assertLessOrEqual(limitedStats.obstacleCellChecks, limitedStats.checkedCount, "max one obstacle cell check per agent");

clearForces(world);
const strideStats = applyObstacleSoftResponse(world, mask, {
  responseRadius: 48,
  forceScale: 20,
  includeWorldBounds: false,
  cellStride: 2
});
assertGreater(strideStats.obstacleCellsSkippedByStride, 0, "stride skips cells");
assertGreater(strideStats.obstacleCellChecks, 0, "stride still checks some cells");

assertThrows(() => applyObstacleSoftResponse(world, mask, { responseRadius: 0, forceScale: 1 }), "invalid response radius");
assertThrows(() => applyObstacleSoftResponse(world, mask, { responseRadius: 10, forceScale: -1 }), "invalid force scale");
assertThrows(() => applyObstacleSoftResponse(world, mask, { responseRadius: 10, forceScale: 1, cellStride: 0 }), "invalid cellStride");
assertThrows(
  () => applyObstacleSoftResponse(world, mask, { responseRadius: 10, forceScale: 1, maxObstacleCellChecksPerAgent: 0 }),
  "invalid max checks"
);
assertThrows(
  () => applyObstacleSoftResponse(world, createObstacleMask({ worldWidth: 50, worldHeight: 50, cellSize: 10 }), { responseRadius: 10, forceScale: 1 }),
  "incompatible mask"
);

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("obstacle response tests passed");

async function transpileSimModule(sourceName, outputName) {
  const sourcePath = join(projectRoot, "src", "sim", sourceName);
  const outputPath = join(temporaryDirectory, outputName);
  const sourceText = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(sourceText, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      strict: true
    }
  });

  const outputText = transpiled.outputText
    .replaceAll('from "./arrays"', 'from "./arrays.mjs"')
    .replaceAll("from './arrays'", "from './arrays.mjs'")
    .replaceAll('from "./world"', 'from "./world.mjs"')
    .replaceAll("from './world'", "from './world.mjs'")
    .replaceAll('from "./movement"', 'from "./movement.mjs"')
    .replaceAll("from './movement'", "from './movement.mjs'")
    .replaceAll('from "./obstacleMask"', 'from "./obstacleMask.mjs"')
    .replaceAll("from './obstacleMask'", "from './obstacleMask.mjs'")
    .replaceAll('from "./obstacleResponse"', 'from "./obstacleResponse.mjs"')
    .replaceAll("from './obstacleResponse'", "from './obstacleResponse.mjs'");

  await writeFile(outputPath, outputText, "utf8");
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertAlmostEqual(actual, expected, epsilon, label) {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`${label}: expected ${expected} +/- ${epsilon}, got ${actual}`);
  }
}

function assertGreater(actual, threshold, label) {
  if (!(actual > threshold)) {
    throw new Error(`${label}: expected ${actual} > ${threshold}`);
  }
}

function assertLess(actual, threshold, label) {
  if (!(actual < threshold)) {
    throw new Error(`${label}: expected ${actual} < ${threshold}`);
  }
}

function assertLessOrEqual(actual, threshold, label) {
  if (!(actual <= threshold)) {
    throw new Error(`${label}: expected ${actual} <= ${threshold}`);
  }
}

function assertThrows(fn, label) {
  let thrown = false;
  try {
    fn();
  } catch {
    thrown = true;
  }

  if (!thrown) {
    throw new Error(`${label}: expected function to throw`);
  }
}

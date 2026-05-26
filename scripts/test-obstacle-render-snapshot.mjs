import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_obstacle_render_snapshot_test");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

for (const moduleName of ["arrays.ts", "obstacleMask.ts", "obstacleRenderSnapshot.ts"]) {
  await transpileSimModule(moduleName, moduleName.replace(".ts", ".mjs"));
}

const { createObstacleMask, setObstacleCell, setObstacleRect } = await import(pathToFileURL(join(temporaryDirectory, "obstacleMask.mjs")).href);
const {
  OBSTACLE_RENDER_SNAPSHOT_VERSION,
  makeObstacleMaskRenderSnapshot
} = await import(pathToFileURL(join(temporaryDirectory, "obstacleRenderSnapshot.mjs")).href);

assertEqual(OBSTACLE_RENDER_SNAPSHOT_VERSION, "qubok_evolve.obstacle_render_snapshot.v1", "obstacle render snapshot version");

const mask = createObstacleMask({ worldWidth: 100, worldHeight: 80, cellSize: 10 });
setObstacleCell(mask, 2, 3, true);
setObstacleRect(mask, 40, 10, 55, 25, true);

const snapshot = makeObstacleMaskRenderSnapshot(mask);

assertEqual(snapshot.version, "qubok_evolve.obstacle_render_snapshot.v1", "snapshot version");
assertEqual(snapshot.worldWidth, 100, "snapshot world width");
assertEqual(snapshot.worldHeight, 80, "snapshot world height");
assertEqual(snapshot.cellSize, 10, "snapshot cell size");
assertEqual(snapshot.columns, 10, "snapshot columns");
assertEqual(snapshot.rows, 8, "snapshot rows");
assertEqual(snapshot.cellCount, 80, "snapshot cell count");
assertEqual(snapshot.occupiedCellCount, 5, "occupied count");
assertEqual(snapshot.occupiedCellIds.length, 5, "occupied id array length");
assertEqual(Array.from(snapshot.occupiedCellIds).includes(32), true, "manual occupied cell id included");

const emptyMask = createObstacleMask({ worldWidth: 100, worldHeight: 80, cellSize: 10 });
const emptySnapshot = makeObstacleMaskRenderSnapshot(emptyMask);
assertEqual(emptySnapshot.occupiedCellCount, 0, "empty occupied count");
assertEqual(emptySnapshot.occupiedCellIds.length, 0, "empty occupied ids");

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("obstacle render snapshot tests passed");

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
    .replaceAll('from "./obstacleMask"', 'from "./obstacleMask.mjs"')
    .replaceAll("from './obstacleMask'", "from './obstacleMask.mjs'")
    .replaceAll('from "./obstacleRenderSnapshot"', 'from "./obstacleRenderSnapshot.mjs"')
    .replaceAll("from './obstacleRenderSnapshot'", "from './obstacleRenderSnapshot.mjs'");

  await writeFile(outputPath, outputText, "utf8");
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

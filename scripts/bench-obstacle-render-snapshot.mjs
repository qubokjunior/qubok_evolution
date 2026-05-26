import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_obstacle_render_snapshot_bench");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

for (const moduleName of ["arrays.ts", "obstacleMask.ts", "obstacleRenderSnapshot.ts"]) {
  await transpileSimModule(moduleName, moduleName.replace(".ts", ".mjs"));
}

const { createObstacleMask, seedDemoObstacleMask, countOccupiedObstacleCells } = await import(pathToFileURL(join(temporaryDirectory, "obstacleMask.mjs")).href);
const { makeObstacleMaskRenderSnapshot } = await import(pathToFileURL(join(temporaryDirectory, "obstacleRenderSnapshot.mjs")).href);

const iterations = 100000;
const mask = createObstacleMask({ worldWidth: 2048, worldHeight: 2048, cellSize: 64 });
seedDemoObstacleMask(mask);

let occupiedCellCount = 0;
let cellIdChecksum = 0;

const start = performance.now();

for (let iteration = 0; iteration < iterations; iteration += 1) {
  const snapshot = makeObstacleMaskRenderSnapshot(mask);
  occupiedCellCount = snapshot.occupiedCellCount;
  cellIdChecksum += snapshot.occupiedCellIds[0] ?? 0;
}

const snapshotMs = performance.now() - start;

await rm(temporaryDirectory, { force: true, recursive: true });

console.log(JSON.stringify({
  bench: "obstacle-render-snapshot:m25",
  iterations,
  cellCount: mask.cellCount,
  occupiedCellCount,
  occupiedCellCountSource: countOccupiedObstacleCells(mask),
  snapshotMs: round3(snapshotMs),
  averageNsPerSnapshot: round3((snapshotMs * 1_000_000) / iterations),
  cellIdChecksum
}, null, 2));

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

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

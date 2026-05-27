import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_field_force_bench");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

for (const moduleName of ["arrays.ts", "field.ts", "world.ts", "fieldForce.ts"]) {
  await transpileSimModule(moduleName, moduleName.replace(".ts", ".mjs"));
}

const { createEnvironmentalFieldLayer, setFieldCell } = await import(pathToFileURL(join(temporaryDirectory, "field.mjs")).href);
const { createWorldState, spawnAgent } = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);
const { applyFieldForces } = await import(pathToFileURL(join(temporaryDirectory, "fieldForce.mjs")).href);

const cases = [
  { label: "1k agents / 64x64 field", agentCount: 1_000, columns: 64, rows: 64, iterations: 80 },
  { label: "5k agents / 128x128 field", agentCount: 5_000, columns: 128, rows: 128, iterations: 40 },
  { label: "10k agents / 128x128 field", agentCount: 10_000, columns: 128, rows: 128, iterations: 20 }
];

for (const benchCase of cases) {
  const result = runBenchCase(benchCase);
  console.log(`${result.label}: ${result.averageMs.toFixed(4)} ms/step | agents=${result.agentCount} | samples=${result.sampleCount} | affected=${result.affectedAgentCount} | clamps=${result.clampCount} | forceMag=${result.totalForceMagnitude.toFixed(2)}`);
}

await rm(temporaryDirectory, { force: true, recursive: true });

function runBenchCase({ label, agentCount, columns, rows, iterations }) {
  const cellSize = 8;
  const worldWidth = columns * cellSize;
  const worldHeight = rows * cellSize;
  const world = createWorldState({ capacity: agentCount, worldWidth, worldHeight });
  const field = createEnvironmentalFieldLayer({ worldWidth, worldHeight, cellSize });

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const flowX = ((x % 9) - 4) * 0.25;
      const flowY = ((y % 7) - 3) * 0.25;
      setFieldCell(field, x, y, flowX, flowY);
    }
  }

  for (let index = 0; index < agentCount; index += 1) {
    const x = ((index * 37) % worldWidth) + 0.5;
    const y = ((index * 53) % worldHeight) + 0.5;
    const flowAffinity = 0.25 + ((index % 11) / 10);
    spawnAgent(world, { x, y, flowAffinity });
  }

  applyFieldForces(world, field, { enabled: true, strength: 1, maxForcePerAgent: 10 });
  world.fx.fill(0, 0, world.count);
  world.fy.fill(0, 0, world.count);

  let lastMetrics;
  const start = performance.now();
  for (let i = 0; i < iterations; i += 1) {
    world.fx.fill(0, 0, world.count);
    world.fy.fill(0, 0, world.count);
    lastMetrics = applyFieldForces(world, field, { enabled: true, strength: 1, maxForcePerAgent: 10 });
  }
  const elapsedMs = performance.now() - start;

  return { label, averageMs: elapsedMs / iterations, ...lastMetrics };
}

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

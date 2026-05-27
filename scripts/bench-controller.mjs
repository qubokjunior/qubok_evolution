import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_controller_bench");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

for (const moduleName of ["arrays.ts", "world.ts", "controller.ts"]) {
  await transpileSimModule(moduleName, moduleName.replace(".ts", ".mjs"));
}

const { createWorldState, spawnAgent } = await import(pathToFileURL(join(temporaryDirectory, "world.mjs")).href);
const { createAgentControllerOutput, stepAgentController } = await import(pathToFileURL(join(temporaryDirectory, "controller.mjs")).href);

const cases = [
  { label: "1k agents / 8 sectors", agentCount: 1_000, sectorCount: 8, iterations: 120 },
  { label: "5k agents / 8 sectors", agentCount: 5_000, sectorCount: 8, iterations: 60 },
  { label: "10k agents / 8 sectors", agentCount: 10_000, sectorCount: 8, iterations: 30 }
];

for (const benchCase of cases) {
  const result = runBenchCase(benchCase);
  console.log(`${result.label}: ${result.averageMs.toFixed(4)} ms/step | agents=${result.agentCount} | samples=${result.sampleCount} | affected=${result.affectedAgentCount} | zero=${result.zeroIntentCount} | clamps=${result.clampCount} | intentMag=${result.totalIntentMagnitude.toFixed(2)}`);
}

await rm(temporaryDirectory, { force: true, recursive: true });

function runBenchCase({ label, agentCount, sectorCount, iterations }) {
  const worldWidth = 2048;
  const worldHeight = 2048;
  const world = createWorldState({ capacity: agentCount, worldWidth, worldHeight, sectorCount });
  const output = createAgentControllerOutput(agentCount);

  for (let index = 0; index < agentCount; index += 1) {
    const x = ((index * 37) % worldWidth) + 0.5;
    const y = ((index * 53) % worldHeight) + 0.5;
    spawnAgent(world, { x, y });
    world.flowSampleX[index] = ((index % 17) - 8) * 0.02;
    world.flowSampleY[index] = ((index % 13) - 6) * 0.02;

    const sectorBase = world.sensorSectorBase[index];
    for (let sector = 0; sector < sectorCount; sector += 1) {
      world.sectorFood[sectorBase + sector] = ((index + sector) % 11) * 0.025;
      world.sectorThreat[sectorBase + sector] = ((index * 3 + sector) % 7) * 0.02;
    }
  }

  stepAgentController(world, output, { enabled: true, strength: 1, maxIntentPerAgent: 2 });
  let lastMetrics;
  const start = performance.now();
  for (let i = 0; i < iterations; i += 1) {
    lastMetrics = stepAgentController(world, output, { enabled: true, strength: 1, maxIntentPerAgent: 2 });
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
    .replaceAll('from "./world"', 'from "./world.mjs"')
    .replaceAll("from './world'", "from './world.mjs'");
  await writeFile(outputPath, outputText, "utf8");
}

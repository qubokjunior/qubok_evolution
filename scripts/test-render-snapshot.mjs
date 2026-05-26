import { rmSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceSimDir = resolve(projectRoot, "src/sim");
const tmpRoot = resolve(projectRoot, ".tmp_render_snapshot_test");
const tmpSimDir = resolve(tmpRoot, "sim");

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

rmSync(tmpRoot, { recursive: true, force: true });
mkdirSync(tmpSimDir, { recursive: true });

for (const entry of readdirSync(sourceSimDir)) {
  if (!entry.endsWith(".ts")) {
    continue;
  }

  const sourcePath = join(sourceSimDir, entry);
  const source = readFileSync(sourcePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    fileName: sourcePath,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      isolatedModules: true,
      removeComments: false
    },
    reportDiagnostics: true
  });

  const blockingDiagnostics = (transpiled.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
  );

  if (blockingDiagnostics.length > 0) {
    const message = blockingDiagnostics
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))
      .join("\n");
    throw new Error(`TypeScript transpile failed for ${entry}:\n${message}`);
  }

  const output = rewriteRelativeImports(transpiled.outputText);
  const outputName = basename(entry, ".ts") + ".mjs";
  writeFileSync(join(tmpSimDir, outputName), output, "utf8");
}

const worldModule = await import(pathToFileURL(join(tmpSimDir, "world.mjs")).href);
const renderSnapshotModule = await import(pathToFileURL(join(tmpSimDir, "renderSnapshot.mjs")).href);
const demoSimulationModule = await import(pathToFileURL(join(tmpSimDir, "demoSimulation.mjs")).href);

const { createWorldState, spawnAgent } = worldModule;
const {
  RENDER_SNAPSHOT_VERSION,
  analyzeRenderSnapshot,
  computeRenderSnapshotChecksum,
  makeRenderSnapshot
} = renderSnapshotModule;
const { DEMO_SIMULATION_VERSION, createDemoSimulation } = demoSimulationModule;

const world = createWorldState({ capacity: 4, worldWidth: 128, worldHeight: 96, sectorCount: 8 });
spawnAgent(world, {
  x: 10,
  y: 20,
  headingX: 1,
  headingY: 0,
  radius: 3,
  energy: 50,
  maxEnergy: 100,
  speciesId: 2,
  colorRGBA: 0x112233ff
});
spawnAgent(world, {
  x: 30,
  y: 40,
  headingX: 0,
  headingY: 1,
  radius: 5,
  energy: 10,
  maxEnergy: 20,
  speciesId: 4,
  colorRGBA: 0x445566ff
});
world.alive[1] = 0;
world.tick = 42;
world.timeSeconds = 1.25;

const snapshot = makeRenderSnapshot(world);
assert(snapshot.version === RENDER_SNAPSHOT_VERSION, "snapshot version mismatch");
assert(snapshot.worldWidth === 128, "snapshot worldWidth mismatch");
assert(snapshot.worldHeight === 96, "snapshot worldHeight mismatch");
assert(snapshot.count === 2, "snapshot count mismatch");
assert(snapshot.tick === 42, "snapshot tick mismatch");
assert(snapshot.timeSeconds === 1.25, "snapshot timeSeconds mismatch");
assert(snapshot.x.length === 2, "snapshot x length must match world.count");
assert(snapshot.alive.length === 2, "snapshot alive length must match world.count");
assert(snapshot.x[0] === 10 && snapshot.y[0] === 20, "snapshot first position mismatch");
assert(snapshot.radius[1] === 5, "snapshot second radius mismatch");
assert(snapshot.colorRGBA[0] === 0x112233ff, "snapshot color mismatch");

const stats = analyzeRenderSnapshot(snapshot);
assert(stats.count === 2, "stats count mismatch");
assert(stats.aliveCount === 1, "stats aliveCount mismatch");
assert(Math.abs(stats.averageEnergy01 - 0.5) < 0.000001, "stats averageEnergy01 mismatch");

const checksumBefore = computeRenderSnapshotChecksum(snapshot);
world.x[0] = 11;
const checksumAfter = computeRenderSnapshotChecksum(makeRenderSnapshot(world));
assert(checksumBefore !== checksumAfter, "checksum should react to position changes");

assert(DEMO_SIMULATION_VERSION.includes("demo_simulation"), "demo simulation version missing");
const demo = createDemoSimulation({
  seed: "qubok_evolve:test:render_snapshot:m16",
  capacity: 64,
  initialAgentCount: 32,
  worldWidth: 256,
  worldHeight: 256,
  resourceCapacity: 96,
  targetResourceCount: 48
});
const result = demo.step(1 / 60);
assert(result.snapshot.version === RENDER_SNAPSHOT_VERSION, "demo snapshot version mismatch");
assert(result.snapshot.count === demo.world.count, "demo snapshot count must track demo world count");
assert(Number.isFinite(result.simMsPerTick), "demo simMsPerTick must be finite");
assert(Number.isFinite(result.sensorStats.visibleNeighborCount), "demo sensor stats missing");
assert(Number.isFinite(result.predatorPreyStats.attacksThisStep), "demo predator/prey stats missing");
assert(Number.isFinite(result.reproductionStats.birthsThisStep), "demo reproduction stats missing");

console.log("render snapshot tests passed");

function rewriteRelativeImports(source) {
  return source
    .replace(/(from\s+["'])(\.{1,2}\/[^"']+)(["'])/g, (_, prefix, specifier, suffix) => {
      return `${prefix}${toMjsSpecifier(specifier)}${suffix}`;
    })
    .replace(/(import\s*\(\s*["'])(\.{1,2}\/[^"']+)(["']\s*\))/g, (_, prefix, specifier, suffix) => {
      return `${prefix}${toMjsSpecifier(specifier)}${suffix}`;
    });
}

function toMjsSpecifier(specifier) {
  if (/\.(mjs|js|json)$/.test(specifier)) {
    return specifier;
  }

  return `${specifier}.mjs`;
}
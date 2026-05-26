import { rmSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceSimDir = resolve(projectRoot, "src/sim");
const tmpRoot = resolve(projectRoot, ".tmp_world_free_list_test");
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
const rngModule = await import(pathToFileURL(join(tmpSimDir, "rng.mjs")).href);
const reproductionModule = await import(pathToFileURL(join(tmpSimDir, "reproduction.mjs")).href);
const renderSnapshotModule = await import(pathToFileURL(join(tmpSimDir, "renderSnapshot.mjs")).href);

const {
  canSpawnAgent,
  createWorldState,
  getAliveCount,
  getReusableSlotCount,
  killAgent,
  spawnAgent
} = worldModule;
const { createRng } = rngModule;
const { applyReproduction } = reproductionModule;
const { analyzeRenderSnapshot, makeRenderSnapshot } = renderSnapshotModule;

{
  const world = createWorldState({ capacity: 3, worldWidth: 128, worldHeight: 128, sectorCount: 8 });
  const first = spawnAgent(world, { x: 1, y: 2, genomeId: 10 });
  const second = spawnAgent(world, { x: 3, y: 4, genomeId: 20 });
  const third = spawnAgent(world, { x: 5, y: 6, genomeId: 30 });

  assert(first === 0, "first slot must append at 0");
  assert(second === 1, "second slot must append at 1");
  assert(third === 2, "third slot must append at 2");
  assert(world.count === 3, "count must reach capacity");
  assert(canSpawnAgent(world) === false, "full world without dead slots must not spawn");

  killAgent(world, 1);
  assert(getReusableSlotCount(world) === 1, "killAgent must create one reusable slot");
  assert(canSpawnAgent(world) === true, "dead slot must allow spawn at capacity");

  killAgent(world, 1);
  assert(getReusableSlotCount(world) === 1, "duplicate kill must not duplicate reusable slot");

  const reused = spawnAgent(world, {
    x: 88,
    y: 89,
    vx: 7,
    vy: 8,
    energy: 66,
    health: 77,
    speciesId: 9,
    genomeId: 99
  });

  assert(reused === 1, "spawnAgent must reuse dead slot before append");
  assert(world.count === 3, "reuse must not change historical count");
  assert(getReusableSlotCount(world) === 0, "reuse must consume reusable slot");
  assert(world.spawnReusedSlotCount === 1, "spawnReusedSlotCount must increment");
  assert(world.spawnAppendedSlotCount === 3, "spawnAppendedSlotCount must keep append count");
  assert(world.alive[1] === 1, "reused slot must be alive");
  assert(world.x[1] === 88, "reused slot x must be overwritten");
  assert(world.y[1] === 89, "reused slot y must be overwritten");
  assert(world.energy[1] === 66, "reused slot energy must be overwritten");
  assert(world.health[1] === 77, "reused slot health must be overwritten");
  assert(world.fx[1] === 0, "reused slot force x must reset");
  assert(world.fy[1] === 0, "reused slot force y must reset");
  assert(world.offspringCount[1] === 0, "reused slot offspring count must reset");
  assert(world.damageTaken[1] === 0, "reused slot damage must reset");
  assert(world.foodEaten[1] === 0, "reused slot food counter must reset");
  assert(world.kills[1] === 0, "reused slot kill counter must reset");
  assert(world.age[1] === 0, "reused slot age must reset");

  killAgent(world, 0);
  const snapshot = makeRenderSnapshot(world);
  const stats = analyzeRenderSnapshot(snapshot);
  assert(snapshot.count === 3, "render snapshot must keep historical slot count");
  assert(snapshot.reusableSlotCount === 1, "render snapshot must expose reusable slot metric");
  assert(snapshot.spawnReusedSlotCount === 1, "render snapshot must expose reused slot metric");
  assert(stats.aliveCount === 2, "render snapshot analysis must count only alive agents");
  assert(getAliveCount(world) === 2, "world alive count must match render stats");
}

{
  const world = createWorldState({ capacity: 2, worldWidth: 128, worldHeight: 128, sectorCount: 8 });
  const parent = spawnAgent(world, {
    x: 64,
    y: 64,
    energy: 120,
    maxEnergy: 160,
    stamina: 11,
    maxStamina: 50,
    health: 90,
    genomeId: 100,
    generationId: 4,
    speciesId: 7,
    radius: 4,
    mass: 2,
    drag: 0.03,
    maxSpeed: 70,
    turnRate: 5,
    metabolism: 0.04,
    mouthPower: 2,
    landThrust: 1,
    visionRadius: 90
  });
  const dead = spawnAgent(world, { x: 1, y: 1, genomeId: 200 });

  world.age[parent] = 10;
  killAgent(world, dead);

  assert(world.count === world.capacity, "reproduction case must start at capacity");
  assert(getReusableSlotCount(world) === 1, "reproduction case must have a reusable slot");

  const stats = applyReproduction(world, createRng("qubok_evolve:m26:reproduction"), {
    energyThreshold: 80,
    energyCost: 30,
    childEnergy: 40,
    minAgeSeconds: 4,
    maxBirthsPerStep: 1,
    spawnRadius: 0,
    mutationChance: 0,
    mutationStandardDeviationScale: 0
  });

  assert(stats.eligibleCount === 1, "parent must be eligible");
  assert(stats.blockedByCapacity === 0, "capacity gate must accept reusable slot");
  assert(stats.birthsThisStep === 1, "child must be born into reusable slot");
  assert(world.count === 2, "count must remain at capacity after reuse birth");
  assert(world.spawnReusedSlotCount === 1, "reproduction must reuse the dead slot");
  assert(world.alive[dead] === 1, "child must revive dead slot");
  assert(world.energy[parent] === 90, "parent energy must be spent");
  assert(world.energy[dead] === 40, "child energy must initialize");
  assert(world.generationId[dead] === 5, "child generation must increment");
  assert(world.parentGenomeId[dead] === 100, "child parent genome must be set");
  assert(world.speciesId[dead] === 7, "child must inherit species");
  assert(world.offspringCount[dead] === 0, "child must overwrite stale offspring counter");
}

rmSync(tmpRoot, { recursive: true, force: true });
console.log("world free-list tests passed");

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

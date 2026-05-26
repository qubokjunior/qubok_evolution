import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const branch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
if (branch !== "m36-terrain-resource-affinity") throw new Error("Expected m36-terrain-resource-affinity, got " + branch);

patch("src/sim/demoSimulation.ts", (t) => t
  .replace('DEMO_SIMULATION_VERSION = "qubok_evolve.demo_simulation.v17"', 'DEMO_SIMULATION_VERSION = "qubok_evolve.demo_simulation.v18"')
  .replace('createRng(config.seed ?? "qubok_evolve:demo:m35")', 'createRng(config.seed ?? "qubok_evolve:demo:m36")')
  .replace('spawnRandomResourcesAvoidingObstacles(resources, resourceTargetCount, rng, obstacleMask, spawnConfig)', 'spawnRandomResourcesAvoidingObstacles(resources, resourceTargetCount, rng, obstacleMask, { ...spawnConfig, terrain })')
  .replace('          failedCount: 0\n        };', '          failedCount: 0,\n          terrainResourceSampleCount: 0,\n          terrainResourceAffinitySum: 0,\n          terrainResourceRejectedCount: 0\n        };')
  .replace('      spawnConfig\n    );', '      { ...spawnConfig, terrain }\n    );')
);

patch("src/shared/perfMetrics.ts", (t) => after(t, '  "resourceAliveCount",', '  "terrainResourceSampleCount",\n  "terrainResourceAffinitySum",\n  "terrainResourceRejectedCount",'));

patch("src/render/pixiRenderer.ts", (t) => {
  t = after(t, '    metrics.record("resourceAliveCount", frame.resourceAliveCount);', '    metrics.record("terrainResourceSampleCount", frame.resourceRespawnStats.terrainResourceSampleCount);\n    metrics.record("terrainResourceAffinitySum", frame.resourceRespawnStats.terrainResourceAffinitySum);\n    metrics.record("terrainResourceRejectedCount", frame.resourceRespawnStats.terrainResourceRejectedCount);');
  return t.replace('        resourceAliveCount: snapshot.values.resourceAliveCount,\n        resourceTargetCount: frame.resourceTargetCount,', '        resourceAliveCount: snapshot.values.resourceAliveCount,\n        terrainResourceSampleCount: snapshot.values.terrainResourceSampleCount,\n        terrainResourceAffinitySum: snapshot.values.terrainResourceAffinitySum,\n        terrainResourceRejectedCount: snapshot.values.terrainResourceRejectedCount,\n        resourceTargetCount: frame.resourceTargetCount,');
});

patch("src/render/debugOverlay.ts", (t) => {
  t = t.replace('  readonly resourceAliveCount: number;\n  readonly resourceTargetCount: number;', '  readonly resourceAliveCount: number;\n  readonly terrainResourceSampleCount: number;\n  readonly terrainResourceAffinitySum: number;\n  readonly terrainResourceRejectedCount: number;\n  readonly resourceTargetCount: number;');
  t = after(t, '    resourceAliveCount: createValueRow(root, "food alive"),', '    terrainResourceSampleCount: createValueRow(root, "terrain food samples"),\n    terrainResourceAffinitySum: createValueRow(root, "terrain food affinity"),\n    terrainResourceRejectedCount: createValueRow(root, "terrain food reject"),');
  return after(t, '    rows.resourceAliveCount.textContent = formatInt(snapshot.resourceAliveCount);', '    rows.terrainResourceSampleCount.textContent = formatInt(snapshot.terrainResourceSampleCount);\n    rows.terrainResourceAffinitySum.textContent = formatDecimal(snapshot.terrainResourceAffinitySum);\n    rows.terrainResourceRejectedCount.textContent = formatInt(snapshot.terrainResourceRejectedCount);');
});

write("scripts/test-terrain-resource-affinity.mjs", `import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = process.cwd();
const tmp = join(root, ".tmp_terrain_resource_affinity_test");
await rm(tmp, { force: true, recursive: true });
await mkdir(tmp, { recursive: true });
for (const name of ["arrays.ts", "obstacleMask.ts", "resources.ts", "terrain.ts", "world.ts", "spawnValidation.ts"]) await transpile(name, name.replace(".ts", ".mjs"));
const obstacle = await import(pathToFileURL(join(tmp, "obstacleMask.mjs")).href);
const resources = await import(pathToFileURL(join(tmp, "resources.mjs")).href);
const terrainMod = await import(pathToFileURL(join(tmp, "terrain.mjs")).href);
const spawn = await import(pathToFileURL(join(tmp, "spawnValidation.mjs")).href);
const mask = obstacle.createObstacleMask({ worldWidth: 30, worldHeight: 10, cellSize: 10 });
const layer = resources.createResourceLayer({ capacity: 4, worldWidth: 30, worldHeight: 10, cellSize: 10 });
const terrain = terrainMod.createTerrainLayer({ worldWidth: 30, worldHeight: 10, cellSize: 10 });
terrainMod.setTerrainCellMaterial(terrain, 0, 0, 3);
terrainMod.setTerrainCellMaterial(terrain, 1, 0, 1);
const rng = { rangeValues: [5, 5, 15, 5, 12, 3], intValues: [1], floatValues: [0.9, 0], range(a, b) { return this.rangeValues.shift() ?? a; }, int(a, b) { return this.intValues.shift() ?? a; }, nextFloat01() { return this.floatValues.shift() ?? 0; } };
const stats = spawn.spawnRandomResourcesAvoidingObstacles(layer, 1, rng, mask, { terrain, maxAttempts: 8, terrainAffinityMaxAttempts: 4 });
assertEqual(stats.spawnedCount, 1, "spawnedCount");
assertEqual(stats.terrainResourceSampleCount, 2, "sample count");
assertEqual(stats.terrainResourceRejectedCount, 1, "rejected count");
assert(layer.x[0] >= 10 && layer.x[0] < 20, "resource should spawn in accepted high-affinity cell");
assert(stats.terrainResourceAffinitySum > 1, "affinity sum should accumulate samples");
await rm(tmp, { force: true, recursive: true });
console.log("terrain resource affinity tests passed");
async function transpile(source, output) { const s = await readFile(join(root, "src", "sim", source), "utf8"); const r = ts.transpileModule(s, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true } }); let o = r.outputText; for (const n of ["arrays", "obstacleMask", "resources", "terrain", "world"]) o = o.replaceAll('from "./' + n + '"', 'from "./' + n + '.mjs"'); await writeFile(join(tmp, output), o, "utf8"); }
function assert(value, message) { if (!value) throw new Error(message); }
function assertEqual(actual, expected, message) { if (actual !== expected) throw new Error(message + ": expected " + expected + ", got " + actual); }
`);

write("docs/integration_m36.md", `# m36 integration: terrain resource affinity

Milestone 36 connects terrain resourceAffinity to resource spawning and respawning.

## Implementation

- Resource spawn validation can receive an optional terrain layer.
- Candidate resource positions sample terrain.resourceAffinity.
- Low-affinity terrain can reject candidates through bounded rejection sampling.
- Demo resource spawn and respawn pass the existing terrain layer.
- Overlay metrics expose terrain resource samples, affinity sum, and rejected candidates.

## Acceptance

- npm run test:terrain-resource-affinity
- npm run test
- npm run build

## Explicitly not changed

- no terrain editor
- no terrain sensor integration
- no fluid field
- no controller/brain work
`);

patch("README.md", (t) => t.replaceAll("m35", "m36").replaceAll("milestone.35", "milestone.36").replace("terrain movement query integration using material friction, drag, and movement cost.", "terrain movement query integration using material friction, drag, and movement cost;\n- terrain resource-affinity spawning and respawning.").replace("npm run test:terrain-movement-query\n", "npm run test:terrain-movement-query\nnpm run test:terrain-resource-affinity\n").replace("current terrain movement query milestone", "current terrain resource-affinity milestone"));
patch("docs/milestones.md", (t) => t.replace("Compact milestone index through m35.", "Compact milestone index through m36.").replace("| m35 | Terrain movement query integration using material friction, drag, and movement cost. | complete |", "| m35 | Terrain movement query integration using material friction, drag, and movement cost. | complete |\n| m36 | Terrain resource-affinity spawning and respawning. | complete |").replace("- m36: terrain resource-affinity integration.", "- m37: terrain-aware sensor sampling."));
patch("docs/roadmap.md", (t) => t.replaceAll("m35", "m36").replaceAll("milestone.35", "milestone.36").replace("terrain movement query integration using material friction, drag, and movement cost.", "terrain movement query integration using material friction, drag, and movement cost.\n\nm36 shipped: terrain resource-affinity spawning and respawning.").replace("later terrain query integration for resources, sensors, spawning, and reproduction;", "terrain resource-affinity integration for spawning and respawning;\n- later terrain query integration for sensors and reproduction;"));
patch("docs/architecture_tracks.md", (t) => t.replace("Current status: m35.", "Current status: m36.").replace("movement query integration, later resource/sensor query integration, tests", "movement query integration, resource-affinity spawn integration, later sensor query integration, tests"));
patch("scripts/test-repo-status.mjs", (t) => t.replaceAll("milestone.35", "milestone.36").replaceAll("m35", "m36").replaceAll("integration_m35", "integration_m36").replaceAll("terrain movement query", "terrain resource affinity"));
patch("scripts/test-roadmap-status.mjs", (t) => t.replaceAll("milestone.35", "milestone.36").replaceAll("m35", "m36").replaceAll("integration_m35", "integration_m36").replace("terrain movement query integration", "terrain resource-affinity").replace("movement must sample terrain", "spawn validation must sample resourceAffinity"));
patch("scripts/test-demo-integration.mjs", (t) => {
  t = t.replaceAll("milestone.35", "milestone.36").replaceAll("m35", "m36");
  if (!t.includes('scripts/test-terrain-resource-affinity.mjs')) t = t.replace('const terrainMovementQueryTest = readText("scripts/test-terrain-movement-query.mjs");', 'const terrainMovementQueryTest = readText("scripts/test-terrain-movement-query.mjs");\nconst terrainResourceAffinityTest = readText("scripts/test-terrain-resource-affinity.mjs");');
  if (!t.includes('test:terrain-resource-affinity')) t = t.replace('assert(terrainMovementQueryTest.includes("terrain movement query tests passed"), "terrain movement query test must expose pass token.");', 'assert(terrainMovementQueryTest.includes("terrain movement query tests passed"), "terrain movement query test must expose pass token.");\nassert(packageJson.scripts["test:terrain-resource-affinity"] === "node scripts/test-terrain-resource-affinity.mjs", "package.json must expose test:terrain-resource-affinity.");\nassert(packageJson.scripts.test.includes("test:terrain-resource-affinity"), "npm run test must include terrain resource affinity test.");\nassert(perfMetrics.includes("terrainResourceSampleCount"), "perf metrics must expose terrainResourceSampleCount.");\nassert(debugOverlay.includes("terrain food samples"), "debugOverlay must expose terrain resource labels.");\nassert(terrainResourceAffinityTest.includes("terrain resource affinity tests passed"), "terrain resource affinity test must expose pass token.");');
  return t;
});
console.log("m36 finish patch applied");

function read(path) { return readFileSync(join(root, path), "utf8").replaceAll("\r\n", "\n"); }
function write(path, text) { const target = join(root, path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, text, "utf8"); }
function patch(path, fn) { write(path, fn(read(path))); }
function after(text, anchor, insert) { return text.includes(insert) ? text : text.replace(anchor, anchor + "\n" + insert); }

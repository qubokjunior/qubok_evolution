import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
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

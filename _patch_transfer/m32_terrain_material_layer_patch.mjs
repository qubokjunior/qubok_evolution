import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const expectedBranch = "m32-terrain-material-layer";

main();

function main() {
  console.log("\n--- VERIFY BRANCH ---");
  const branch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
  if (branch !== expectedBranch) throw new Error("Expected branch " + expectedBranch + ", got " + branch);

  console.log("\n--- RESTORE TRACKED TARGETS FROM HEAD ---");
  for (const file of [
    "README.md",
    "package.json",
    "src/shared/appVersion.ts",
    "scripts/test-demo-integration.mjs",
    "scripts/test-repo-status.mjs",
    "scripts/test-roadmap-status.mjs",
    "docs/milestones.md",
    "docs/roadmap.md",
    "docs/architecture_tracks.md"
  ]) {
    if (existsSync(filePath(file))) execFileSync("git", ["checkout", "HEAD", "--", file], { stdio: "inherit" });
  }

  for (const file of [
    "src/sim/terrain.ts",
    "scripts/test-terrain.mjs",
    "scripts/bench-terrain.mjs",
    "docs/integration_m32.md"
  ]) remove(file);

  console.log("\n--- PATCH package/appVersion ---");
  patchPackageJson();
  write("src/shared/appVersion.ts", [
    "export const PROJECT_NAME = \"qubok_evolve\" as const;",
    "export const PROJECT_VERSION = \"0.1.0-milestone.32\" as const;",
    "export const PROJECT_MILESTONE = 32 as const;",
    "export const PROJECT_MILESTONE_LABEL = \"m32\" as const;"
  ].join("\n") + "\n");

  console.log("\n--- WRITE TERRAIN MODULE ---");
  write("src/sim/terrain.ts", terrainSource());

  console.log("\n--- WRITE TESTS AND BENCH ---");
  write("scripts/test-terrain.mjs", terrainTestSource());
  write("scripts/bench-terrain.mjs", terrainBenchSource());

  console.log("\n--- PATCH DOCS ---");
  write("docs/integration_m32.md", integrationM32());
  patchReadme();
  patchMilestones();
  patchRoadmap();
  patchArchitectureTracks();
  write("scripts/test-repo-status.mjs", repoStatusTestSource());
  write("scripts/test-roadmap-status.mjs", roadmapStatusTestSource());
  patchDemoIntegrationTest();

  console.log("\n--- SANITY ---");
  sanity();

  console.log("\nPATCH COMPLETE: m32 terrain material layer patched. Run verify manually:");
  console.log("npm run test:terrain");
  console.log("npm run test");
  console.log("npm run build");
  console.log("npm run bench:terrain");
  console.log("git status --short");
}

function patchPackageJson() {
  const pkg = JSON.parse(read("package.json"));
  pkg.version = "0.1.0-milestone.32";
  pkg.scripts["test:terrain"] = "node scripts/test-terrain.mjs";
  pkg.scripts["bench:terrain"] = "node scripts/bench-terrain.mjs";
  if (!pkg.scripts.test.includes("npm run test:terrain")) {
    const anchor = "npm run test:world && npm run test:world-free-list";
    if (!pkg.scripts.test.includes(anchor)) throw new Error("Missing test chain anchor for terrain.");
    pkg.scripts.test = pkg.scripts.test.replace(anchor, "npm run test:world && npm run test:terrain && npm run test:world-free-list");
  }
  write("package.json", JSON.stringify(pkg, null, 2) + "\n");
}

function patchReadme() {
  let text = read("README.md");
  text = text.replaceAll("0.1.0-milestone.31", "0.1.0-milestone.32");
  text = text.replaceAll("Current status: m31", "Current status: m32");
  if (!text.includes("terrain/material data layer")) {
    text = text.replace(
      "- static tests guarding architecture boundaries, repo status, roadmap status, and lifecycle death routing.",
      "- static tests guarding architecture boundaries, repo status, roadmap status, and lifecycle death routing;\n- terrain/material data layer with deterministic cell/material sampling."
    );
  }
  if (!text.includes("npm run test:terrain")) {
    text = text.replace("npm run test:roadmap-status\n", "npm run test:roadmap-status\nnpm run test:terrain\n");
  }
  write("README.md", text);
}

function patchMilestones() {
  let text = read("docs/milestones.md");
  if (!text.includes("| m31 |")) {
    text = text.replace("| m30 | README/status sync, milestone index, and repo-status test. | complete |", "| m30 | README/status sync, milestone index, and repo-status test. | complete |\n| m31 | Roadmap and architecture-track split for future work. | complete |");
  }
  if (!text.includes("| m32 |")) {
    text = text.replace("| m31 | Roadmap and architecture-track split for future work. | complete |", "| m31 | Roadmap and architecture-track split for future work. | complete |\n| m32 | Terrain/material typed-array layer foundation with query API. | complete |");
  }
  write("docs/milestones.md", text);
}

function patchRoadmap() {
  let text = read("docs/roadmap.md");
  text = text.replaceAll("m31 / 0.1.0-milestone.31", "m32 / 0.1.0-milestone.32");
  if (!text.includes("m32 shipped: terrain/material typed-array layer")) {
    text = text.replace("## terrain/material track", "## terrain/material track\n\nm32 shipped: terrain/material typed-array layer, material definitions, position-to-cell query API, tests, and benchmark.");
  }
  write("docs/roadmap.md", text);
}

function patchArchitectureTracks() {
  let text = read("docs/architecture_tracks.md");
  text = text.replaceAll("Current status: m31.", "Current status: m32.");
  if (!text.includes("src/sim/terrain.ts")) {
    text = text.replace(
      "| terrain/material | terrain data modules, movement/resource/sensor query integration, tests | Pixi internals except through snapshots |",
      "| terrain/material | terrain data modules including src/sim/terrain.ts, movement/resource/sensor query integration, tests | Pixi internals except through snapshots |"
    );
  }
  write("docs/architecture_tracks.md", text);
}

function patchDemoIntegrationTest() {
  let text = read("scripts/test-demo-integration.mjs");
  text = text.replaceAll("0.1.0-milestone.31", "0.1.0-milestone.32");
  text = text.replaceAll("milestone.31", "milestone.32");
  text = text.replaceAll("m31", "m32");

  if (!text.includes('const terrain = readText("src/sim/terrain.ts");')) {
    text = text.replace(
      'const roadmapStatusTest = readText("scripts/test-roadmap-status.mjs");',
      'const roadmapStatusTest = readText("scripts/test-roadmap-status.mjs");\nconst terrain = readText("src/sim/terrain.ts");\nconst terrainTest = readText("scripts/test-terrain.mjs");\nconst terrainBench = readText("scripts/bench-terrain.mjs");'
    );
  }

  const block = [
    'assert(packageJson.scripts["test:terrain"] === "node scripts/test-terrain.mjs", "package.json must expose test:terrain.");',
    'assert(packageJson.scripts["bench:terrain"] === "node scripts/bench-terrain.mjs", "package.json must expose bench:terrain.");',
    'assert(packageJson.scripts.test.includes("test:terrain"), "npm run test must include terrain tests.");',
    'assert(terrain.includes("TERRAIN_LAYER_VERSION"), "terrain module must expose version token.");',
    'assert(terrain.includes("sampleTerrainAtPosition"), "terrain module must expose position sampling query.");',
    'assert(terrainTest.includes("terrain tests passed"), "terrain test must expose pass token.");',
    'assert(terrainBench.includes("bench-terrain:m32"), "terrain benchmark must expose m32 bench token.");'
  ].join("\n");

  if (!text.includes("terrain module must expose version token")) {
    text = text.replace(
      'assert(packageJson.scripts.test.includes("test:roadmap-status"), "npm run test must include roadmap status test.");',
      'assert(packageJson.scripts.test.includes("test:roadmap-status"), "npm run test must include roadmap status test.");\n' + block
    );
  }
  write("scripts/test-demo-integration.mjs", text);
}

function terrainSource() {
  return [
    'import {',
    '  assertFiniteNumber,',
    '  assertIndexInRange,',
    '  assertNonNegativeInteger,',
    '  createFloat32Array,',
    '  createUint16Array',
    '} from "./arrays";',
    '',
    'export const TERRAIN_LAYER_VERSION = "qubok_evolve.terrain_layer.v1" as const;',
    '',
    'export type TerrainMaterialDefinition = {',
    '  readonly id: number;',
    '  readonly name: string;',
    '  readonly friction: number;',
    '  readonly drag: number;',
    '  readonly resourceAffinity: number;',
    '  readonly movementCost: number;',
    '};',
    '',
    'export type TerrainLayerConfig = {',
    '  readonly worldWidth: number;',
    '  readonly worldHeight: number;',
    '  readonly cellSize: number;',
    '  readonly defaultMaterialId?: number;',
    '  readonly materialDefinitions?: readonly TerrainMaterialDefinition[];',
    '};',
    '',
    'export type TerrainLayer = {',
    '  readonly version: typeof TERRAIN_LAYER_VERSION;',
    '  readonly worldWidth: number;',
    '  readonly worldHeight: number;',
    '  readonly cellSize: number;',
    '  readonly columns: number;',
    '  readonly rows: number;',
    '  readonly cellCount: number;',
    '  readonly materialDefinitions: readonly TerrainMaterialDefinition[];',
    '  readonly materialId: Uint16Array;',
    '  readonly friction: Float32Array;',
    '  readonly drag: Float32Array;',
    '  readonly resourceAffinity: Float32Array;',
    '  readonly movementCost: Float32Array;',
    '};',
    '',
    'export type TerrainSample = {',
    '  readonly cellId: number;',
    '  readonly cellX: number;',
    '  readonly cellY: number;',
    '  readonly materialId: number;',
    '  readonly friction: number;',
    '  readonly drag: number;',
    '  readonly resourceAffinity: number;',
    '  readonly movementCost: number;',
    '};',
    '',
    'export type TerrainRectFillStats = {',
    '  readonly changedCellCount: number;',
    '  readonly updatedCellCount: number;',
    '};',
    '',
    'export const DEFAULT_TERRAIN_MATERIALS: readonly TerrainMaterialDefinition[] = [',
    '  { id: 0, name: "soil", friction: 1, drag: 0.02, resourceAffinity: 1, movementCost: 1 },',
    '  { id: 1, name: "mud", friction: 0.72, drag: 0.12, resourceAffinity: 1.25, movementCost: 1.35 },',
    '  { id: 2, name: "shallow_water", friction: 0.55, drag: 0.25, resourceAffinity: 0.85, movementCost: 1.75 },',
    '  { id: 3, name: "stone", friction: 1.18, drag: 0.01, resourceAffinity: 0.35, movementCost: 1.1 }',
    '];',
    '',
    'export function createTerrainLayer(config: TerrainLayerConfig): TerrainLayer {',
    '  assertFiniteNumber(config.worldWidth, "terrain worldWidth");',
    '  assertFiniteNumber(config.worldHeight, "terrain worldHeight");',
    '  assertFiniteNumber(config.cellSize, "terrain cellSize");',
    '',
    '  if (config.worldWidth <= 0 || config.worldHeight <= 0 || config.cellSize <= 0) {',
    '    throw new Error("Terrain dimensions and cell size must be positive.");',
    '  }',
    '',
    '  const columns = Math.max(1, Math.ceil(config.worldWidth / config.cellSize));',
    '  const rows = Math.max(1, Math.ceil(config.worldHeight / config.cellSize));',
    '  const cellCount = columns * rows;',
    '  const materialDefinitions = resolveMaterialDefinitions(config.materialDefinitions ?? DEFAULT_TERRAIN_MATERIALS);',
    '  const defaultMaterialId = config.defaultMaterialId ?? 0;',
    '',
    '  const layer: TerrainLayer = {',
    '    version: TERRAIN_LAYER_VERSION,',
    '    worldWidth: config.worldWidth,',
    '    worldHeight: config.worldHeight,',
    '    cellSize: config.cellSize,',
    '    columns,',
    '    rows,',
    '    cellCount,',
    '    materialDefinitions,',
    '    materialId: createUint16Array(cellCount, "terrain.materialId"),',
    '    friction: createFloat32Array(cellCount, "terrain.friction"),',
    '    drag: createFloat32Array(cellCount, "terrain.drag"),',
    '    resourceAffinity: createFloat32Array(cellCount, "terrain.resourceAffinity"),',
    '    movementCost: createFloat32Array(cellCount, "terrain.movementCost")',
    '  };',
    '',
    '  fillTerrainMaterial(layer, defaultMaterialId);',
    '  return layer;',
    '}',
    '',
    'export function fillTerrainMaterial(layer: TerrainLayer, materialId: number): void {',
    '  const material = getTerrainMaterialDefinition(layer, materialId);',
    '  layer.materialId.fill(material.id);',
    '  layer.friction.fill(material.friction);',
    '  layer.drag.fill(material.drag);',
    '  layer.resourceAffinity.fill(material.resourceAffinity);',
    '  layer.movementCost.fill(material.movementCost);',
    '}',
    '',
    'export function setTerrainCellMaterial(layer: TerrainLayer, cellX: number, cellY: number, materialId: number): number {',
    '  const cellId = getTerrainCellId(layer, cellX, cellY);',
    '  writeMaterialToCell(layer, cellId, getTerrainMaterialDefinition(layer, materialId));',
    '  return cellId;',
    '}',
    '',
    'export function setTerrainRectMaterial(layer: TerrainLayer, minX: number, minY: number, maxX: number, maxY: number, materialId: number): TerrainRectFillStats {',
    '  assertFiniteNumber(minX, "terrain rect minX");',
    '  assertFiniteNumber(minY, "terrain rect minY");',
    '  assertFiniteNumber(maxX, "terrain rect maxX");',
    '  assertFiniteNumber(maxY, "terrain rect maxY");',
    '  const material = getTerrainMaterialDefinition(layer, materialId);',
    '  const left = Math.min(minX, maxX);',
    '  const right = Math.max(minX, maxX);',
    '  const top = Math.min(minY, maxY);',
    '  const bottom = Math.max(minY, maxY);',
    '  const minCellX = clamp(Math.floor(left / layer.cellSize), 0, layer.columns - 1);',
    '  const maxCellX = clamp(Math.floor(right / layer.cellSize), 0, layer.columns - 1);',
    '  const minCellY = clamp(Math.floor(top / layer.cellSize), 0, layer.rows - 1);',
    '  const maxCellY = clamp(Math.floor(bottom / layer.cellSize), 0, layer.rows - 1);',
    '  let changedCellCount = 0;',
    '  let updatedCellCount = 0;',
    '  for (let y = minCellY; y <= maxCellY; y += 1) {',
    '    for (let x = minCellX; x <= maxCellX; x += 1) {',
    '      const cellId = getTerrainCellId(layer, x, y);',
    '      if (layer.materialId[cellId] !== material.id) changedCellCount += 1;',
    '      writeMaterialToCell(layer, cellId, material);',
    '      updatedCellCount += 1;',
    '    }',
    '  }',
    '  return { changedCellCount, updatedCellCount };',
    '}',
    '',
    'export function sampleTerrainAtPosition(layer: TerrainLayer, x: number, y: number): TerrainSample {',
    '  const cellX = getTerrainCellXForPosition(layer, x);',
    '  const cellY = getTerrainCellYForPosition(layer, y);',
    '  const cellId = getTerrainCellId(layer, cellX, cellY);',
    '  return {',
    '    cellId,',
    '    cellX,',
    '    cellY,',
    '    materialId: layer.materialId[cellId],',
    '    friction: layer.friction[cellId],',
    '    drag: layer.drag[cellId],',
    '    resourceAffinity: layer.resourceAffinity[cellId],',
    '    movementCost: layer.movementCost[cellId]',
    '  };',
    '}',
    '',
    'export function getTerrainCellIdForPosition(layer: TerrainLayer, x: number, y: number): number {',
    '  return getTerrainCellId(layer, getTerrainCellXForPosition(layer, x), getTerrainCellYForPosition(layer, y));',
    '}',
    '',
    'export function getTerrainCellId(layer: TerrainLayer, cellX: number, cellY: number): number {',
    '  assertIndexInRange(cellX, layer.columns, "terrain cellX");',
    '  assertIndexInRange(cellY, layer.rows, "terrain cellY");',
    '  return cellY * layer.columns + cellX;',
    '}',
    '',
    'export function getTerrainCellXForPosition(layer: TerrainLayer, x: number): number {',
    '  assertFiniteNumber(x, "terrain x");',
    '  return clamp(Math.floor(x / layer.cellSize), 0, layer.columns - 1);',
    '}',
    '',
    'export function getTerrainCellYForPosition(layer: TerrainLayer, y: number): number {',
    '  assertFiniteNumber(y, "terrain y");',
    '  return clamp(Math.floor(y / layer.cellSize), 0, layer.rows - 1);',
    '}',
    '',
    'export function getTerrainMaterialDefinition(layer: TerrainLayer, materialId: number): TerrainMaterialDefinition {',
    '  assertMaterialId(materialId);',
    '  const material = layer.materialDefinitions.find((definition) => definition.id === materialId);',
    '  if (!material) throw new Error("Unknown terrain material id: " + materialId);',
    '  return material;',
    '}',
    '',
    'export function getTerrainMemoryBytes(layer: TerrainLayer): number {',
    '  return layer.materialId.byteLength + layer.friction.byteLength + layer.drag.byteLength + layer.resourceAffinity.byteLength + layer.movementCost.byteLength;',
    '}',
    '',
    'function writeMaterialToCell(layer: TerrainLayer, cellId: number, material: TerrainMaterialDefinition): void {',
    '  layer.materialId[cellId] = material.id;',
    '  layer.friction[cellId] = material.friction;',
    '  layer.drag[cellId] = material.drag;',
    '  layer.resourceAffinity[cellId] = material.resourceAffinity;',
    '  layer.movementCost[cellId] = material.movementCost;',
    '}',
    '',
    'function resolveMaterialDefinitions(definitions: readonly TerrainMaterialDefinition[]): readonly TerrainMaterialDefinition[] {',
    '  if (definitions.length === 0) throw new Error("Terrain must define at least one material.");',
    '  const seen = new Set<number>();',
    '  return definitions.map((definition) => {',
    '    assertMaterialId(definition.id);',
    '    if (seen.has(definition.id)) throw new Error("Duplicate terrain material id: " + definition.id);',
    '    seen.add(definition.id);',
    '    assertFiniteNumber(definition.friction, "terrain material friction");',
    '    assertFiniteNumber(definition.drag, "terrain material drag");',
    '    assertFiniteNumber(definition.resourceAffinity, "terrain material resourceAffinity");',
    '    assertFiniteNumber(definition.movementCost, "terrain material movementCost");',
    '    if (definition.friction < 0 || definition.drag < 0 || definition.resourceAffinity < 0 || definition.movementCost < 0) {',
    '      throw new Error("Terrain material scalar values must be non-negative.");',
    '    }',
    '    return { ...definition };',
    '  });',
    '}',
    '',
    'function assertMaterialId(materialId: number): void {',
    '  assertNonNegativeInteger(materialId, "terrain materialId");',
    '  if (materialId > 0xffff) throw new Error("terrain materialId must fit Uint16. Received: " + materialId);',
    '}',
    '',
    'function clamp(value: number, min: number, max: number): number {',
    '  return Math.max(min, Math.min(max, value));',
    '}',
    ''
  ].join("\n");
}

function terrainTestSource() {
  return [
    'import { mkdir, readFile, rm, writeFile } from "node:fs/promises";',
    'import { createRequire } from "node:module";',
    'import { join } from "node:path";',
    'import { pathToFileURL } from "node:url";',
    '',
    'const require = createRequire(import.meta.url);',
    'const ts = require("typescript");',
    'const projectRoot = process.cwd();',
    'const temporaryDirectory = join(projectRoot, ".tmp_terrain_test");',
    '',
    'await rm(temporaryDirectory, { force: true, recursive: true });',
    'await mkdir(temporaryDirectory, { recursive: true });',
    'await transpileSimModule("arrays.ts", "arrays.mjs");',
    'await transpileSimModule("terrain.ts", "terrain.mjs");',
    'const terrainModule = await import(pathToFileURL(join(temporaryDirectory, "terrain.mjs")).href);',
    '',
    'const {',
    '  TERRAIN_LAYER_VERSION,',
    '  createTerrainLayer,',
    '  getTerrainCellId,',
    '  getTerrainCellIdForPosition,',
    '  getTerrainMaterialDefinition,',
    '  getTerrainMemoryBytes,',
    '  sampleTerrainAtPosition,',
    '  setTerrainCellMaterial,',
    '  setTerrainRectMaterial',
    '} = terrainModule;',
    '',
    'const layer = createTerrainLayer({ worldWidth: 100, worldHeight: 50, cellSize: 10 });',
    'assertEqual(layer.version, TERRAIN_LAYER_VERSION, "terrain version");',
    'assertEqual(layer.columns, 10, "columns");',
    'assertEqual(layer.rows, 5, "rows");',
    'assertEqual(layer.cellCount, 50, "cell count");',
    'assertEqual(layer.materialId[0], 0, "default material id");',
    'assertAlmostEqual(layer.friction[0], 1, 0.00001, "default friction");',
    '',
    'const changedCell = setTerrainCellMaterial(layer, 2, 3, 2);',
    'assertEqual(changedCell, getTerrainCellId(layer, 2, 3), "changed cell id");',
    'const waterSample = sampleTerrainAtPosition(layer, 25, 35);',
    'assertEqual(waterSample.cellX, 2, "sample cellX");',
    'assertEqual(waterSample.cellY, 3, "sample cellY");',
    'assertEqual(waterSample.materialId, 2, "sample material id");',
    'assertAlmostEqual(waterSample.friction, 0.55, 0.00001, "water friction");',
    'assertAlmostEqual(waterSample.drag, 0.25, 0.00001, "water drag");',
    '',
    'assertEqual(getTerrainCellIdForPosition(layer, -100, -10), 0, "negative position clamps to first cell");',
    'const edgeSample = sampleTerrainAtPosition(layer, 999, 999);',
    'assertEqual(edgeSample.cellX, 9, "edge cellX clamp");',
    'assertEqual(edgeSample.cellY, 4, "edge cellY clamp");',
    '',
    'const rectStats = setTerrainRectMaterial(layer, 0, 0, 19, 19, 1);',
    'assertEqual(rectStats.updatedCellCount, 4, "rect updated cells");',
    'assertEqual(rectStats.changedCellCount, 4, "rect changed cells");',
    'assertEqual(sampleTerrainAtPosition(layer, 5, 5).materialId, 1, "rect material sample");',
    '',
    'const mud = getTerrainMaterialDefinition(layer, 1);',
    'assertEqual(mud.name, "mud", "material lookup name");',
    'assertThrows(() => getTerrainMaterialDefinition(layer, 999), "unknown material throws");',
    'assertThrows(() => createTerrainLayer({ worldWidth: 100, worldHeight: 50, cellSize: 0 }), "invalid cell size throws");',
    'if (getTerrainMemoryBytes(layer) <= 0) throw new Error("terrain memory bytes must be positive");',
    '',
    'const a = createTerrainLayer({ worldWidth: 64, worldHeight: 64, cellSize: 8 });',
    'const b = createTerrainLayer({ worldWidth: 64, worldHeight: 64, cellSize: 8 });',
    'for (let i = 0; i < a.cellCount; i += 1) {',
    '  const x = i % a.columns;',
    '  const y = Math.floor(i / a.columns);',
    '  const materialId = (x + y) % 4;',
    '  setTerrainCellMaterial(a, x, y, materialId);',
    '  setTerrainCellMaterial(b, x, y, materialId);',
    '}',
    'assertEqual(JSON.stringify(Array.from(a.materialId)), JSON.stringify(Array.from(b.materialId)), "deterministic material field");',
    '',
    'await rm(temporaryDirectory, { force: true, recursive: true });',
    'console.log("terrain tests passed");',
    '',
    'async function transpileSimModule(sourceName, outputName) {',
    '  const sourcePath = join(projectRoot, "src", "sim", sourceName);',
    '  const outputPath = join(temporaryDirectory, outputName);',
    '  const sourceText = await readFile(sourcePath, "utf8");',
    '  const transpiled = ts.transpileModule(sourceText, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true } });',
    '  const outputText = transpiled.outputText.replaceAll("from \\\"./arrays\\\"", "from \\\"./arrays.mjs\\\"").replaceAll("from \\'./arrays\\'", "from \\'./arrays.mjs\\'");',
    '  await writeFile(outputPath, outputText, "utf8");',
    '}',
    'function assertEqual(actual, expected, label) { if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`); }',
    'function assertAlmostEqual(actual, expected, epsilon, label) { if (Math.abs(actual - expected) > epsilon) throw new Error(`${label}: expected ${expected} +/- ${epsilon}, got ${actual}`); }',
    'function assertThrows(fn, label) { let thrown = false; try { fn(); } catch { thrown = true; } if (!thrown) throw new Error(`${label}: expected function to throw`); }',
    ''
  ].join("\n");
}

function terrainBenchSource() {
  return [
    'import { mkdir, readFile, rm, writeFile } from "node:fs/promises";',
    'import { createRequire } from "node:module";',
    'import { join } from "node:path";',
    'import { performance } from "node:perf_hooks";',
    'import { pathToFileURL } from "node:url";',
    '',
    'const require = createRequire(import.meta.url);',
    'const ts = require("typescript");',
    'const projectRoot = process.cwd();',
    'const temporaryDirectory = join(projectRoot, ".tmp_terrain_bench");',
    'await rm(temporaryDirectory, { force: true, recursive: true });',
    'await mkdir(temporaryDirectory, { recursive: true });',
    'await transpileSimModule("arrays.ts", "arrays.mjs");',
    'await transpileSimModule("terrain.ts", "terrain.mjs");',
    'const terrainModule = await import(pathToFileURL(join(temporaryDirectory, "terrain.mjs")).href);',
    'const { createTerrainLayer, sampleTerrainAtPosition, setTerrainCellMaterial } = terrainModule;',
    'const layer = createTerrainLayer({ worldWidth: 2048, worldHeight: 2048, cellSize: 16 });',
    'for (let y = 0; y < layer.rows; y += 1) { for (let x = 0; x < layer.columns; x += 1) setTerrainCellMaterial(layer, x, y, (x * 3 + y * 5) % 4); }',
    'const sampleCount = 200000;',
    'let checksum = 0;',
    'const start = performance.now();',
    'for (let i = 0; i < sampleCount; i += 1) {',
    '  const sample = sampleTerrainAtPosition(layer, (i * 17) % 2048, (i * 31) % 2048);',
    '  checksum = (checksum + sample.materialId + Math.round(sample.movementCost * 100)) >>> 0;',
    '}',
    'const elapsedMs = performance.now() - start;',
    'console.log(JSON.stringify({ bench: "bench-terrain:m32", sampleCount, columns: layer.columns, rows: layer.rows, cellCount: layer.cellCount, elapsedMs: round(elapsedMs), samplesPerSecond: Math.round(sampleCount / (elapsedMs / 1000)), checksum }, null, 2));',
    'await rm(temporaryDirectory, { force: true, recursive: true });',
    'async function transpileSimModule(sourceName, outputName) {',
    '  const sourcePath = join(projectRoot, "src", "sim", sourceName);',
    '  const outputPath = join(temporaryDirectory, outputName);',
    '  const sourceText = await readFile(sourcePath, "utf8");',
    '  const transpiled = ts.transpileModule(sourceText, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true } });',
    '  const outputText = transpiled.outputText.replaceAll("from \\\"./arrays\\\"", "from \\\"./arrays.mjs\\\"").replaceAll("from \\'./arrays\\'", "from \\'./arrays.mjs\\'");',
    '  await writeFile(outputPath, outputText, "utf8");',
    '}',
    'function round(value) { return Math.round(value * 1000) / 1000; }',
    ''
  ].join("\n");
}

function integrationM32() {
  return [
    '# m32 integration: terrain/material layer foundation',
    '',
    'Milestone 32 starts the terrain/material track from the m31 roadmap without adding an editor, renderer refactor, controller, fluid field, or terrain visuals.',
    '',
    '## Implementation',
    '',
    '- `src/sim/terrain.ts` defines a typed-array terrain grid.',
    '- Each terrain cell stores material id, friction, drag, resource affinity, and movement cost.',
    '- `sampleTerrainAtPosition()` provides the world-position query API future movement/resource/sensor systems can consume.',
    '- `scripts/test-terrain.mjs` validates deterministic cell/material lookup and bounds behavior.',
    '- `scripts/bench-terrain.mjs` measures terrain query throughput.',
    '',
    '## Acceptance',
    '',
    '- `npm run test:terrain`',
    '- `npm run test`',
    '- `npm run build`',
    '- `npm run bench:terrain`',
    '',
    '## Explicitly not changed',
    '',
    '- no terrain editor',
    '- no terrain rendering',
    '- no movement integration yet',
    '- no resource distribution integration yet',
    '- no fluid field',
    '- no controller/brain work'
  ].join("\n") + "\n";
}

function repoStatusTestSource() {
  return [
    'import { readFileSync } from "node:fs";',
    'import { dirname, resolve } from "node:path";',
    'import { fileURLToPath } from "node:url";',
    'const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");',
    'const readText = (relativePath) => readFileSync(resolve(projectRoot, relativePath), "utf8");',
    'const assert = (condition, message) => { if (!condition) throw new Error(message); };',
    'const packageJson = JSON.parse(readText("package.json"));',
    'const appVersion = readText("src/shared/appVersion.ts");',
    'const readme = readText("README.md");',
    'const milestones = readText("docs/milestones.md");',
    'const integrationM32 = readText("docs/integration_m32.md");',
    'assert(packageJson.version === "0.1.0-milestone.32", "package.json must expose 0.1.0-milestone.32.");',
    'assert(appVersion.includes("PROJECT_VERSION = \\\"0.1.0-milestone.32\\\""), "appVersion must expose milestone.32.");',
    'assert(appVersion.includes("PROJECT_MILESTONE = 32"), "appVersion must expose milestone number 32.");',
    'assert(appVersion.includes("PROJECT_MILESTONE_LABEL = \\\"m32\\\""), "appVersion must expose m32 label.");',
    'assert(readme.includes("0.1.0-milestone.32"), "README.md must expose current milestone version.");',
    'assert(readme.includes("Current status: m32"), "README.md must expose current status m32.");',
    'assert(readme.includes("docs/milestones.md"), "README.md must point to milestone index.");',
    'for (const marker of ["| m30 |", "| m31 |", "| m32 |"]) assert(milestones.includes(marker), "docs/milestones.md missing marker: " + marker);',
    'assert(integrationM32.includes("terrain/material layer foundation"), "integration_m32 must describe terrain/material layer foundation.");',
    'assert(packageJson.scripts["test:repo-status"] === "node scripts/test-repo-status.mjs", "package.json must expose test:repo-status.");',
    'assert(packageJson.scripts.test.includes("test:repo-status"), "npm run test must include test:repo-status.");',
    'console.log("repo status tests passed");',
    ''
  ].join("\n");
}

function roadmapStatusTestSource() {
  return [
    'import { readFileSync } from "node:fs";',
    'import { dirname, resolve } from "node:path";',
    'import { fileURLToPath } from "node:url";',
    'const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");',
    'const readText = (relativePath) => readFileSync(resolve(projectRoot, relativePath), "utf8");',
    'const assert = (condition, message) => { if (!condition) throw new Error(message); };',
    'const packageJson = JSON.parse(readText("package.json"));',
    'const appVersion = readText("src/shared/appVersion.ts");',
    'const readme = readText("README.md");',
    'const roadmap = readText("docs/roadmap.md");',
    'const architectureTracks = readText("docs/architecture_tracks.md");',
    'const integrationM32 = readText("docs/integration_m32.md");',
    'const terrain = readText("src/sim/terrain.ts");',
    'assert(packageJson.version === "0.1.0-milestone.32", "package.json must expose m32 version.");',
    'assert(appVersion.includes("PROJECT_VERSION = \\\"0.1.0-milestone.32\\\""), "appVersion must expose milestone.32.");',
    'assert(appVersion.includes("PROJECT_MILESTONE_LABEL = \\\"m32\\\""), "appVersion must expose m32 label.");',
    'assert(readme.includes("docs/roadmap.md"), "README.md must link docs/roadmap.md.");',
    'assert(readme.includes("docs/architecture_tracks.md"), "README.md must link docs/architecture_tracks.md.");',
    'for (const token of ["terrain/material track", "fluid-like field track", "morphology/entity editor track", "controller/brain track", "render/performance track", "worker/WebGPU track"]) assert(roadmap.includes(token), "roadmap missing track token: " + token);',
    'assert(roadmap.includes("m32 shipped: terrain/material typed-array layer"), "roadmap must mention m32 terrain shipment.");',
    'assert(architectureTracks.includes("src/sim/terrain.ts"), "architecture tracks must mention terrain module.");',
    'assert(architectureTracks.includes("renderer must not own authoritative simulation state"), "architecture tracks must preserve render boundary.");',
    'assert(terrain.includes("sampleTerrainAtPosition"), "terrain module must expose sampleTerrainAtPosition.");',
    'assert(integrationM32.includes("terrain/material layer foundation"), "integration_m32 must describe terrain/material layer foundation.");',
    'assert(packageJson.scripts["test:roadmap-status"] === "node scripts/test-roadmap-status.mjs", "package.json must expose test:roadmap-status.");',
    'assert(packageJson.scripts.test.includes("test:roadmap-status"), "npm run test must include test:roadmap-status.");',
    'console.log("roadmap status tests passed");',
    ''
  ].join("\n");
}

function sanity() {
  for (const file of ["src/sim/terrain.ts", "scripts/test-terrain.mjs", "scripts/bench-terrain.mjs", "docs/integration_m32.md"]) {
    assert(existsSync(filePath(file)), "missing generated file: " + file);
  }
  assert(read("package.json").includes("0.1.0-milestone.32"), "package version sanity failed");
  assert(read("src/shared/appVersion.ts").includes("m32"), "appVersion sanity failed");
  assert(read("src/sim/terrain.ts").includes("TERRAIN_LAYER_VERSION"), "terrain token sanity failed");
}

function read(relativePath) { return readFileSync(filePath(relativePath), "utf8"); }
function write(relativePath, text) { const target = filePath(relativePath); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, text, "utf8"); }
function remove(relativePath) { const target = filePath(relativePath); if (existsSync(target)) rmSync(target, { force: true, recursive: true }); }
function filePath(relativePath) { return join(root, relativePath); }
function assert(condition, message) { if (!condition) throw new Error(message); }

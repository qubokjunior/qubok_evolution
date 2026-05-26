import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const expectedBranch = "m34-terrain-debug-render-layer";
const currentBranch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
if (currentBranch !== expectedBranch) throw new Error(`Expected ${expectedBranch}, got ${currentBranch}`);

patchDemoSimulation();
patchPixiRenderer();
patchDebugOverlay();
writeDocsAndStatusTests();
patchDemoIntegrationTest();

console.log("m34 patch v3 applied");

function patchDemoSimulation() {
  let text = read("src/sim/demoSimulation.ts");
  text = ensureAfter(text, 'import { createWorldState, type WorldState } from "./world";', [
    'import { createTerrainLayer, setTerrainRectMaterial, type TerrainLayer } from "./terrain";',
    'import { makeTerrainRenderSnapshot, type TerrainRenderSnapshot } from "./terrainRenderSnapshot";'
  ].join("\n"), "demo terrain imports");
  text = replaceOnce(text, '  readonly obstacleMaskSnapshot: ObstacleMaskRenderSnapshot;\n  readonly snapshotStats: RenderSnapshotStats;', '  readonly obstacleMaskSnapshot: ObstacleMaskRenderSnapshot;\n  readonly terrainRenderSnapshot: TerrainRenderSnapshot;\n  readonly snapshotStats: RenderSnapshotStats;', "demo step terrain snapshot");
  text = replaceOnce(text, '  readonly obstacleMask: ObstacleMask;\n  readonly initialAgentSpawnStats: SpawnValidationStats;', '  readonly obstacleMask: ObstacleMask;\n  readonly terrain: TerrainLayer;\n  readonly initialAgentSpawnStats: SpawnValidationStats;', "demo handle terrain");
  text = ensureAfter(text, 'const DEFAULT_OBSTACLE_CELL_SIZE = 64;', 'const DEFAULT_TERRAIN_CELL_SIZE = 64;', "terrain cell default");
  text = replaceOnce(text, '  const obstacleMask = createObstacleMask({\n    worldWidth,\n    worldHeight,\n    cellSize: config.obstacleCellSize ?? DEFAULT_OBSTACLE_CELL_SIZE\n  });', '  const obstacleMask = createObstacleMask({\n    worldWidth,\n    worldHeight,\n    cellSize: config.obstacleCellSize ?? DEFAULT_OBSTACLE_CELL_SIZE\n  });\n\n  const terrain = createTerrainLayer({\n    worldWidth,\n    worldHeight,\n    cellSize: DEFAULT_TERRAIN_CELL_SIZE\n  });', "create terrain");
  text = ensureAfter(text, 'seedDemoObstacleMask(obstacleMask);', '  seedDemoTerrain(terrain);', "seed terrain");
  text = replaceOnce(text, '    const snapshot = makeRenderSnapshot(world);\n    const snapshotStats = analyzeRenderSnapshot(snapshot);', '    const snapshot = makeRenderSnapshot(world);\n    const terrainRenderSnapshot = makeTerrainRenderSnapshot(terrain);\n    const snapshotStats = analyzeRenderSnapshot(snapshot);', "terrain snapshot in step");
  text = replaceOnce(text, '      snapshot,\n      obstacleMaskSnapshot,\n      snapshotStats,', '      snapshot,\n      obstacleMaskSnapshot,\n      terrainRenderSnapshot,\n      snapshotStats,', "return terrain snapshot");
  text = replaceOnce(text, '    resources,\n    obstacleMask,\n    initialAgentSpawnStats,', '    resources,\n    obstacleMask,\n    terrain,\n    initialAgentSpawnStats,', "return terrain handle");
  if (!text.includes("function seedDemoTerrain(")) {
    text += `\nfunction seedDemoTerrain(terrain: TerrainLayer): void {\n  setTerrainRectMaterial(terrain, 0, 0, terrain.worldWidth * 0.32, terrain.worldHeight, 1);\n  setTerrainRectMaterial(terrain, terrain.worldWidth * 0.35, terrain.worldHeight * 0.18, terrain.worldWidth * 0.66, terrain.worldHeight * 0.46, 2);\n  setTerrainRectMaterial(terrain, terrain.worldWidth * 0.58, terrain.worldHeight * 0.58, terrain.worldWidth, terrain.worldHeight, 3);\n}\n`;
  }
  write("src/sim/demoSimulation.ts", text);
}

function patchPixiRenderer() {
  let text = read("src/render/pixiRenderer.ts");
  text = ensureAfter(text, 'import type { ObstacleMaskRenderSnapshot } from "../sim/obstacleRenderSnapshot";', 'import type { TerrainRenderSnapshot } from "../sim/terrainRenderSnapshot";', "pixi terrain import");
  text = replaceOnce(text, '  readonly obstacleMaskSnapshot: ObstacleMaskRenderSnapshot;\n  readonly snapshotStats: RenderSnapshotStats;', '  readonly obstacleMaskSnapshot: ObstacleMaskRenderSnapshot;\n  readonly terrainRenderSnapshot: TerrainRenderSnapshot;\n  readonly snapshotStats: RenderSnapshotStats;', "pixi frame terrain snapshot");
  text = replaceOnce(text, '  const obstacleLayer = new Graphics();\n  const agentLayer = new Container();\n\n  world.addChild(backgroundLayer, gridLayer, obstacleLayer, agentLayer);', '  const obstacleLayer = new Graphics();\n  const terrainLayer = new Graphics();\n  const agentLayer = new Container();\n\n  world.addChild(backgroundLayer, gridLayer, terrainLayer, obstacleLayer, agentLayer);', "terrain layer creation");
  text = ensureAfter(text, '    metrics.record("obstacleRenderCellCount", frame.obstacleMaskSnapshot.occupiedCellCount);', '    metrics.record("terrainRenderCellCount", frame.terrainRenderSnapshot.sampleCellCount);\n    metrics.record("terrainRenderTruncated", frame.terrainRenderSnapshot.truncated ? 1 : 0);', "terrain metric records");
  text = replaceOnce(text, '    const endObstacleRenderScope = metrics.beginScope("obstacleRenderMs");\n    renderObstacleMask(obstacleLayer, frame.obstacleMaskSnapshot, options.host.clientWidth, options.host.clientHeight);\n    const obstacleRenderMs = endObstacleRenderScope();\n\n    renderSnapshot(agentLayer, glyphs, frame.snapshot, options.host.clientWidth, options.host.clientHeight);', '    const endTerrainRenderScope = metrics.beginScope("terrainRenderMs");\n    renderTerrainLayer(terrainLayer, frame.terrainRenderSnapshot, options.host.clientWidth, options.host.clientHeight);\n    const terrainRenderMs = endTerrainRenderScope();\n\n    const endObstacleRenderScope = metrics.beginScope("obstacleRenderMs");\n    renderObstacleMask(obstacleLayer, frame.obstacleMaskSnapshot, options.host.clientWidth, options.host.clientHeight);\n    const obstacleRenderMs = endObstacleRenderScope();\n\n    renderSnapshot(agentLayer, glyphs, frame.snapshot, options.host.clientWidth, options.host.clientHeight);', "terrain render scope");
  text = replaceOnce(text, '        obstacleRenderMs: snapshot.values.obstacleRenderMs || obstacleRenderMs,\n        obstacleRenderCellCount: snapshot.values.obstacleRenderCellCount,', '        obstacleRenderMs: snapshot.values.obstacleRenderMs || obstacleRenderMs,\n        obstacleRenderCellCount: snapshot.values.obstacleRenderCellCount,\n        terrainRenderMs: snapshot.values.terrainRenderMs || terrainRenderMs,\n        terrainRenderCellCount: snapshot.values.terrainRenderCellCount,\n        terrainRenderTruncated: snapshot.values.terrainRenderTruncated,', "overlay terrain values");
  if (!text.includes("function renderTerrainLayer(")) {
    const terrainFunctions = `\nfunction renderTerrainLayer(\n  layer: Graphics,\n  snapshot: TerrainRenderSnapshot,\n  viewportWidth: number,\n  viewportHeight: number\n): void {\n  layer.clear();\n\n  if (snapshot.sampleCellCount <= 0) {\n    return;\n  }\n\n  const scaleX = viewportWidth / snapshot.worldWidth;\n  const scaleY = viewportHeight / snapshot.worldHeight;\n  const scale = Math.min(scaleX, scaleY);\n  const offsetX = (viewportWidth - snapshot.worldWidth * scale) * 0.5;\n  const offsetY = (viewportHeight - snapshot.worldHeight * scale) * 0.5;\n  const cellSizePx = Math.max(1, snapshot.cellSize * scale);\n\n  for (let index = 0; index < snapshot.sampleCellCount; index += 1) {\n    const cellId = snapshot.cellIds[index];\n    const cellX = cellId % snapshot.columns;\n    const cellY = Math.floor(cellId / snapshot.columns);\n    const materialId = snapshot.materialIds[index];\n    const x = offsetX + cellX * snapshot.cellSize * scale;\n    const y = offsetY + cellY * snapshot.cellSize * scale;\n    const palette = getTerrainMaterialColor(materialId);\n    layer.rect(x, y, cellSizePx, cellSizePx).fill({ color: palette.color, alpha: palette.alpha });\n  }\n}\n\nfunction getTerrainMaterialColor(materialId: number): { readonly color: number; readonly alpha: number } {\n  switch (materialId % 4) {\n    case 1:\n      return { color: 0x5c4a2f, alpha: 0.22 };\n    case 2:\n      return { color: 0x244d63, alpha: 0.26 };\n    case 3:\n      return { color: 0x535a61, alpha: 0.2 };\n    default:\n      return { color: 0x243a2d, alpha: 0.18 };\n  }\n}\n`;
    text = replaceOnce(text, '\nfunction renderObstacleMask(', terrainFunctions + '\nfunction renderObstacleMask(', "terrain render function");
  }
  write("src/render/pixiRenderer.ts", text);
}

function patchDebugOverlay() {
  let text = read("src/render/debugOverlay.ts");
  text = replaceOnce(text, '  readonly obstacleRenderCellCount: number;\n  readonly deathsThisStep: number;', '  readonly obstacleRenderCellCount: number;\n  readonly terrainRenderMs: number;\n  readonly terrainRenderCellCount: number;\n  readonly terrainRenderTruncated: number;\n  readonly deathsThisStep: number;', "overlay type terrain");
  text = replaceOnce(text, '    obstacleRenderMs: createValueRow(root, "obs render"),\n    obstacleRenderCellCount: createValueRow(root, "obs cells"),', '    obstacleRenderMs: createValueRow(root, "obs render"),\n    obstacleRenderCellCount: createValueRow(root, "obs cells"),\n    terrainRenderMs: createValueRow(root, "terrain render"),\n    terrainRenderCellCount: createValueRow(root, "terrain cells"),\n    terrainRenderTruncated: createValueRow(root, "terrain trunc"),', "overlay rows terrain");
  text = replaceOnce(text, '    rows.obstacleRenderMs.textContent = formatMs(snapshot.obstacleRenderMs);\n    rows.obstacleRenderCellCount.textContent = formatInt(snapshot.obstacleRenderCellCount);', '    rows.obstacleRenderMs.textContent = formatMs(snapshot.obstacleRenderMs);\n    rows.obstacleRenderCellCount.textContent = formatInt(snapshot.obstacleRenderCellCount);\n    rows.terrainRenderMs.textContent = formatMs(snapshot.terrainRenderMs);\n    rows.terrainRenderCellCount.textContent = formatInt(snapshot.terrainRenderCellCount);\n    rows.terrainRenderTruncated.textContent = formatInt(snapshot.terrainRenderTruncated);', "overlay update terrain");
  write("src/render/debugOverlay.ts", text);
}

function writeDocsAndStatusTests() {
  write("docs/integration_m34.md", [
    "# m34 integration: terrain debug render layer",
    "",
    "Milestone 34 adds a Pixi terrain debug render layer that consumes the m33 terrain render snapshot boundary.",
    "",
    "## Implementation",
    "",
    "- `demoSimulation.ts` owns a deterministic demo terrain layer and emits `terrainRenderSnapshot` per frame.",
    "- `pixiRenderer.ts` draws material cells behind obstacles and agents using `renderTerrainLayer()`.",
    "- `debugOverlay.ts` exposes terrain render timing, cell count, and truncation state.",
    "- `perfMetrics.ts` includes terrain render metrics.",
    "- `scripts/test-terrain-debug-render-layer.mjs` guards the render-layer integration tokens.",
    "",
    "## Acceptance",
    "",
    "- `npm run test:terrain-debug-render-layer`",
    "- `npm run test`",
    "- `npm run build`",
    "",
    "## Explicitly not changed",
    "",
    "- no terrain editor",
    "- no terrain movement integration",
    "- no resource distribution integration",
    "- no sensor terrain integration",
    "- no fluid field",
    "- no controller/brain work"
  ].join("\n") + "\n");

  replaceFileText("README.md", [
    ["Current status: m33 / 0.1.0-milestone.33.", "Current status: m34 / 0.1.0-milestone.34."],
    ["- terrain render snapshot foundation for future terrain debug visualization.", "- terrain render snapshot foundation for future terrain debug visualization;\n- terrain Pixi debug render layer with overlay metrics."],
    ["npm run test:terrain-render-snapshot\n", "npm run test:terrain-render-snapshot\nnpm run test:terrain-debug-render-layer\n"],
    ["`docs/milestones.md` — compact milestone index through m33.", "`docs/milestones.md` — compact milestone index through m34."],
    ["`docs/integration_m33.md` — current terrain render snapshot milestone.", "`docs/integration_m34.md` — current terrain debug render layer milestone."]
  ]);
  replaceFileText("docs/milestones.md", [
    ["Compact milestone index through m33.", "Compact milestone index through m34."],
    ["| m33 | Terrain render snapshot foundation for future debug visualization. | complete |", "| m33 | Terrain render snapshot foundation for future debug visualization. | complete |\n| m34 | Terrain Pixi debug render layer with overlay metrics. | complete |"],
    ["- m34: terrain debug render layer in Pixi using the m33 snapshot.", "- m35: terrain query integration into movement/resource/sensor systems."]
  ]);
  replaceFileText("docs/roadmap.md", [
    ["Current status: m33 / 0.1.0-milestone.33.", "Current status: m34 / 0.1.0-milestone.34."],
    ["m33 shipped: terrain render snapshot foundation for future terrain debug visualization.", "m33 shipped: terrain render snapshot foundation for future terrain debug visualization.\n\nm34 shipped: terrain Pixi debug render layer with overlay metrics."],
    ["- debug snapshot for terrain fields.", "- debug snapshot and render layer for terrain fields."]
  ]);
  replaceFileText("docs/architecture_tracks.md", [
    ["Current status: m33.", "Current status: m34."],
    ["terrain render snapshots including src/sim/terrainRenderSnapshot.ts", "terrain render snapshots including src/sim/terrainRenderSnapshot.ts and terrain debug rendering in src/render/pixiRenderer.ts"]
  ]);
  write("scripts/test-repo-status.mjs", repoStatusText());
  write("scripts/test-roadmap-status.mjs", roadmapStatusText());
}

function patchDemoIntegrationTest() {
  let text = read("scripts/test-demo-integration.mjs");
  text = text.replaceAll("0.1.0-milestone.33", "0.1.0-milestone.34");
  text = text.replaceAll("milestone.33", "milestone.34");
  text = text.replaceAll('PROJECT_MILESTONE_LABEL = "m33"', 'PROJECT_MILESTONE_LABEL = "m34"');
  text = text.replaceAll("m33 overlay label", "m34 overlay label");
  text = text.replaceAll("| m33 |", "| m34 |");
  text = text.replaceAll("bench-terrain-render-snapshot:m34", "bench-terrain-render-snapshot:m33");
  if (!text.includes('const terrainDebugRenderLayerTest = readText("scripts/test-terrain-debug-render-layer.mjs");')) {
    text = text.replace('const terrainRenderSnapshotBench = readText("scripts/bench-terrain-render-snapshot.mjs");', 'const terrainRenderSnapshotBench = readText("scripts/bench-terrain-render-snapshot.mjs");\nconst terrainDebugRenderLayerTest = readText("scripts/test-terrain-debug-render-layer.mjs");');
  }
  const anchor = 'assert(terrainRenderSnapshotBench.includes("bench-terrain-render-snapshot:m33"), "terrain render snapshot bench must expose m33 bench token.");';
  const block = [
    'assert(packageJson.scripts["test:terrain-debug-render-layer"] === "node scripts/test-terrain-debug-render-layer.mjs", "package.json must expose test:terrain-debug-render-layer.");',
    'assert(packageJson.scripts.test.includes("test:terrain-debug-render-layer"), "npm run test must include terrain debug render layer test.");',
    'assert(demoSimulation.includes("terrainRenderSnapshot"), "demoSimulation must emit terrainRenderSnapshot.");',
    'assert(pixiRenderer.includes("renderTerrainLayer"), "pixiRenderer must expose terrain render layer function.");',
    'assert(pixiRenderer.includes("terrainLayer"), "pixiRenderer must own terrainLayer.");',
    'assert(debugOverlay.includes("terrain render"), "debugOverlay must expose terrain render label.");',
    'assert(perfMetrics.includes("terrainRenderTruncated"), "perf metrics must expose terrainRenderTruncated.");',
    'assert(terrainDebugRenderLayerTest.includes("terrain debug render layer tests passed"), "terrain debug render layer test must expose pass token.");'
  ].join("\n");
  if (!text.includes("pixiRenderer must expose terrain render layer function")) {
    text = replaceOnce(text, anchor, anchor + "\n" + block, "demo integration terrain debug block");
  }
  write("scripts/test-demo-integration.mjs", text);
}

function repoStatusText() {
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
    'const integrationM34 = readText("docs/integration_m34.md");',
    'assert(packageJson.version === "0.1.0-milestone.34", "package.json must expose 0.1.0-milestone.34.");',
    'assert(appVersion.includes("PROJECT_VERSION = \\\"0.1.0-milestone.34\\\""), "appVersion must expose milestone.34.");',
    'assert(appVersion.includes("PROJECT_MILESTONE = 34"), "appVersion must expose milestone number 34.");',
    'assert(appVersion.includes("PROJECT_MILESTONE_LABEL = \\\"m34\\\""), "appVersion must expose m34 label.");',
    'assert(readme.includes("0.1.0-milestone.34"), "README.md must expose current milestone version.");',
    'assert(readme.includes("Current status: m34"), "README.md must expose current status m34.");',
    'for (const marker of ["| m32 |", "| m33 |", "| m34 |"]) assert(milestones.includes(marker), "docs/milestones.md missing marker: " + marker);',
    'assert(integrationM34.includes("terrain debug render layer"), "integration_m34 must describe terrain debug render layer.");',
    'assert(packageJson.scripts["test:repo-status"] === "node scripts/test-repo-status.mjs", "package.json must expose test:repo-status.");',
    'assert(packageJson.scripts.test.includes("test:repo-status"), "npm run test must include test:repo-status.");',
    'console.log("repo status tests passed");',
    ''
  ].join("\n");
}

function roadmapStatusText() {
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
    'const integrationM34 = readText("docs/integration_m34.md");',
    'const pixiRenderer = readText("src/render/pixiRenderer.ts");',
    'assert(packageJson.version === "0.1.0-milestone.34", "package.json must expose m34 version.");',
    'assert(appVersion.includes("PROJECT_VERSION = \\\"0.1.0-milestone.34\\\""), "appVersion must expose milestone.34.");',
    'assert(appVersion.includes("PROJECT_MILESTONE_LABEL = \\\"m34\\\""), "appVersion must expose m34 label.");',
    'assert(readme.includes("docs/roadmap.md"), "README.md must link docs/roadmap.md.");',
    'assert(roadmap.includes("m34 shipped: terrain Pixi debug render layer"), "roadmap must mention m34 terrain debug render layer shipment.");',
    'assert(architectureTracks.includes("src/render/pixiRenderer.ts"), "architecture tracks must mention Pixi terrain debug rendering.");',
    'assert(pixiRenderer.includes("renderTerrainLayer"), "pixiRenderer must expose terrain layer render function.");',
    'assert(integrationM34.includes("terrain debug render layer"), "integration_m34 must describe terrain debug render layer.");',
    'assert(packageJson.scripts.test.includes("test:roadmap-status"), "npm run test must include test:roadmap-status.");',
    'console.log("roadmap status tests passed");',
    ''
  ].join("\n");
}

function ensureAfter(text, anchor, insertion, label) {
  if (text.includes(insertion)) return text;
  if (!text.includes(anchor)) throw new Error("Missing anchor: " + label);
  return text.replace(anchor, anchor + "\n" + insertion);
}
function replaceFileText(file, replacements) {
  let text = read(file);
  for (const [from, to] of replacements) text = text.replace(from, to);
  write(file, text);
}
function read(file) { return readFileSync(join(root, file), "utf8").replaceAll("\r\n", "\n"); }
function write(file, text) { const target = join(root, file); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, text, "utf8"); }
function replaceOnce(text, search, replacement, label) { if (text.includes(replacement)) return text; if (!text.includes(search)) throw new Error("Missing anchor: " + label); return text.replace(search, replacement); }

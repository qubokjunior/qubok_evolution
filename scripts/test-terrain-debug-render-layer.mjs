import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = (relativePath) => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const appVersion = readText("src/shared/appVersion.ts");
const demoSimulation = readText("src/sim/demoSimulation.ts");
const pixiRenderer = readText("src/render/pixiRenderer.ts");
const debugOverlay = readText("src/render/debugOverlay.ts");
const perfMetrics = readText("src/shared/perfMetrics.ts");
const terrainRenderSnapshot = readText("src/sim/terrainRenderSnapshot.ts");
const integrationM34 = readText("docs/integration_m34.md");

assert(packageJson.version === "0.1.0-milestone.39", "package.json must expose current m39 version.");
assert(appVersion.includes('PROJECT_VERSION = "0.1.0-milestone.39"'), "appVersion must expose current milestone.39.");
assert(appVersion.includes('PROJECT_MILESTONE = 39'), "appVersion must expose current milestone number 39.");
assert(appVersion.includes('PROJECT_MILESTONE_LABEL = "m39"'), "appVersion must expose current m39 label.");
assert(packageJson.scripts["test:terrain-debug-render-layer"] === "node scripts/test-terrain-debug-render-layer.mjs", "package.json must expose test:terrain-debug-render-layer.");
assert(packageJson.scripts.test.includes("test:terrain-debug-render-layer"), "npm run test must include terrain debug render layer test.");

for (const token of ["terrainRenderSnapshot", "makeTerrainRenderSnapshot", "createTerrainLayer", "seedDemoTerrain", "terrain: TerrainLayer"]) {
  assert(demoSimulation.includes(token), "demoSimulation missing terrain token: " + token);
}

for (const token of ["TerrainRenderSnapshot", "terrainLayer", "renderTerrainLayer", "terrainRenderMs", "terrainRenderCellCount", "terrainRenderTruncated"]) {
  assert(pixiRenderer.includes(token), "pixiRenderer missing terrain render token: " + token);
}

for (const token of ["terrainRenderMs", "terrainRenderCellCount"]) {
  assert(perfMetrics.includes(token), "perfMetrics missing terrain metric: " + token);
  assert(pixiRenderer.includes(token), "pixiRenderer missing terrain metric: " + token);
}

for (const overlayToken of ["terrain render", "terrain cells", "terrain trunc"]) {
  assert(debugOverlay.includes(overlayToken), "debugOverlay missing terrain overlay label: " + overlayToken);
}

for (const snapshotToken of ["TERRAIN_RENDER_SNAPSHOT_VERSION", "makeTerrainRenderSnapshot", "sampleCellCount", "truncated"]) {
  assert(terrainRenderSnapshot.includes(snapshotToken), "terrain render snapshot missing token: " + snapshotToken);
}

assert(integrationM34.includes("terrain debug render layer"), "integration_m34 must document terrain debug render layer.");
assert(integrationM34.includes("no terrain editor"), "integration_m34 must preserve no-editor scope.");
console.log("terrain debug render layer tests passed");

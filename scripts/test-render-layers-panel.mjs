import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = relativePath => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const renderDebugConfig = readText("src/render/renderDebugConfig.ts");
const app = readText("src/ui/App.ts");
const renderLayersPanel = readText("src/ui/renderLayersPanel.ts");
const visualPanel = readText("src/ui/fieldVisualDebugPanel.ts");
const docs = readText("docs/integration_m45.md");

for (const token of ["showGrid", "showTerrainLayer", "showObstacleLayer", "showFieldVectorLayer", "showAgents", "showAgentFieldInfluenceLayer"]) {
  assert(renderDebugConfig.includes(token), "renderDebugConfig missing layer key: " + token);
  assert(renderLayersPanel.includes(token), "renderLayersPanel missing layer key: " + token);
}

for (const token of ["createRenderLayersPanel", "renderLayersPanel.destroy()", "\"8\": \"showAgentFieldInfluenceLayer\"", "qubok-render-debug-config-change"]) {
  assert(app.includes(token), "App missing render layers token: " + token);
}

for (const token of ["render layers", "visibility toggles", "keyboard 1–5, 8", "agent field influence", "createBooleanControl", "createControlSubsection", "createControlFooter", "updateRenderDebugConfig"]) {
  assert(renderLayersPanel.includes(token), "renderLayersPanel missing token: " + token);
}

assert(visualPanel.includes("qubok-render-debug-config-change"), "fieldVisualDebugPanel must sync with render layer changes.");
assert(renderDebugConfig.includes("showAgentFieldInfluenceLayer\">"), "toggleRenderDebugLayer must include showAgentFieldInfluenceLayer.");
assert(docs.includes("M45-J1"), "integration_m45 must document M45-J1.");
assert(packageJson.scripts["test:render-layers-panel"] === "node scripts/test-render-layers-panel.mjs", "package.json must expose test:render-layers-panel.");
assert(packageJson.scripts.test.includes("test:render-layers-panel"), "npm run test must include test:render-layers-panel.");

console.log("render layers panel tests passed");

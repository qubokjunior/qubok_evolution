import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = relativePath => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const renderDebugConfig = readText("src/render/renderDebugConfig.ts");
const pixiRenderer = readText("src/render/pixiRenderer.ts");
const app = readText("src/ui/App.ts");
const panel = readText("src/ui/fieldVisualDebugPanel.ts");
const styles = readText("src/styles.css");
const docs = readText("docs/integration_m45.md");

for (const token of ["showAgentFieldInfluenceLayer", "agentFieldInfluenceAlpha", "agentFieldInfluenceScale", "agentFieldInfluenceMaxAgents", "agentFieldInfluenceMinMagnitude"]) assert(renderDebugConfig.includes(token), "renderDebugConfig missing visual control token: " + token);
for (const token of ["config.agentFieldInfluenceAlpha", "config.agentFieldInfluenceScale", "config.agentFieldInfluenceMaxAgents", "config.agentFieldInfluenceMinMagnitude", "showAgentFieldInfluenceLayer && renderDebugConfig.showAgents"]) assert(pixiRenderer.includes(token), "pixiRenderer missing visual control token: " + token);
for (const token of ["createFieldVisualDebugPanel", "fieldVisualDebugPanel.destroy()"]) assert(app.includes(token), "App missing visual debug panel token: " + token);
for (const token of ["agent field debug", "show influence", "length scale", "max agents", "min magnitude", "range.type = \"range\"", "number.type = \"number\"", "updateRenderDebugConfig"]) assert(panel.includes(token), "fieldVisualDebugPanel missing token: " + token);
assert(styles.includes(".qubok_evolve-control-panel--visual-debug"), "styles missing visual debug panel modifier.");
assert(docs.includes("M45-F"), "integration_m45 must document M45-F.");
assert(packageJson.scripts["test:agent-field-visual-controls"] === "node scripts/test-agent-field-visual-controls.mjs", "package.json must expose test:agent-field-visual-controls.");
assert(packageJson.scripts.test.includes("test:agent-field-visual-controls"), "npm run test must include test:agent-field-visual-controls.");
console.log("agent field visual control tests passed");

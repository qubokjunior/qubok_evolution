import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = relativePath => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const renderDebugConfig = readText("src/render/renderDebugConfig.ts");
const app = readText("src/ui/App.ts");
const panel = readText("src/ui/fieldVectorDebugPanel.ts");
const docs = readText("docs/integration_m45.md");

for (const token of ["fieldVectorAlpha", "fieldVectorScale", "fieldVectorStride", "fieldVectorMinMagnitude"]) {
  assert(renderDebugConfig.includes(token), "renderDebugConfig missing field vector config token: " + token);
  assert(panel.includes(token), "fieldVectorDebugPanel missing field vector token: " + token);
}

for (const token of ["createFieldVectorDebugPanel", "fieldVectorDebugPanel.destroy()"]) {
  assert(app.includes(token), "App missing field vector panel token: " + token);
}

for (const token of ["field vectors", "vector render parameters", "render shape", "sampling", "layer toggle: 3", "createNumericControl", "createControlSubsection", "createControlFooter", "updateRenderDebugConfig", "qubok-render-debug-config-change"]) {
  assert(panel.includes(token), "fieldVectorDebugPanel missing token: " + token);
}

assert(docs.includes("M45-J2"), "integration_m45 must document M45-J2.");
assert(packageJson.scripts["test:field-vector-debug-panel"] === "node scripts/test-field-vector-debug-panel.mjs", "package.json must expose test:field-vector-debug-panel.");
assert(packageJson.scripts.test.includes("test:field-vector-debug-panel"), "npm run test must include test:field-vector-debug-panel.");

console.log("field vector debug panel tests passed");

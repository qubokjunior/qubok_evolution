import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = relativePath => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const primitives = readText("src/ui/controlPanelPrimitives.ts");
const dampingPanel = readText("src/ui/fieldDampingPanel.ts");
const visualPanel = readText("src/ui/fieldVisualDebugPanel.ts");
const docs = readText("docs/integration_m45.md");

for (const token of ["createCollapsibleControlPanel", "createBooleanControl", "createNumericControl", "createControlSection", "createControlFooter", "qubok_evolve-control-body", "range.type = \"range\"", "number.type = \"number\"", "input.type = \"checkbox\"", "normalizeValue", "formatValue"]) {
  assert(primitives.includes(token), "controlPanelPrimitives missing token: " + token);
}

for (const token of ["createCollapsibleControlPanel", "createBooleanControl", "createNumericControl", "createControlFooter"]) {
  assert(dampingPanel.includes(token), "fieldDampingPanel must use shared primitive: " + token);
  assert(visualPanel.includes(token), "fieldVisualDebugPanel must use shared primitive: " + token);
}

assert(!dampingPanel.includes("function createNumericControl"), "fieldDampingPanel should not define local numeric controls.");
assert(!visualPanel.includes("function createNumericControl"), "fieldVisualDebugPanel should not define local numeric controls.");
assert(docs.includes("M45-H1"), "integration_m45 must document M45-H1.");
assert(packageJson.scripts["test:control-panel-primitives"] === "node scripts/test-control-panel-primitives.mjs", "package.json must expose test:control-panel-primitives.");
assert(packageJson.scripts.test.includes("test:control-panel-primitives"), "npm run test must include test:control-panel-primitives.");

console.log("control panel primitive tests passed");

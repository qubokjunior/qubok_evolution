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
const styles = readText("src/styles.css");
const docs = readText("docs/integration_m45.md");

for (const token of ["qubok_evolve-control-body", "dataset.collapsed", "aria-expanded", "togglePanelCollapsed", "body.hidden", "keydown"]) {
  assert(primitives.includes(token), "shared primitives missing collapse token: " + token);
}

for (const token of ["createCollapsibleControlPanel", "panel.body.append", "destroy: panel.destroy"]) {
  assert(dampingPanel.includes(token), "fieldDampingPanel missing shared collapse token: " + token);
  assert(visualPanel.includes(token), "fieldVisualDebugPanel missing shared collapse token: " + token);
}

for (const token of [".qubok_evolve-control-title::before", "content: \"▾\"", "content: \"▸\"", ".qubok_evolve-control-body[hidden]"]) {
  assert(styles.includes(token), "styles missing editable panel collapse CSS: " + token);
}

assert(docs.includes("M45-G2"), "integration_m45 must document M45-G2.");
assert(packageJson.scripts["test:editable-panel-collapse"] === "node scripts/test-editable-panel-collapse.mjs", "package.json must expose test:editable-panel-collapse.");
assert(packageJson.scripts.test.includes("test:editable-panel-collapse"), "npm run test must include test:editable-panel-collapse.");

console.log("editable panel collapse tests passed");

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

for (const token of ["createControlSubsection", "qubok_evolve-control-subsection-title"]) {
  assert(primitives.includes(token), "controlPanelPrimitives missing subsection token: " + token);
}

for (const token of ["toggles", "strength", "sampling caps", "strengthControls", "samplingCapControls"]) {
  assert(dampingPanel.includes(token), "fieldDampingPanel missing module token: " + token);
}

for (const token of ["visibility", "visual shape", "sampling", "visualShapeControls", "samplingControls"]) {
  assert(visualPanel.includes(token), "fieldVisualDebugPanel missing module token: " + token);
}

assert(styles.includes(".qubok_evolve-control-subsection-title"), "styles missing subsection title CSS.");
assert(docs.includes("M45-H2"), "integration_m45 must document M45-H2.");
assert(packageJson.scripts["test:editable-panel-modules"] === "node scripts/test-editable-panel-modules.mjs", "package.json must expose test:editable-panel-modules.");
assert(packageJson.scripts.test.includes("test:editable-panel-modules"), "npm run test must include test:editable-panel-modules.");

console.log("editable panel module tests passed");

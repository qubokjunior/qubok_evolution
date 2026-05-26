import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = relativePath => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const app = readText("src/ui/App.ts");
const panel = readText("src/ui/debugLayoutPanel.ts");
const styles = readText("src/styles.css");
const docs = readText("docs/integration_m45.md");

for (const token of ["createDebugLayoutPanel", "debugLayoutPanel.destroy()"]) {
  assert(app.includes(token), "App missing debug layout panel token: " + token);
}

for (const token of ["clearDebugLayoutState", "LAYOUT_STATE_KEYS", "LAYOUT_STATE_PREFIXES", "qubok_evolve.perf_overlay_width", "qubok_evolve.control_panel_width.", "qubok_evolve.control_panel_collapsed.", "qubok_evolve.control_subsection_collapsed.", "localStorage.removeItem", "window.location.reload"]) {
  assert(panel.includes(token), "debugLayoutPanel missing token: " + token);
}

for (const token of [".qubok_evolve-control-stack", ".qubok_evolve-control-button--wide", ".qubok_evolve-control-note"]) {
  assert(styles.includes(token), "styles missing debug layout panel CSS token: " + token);
}

assert(docs.includes("M45-H7"), "integration_m45 must document M45-H7.");
assert(packageJson.scripts["test:debug-layout-panel"] === "node scripts/test-debug-layout-panel.mjs", "package.json must expose test:debug-layout-panel.");
assert(packageJson.scripts.test.includes("test:debug-layout-panel"), "npm run test must include test:debug-layout-panel.");

console.log("debug layout panel tests passed");

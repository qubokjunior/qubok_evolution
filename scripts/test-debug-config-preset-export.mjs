import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = relativePath => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const preset = readText("src/ui/debugConfigPreset.ts");
const panel = readText("src/ui/debugLayoutPanel.ts");
const docs = readText("docs/integration_m45.md");

for (const token of ["DEBUG_CONFIG_PRESET_VERSION", "makeDebugConfigPreset", "serializeDebugConfigPreset", "RENDER_DEBUG_CONFIG_STORAGE_KEY", "FIELD_DAMPING_CONFIG_STORAGE_KEY", "qubok_evolve.control_panel_width.", "qubok_evolve.control_panel_collapsed.", "qubok_evolve.control_subsection_collapsed.", "JSON.stringify"]) {
  assert(preset.includes(token), "debugConfigPreset missing token: " + token);
}

for (const token of ["copy debug preset", "navigator.clipboard.writeText", "serializeDebugConfigPreset", "copied debug preset", "console.info"]) {
  assert(panel.includes(token), "debugLayoutPanel missing preset export token: " + token);
}

assert(docs.includes("M45-K1"), "integration_m45 must document M45-K1.");
assert(packageJson.scripts["test:debug-config-preset-export"] === "node scripts/test-debug-config-preset-export.mjs", "package.json must expose test:debug-config-preset-export.");
assert(packageJson.scripts.test.includes("test:debug-config-preset-export"), "npm run test must include test:debug-config-preset-export.");

console.log("debug config preset export tests passed");

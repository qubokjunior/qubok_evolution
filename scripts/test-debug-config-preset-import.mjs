import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = relativePath => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const preset = readText("src/ui/debugConfigPreset.ts");
const panel = readText("src/ui/debugLayoutPanel.ts");
const styles = readText("src/styles.css");
const docs = readText("docs/integration_m45.md");

for (const token of ["applyDebugConfigPresetText", "DebugConfigPresetImportResult", "isPreset", "isAllowedLayoutKey", "writeOptionalStoredJson", "JSON.parse", "localStorage.setItem"]) {
  assert(preset.includes(token), "debugConfigPreset missing import token: " + token);
}

for (const token of ["paste debug preset JSON", "import preset + reload", "applyDebugConfigPresetText", "invalid debug preset JSON", "window.location.reload"]) {
  assert(panel.includes(token), "debugLayoutPanel missing import UI token: " + token);
}

assert(styles.includes(".qubok_evolve-control-textarea"), "styles missing preset textarea CSS.");
assert(docs.includes("M45-K2"), "integration_m45 must document M45-K2.");
assert(packageJson.scripts["test:debug-config-preset-import"] === "node scripts/test-debug-config-preset-import.mjs", "package.json must expose test:debug-config-preset-import.");
assert(packageJson.scripts.test.includes("test:debug-config-preset-import"), "npm run test must include test:debug-config-preset-import.");

console.log("debug config preset import tests passed");

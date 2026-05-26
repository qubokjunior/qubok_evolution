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

for (const token of ["DebugConfigPresetValidation", "validateDebugConfigPresetText", "empty preset textarea", "invalid preset version or shape", "valid preset"]) {
  assert(preset.includes(token), "debugConfigPreset missing preset UX token: " + token);
}

for (const token of ["preset io", "clear preset text", "presetStatus", "updatePresetValidation", "dataset.validation", "importPresetButton.disabled", "presetInput.addEventListener(\"input\"", "validateDebugConfigPresetText"]) {
  assert(panel.includes(token), "debugLayoutPanel missing preset UX token: " + token);
}

for (const token of ["data-validation=\"valid\"", "data-validation=\"invalid\"", ".qubok_evolve-control-button:disabled", ".qubok_evolve-control-note--preset"]) {
  assert(styles.includes(token), "styles missing preset UX CSS token: " + token);
}

assert(docs.includes("M45-K3"), "integration_m45 must document M45-K3.");
assert(packageJson.scripts["test:debug-config-preset-ux"] === "node scripts/test-debug-config-preset-ux.mjs", "package.json must expose test:debug-config-preset-ux.");
assert(packageJson.scripts.test.includes("test:debug-config-preset-ux"), "npm run test must include test:debug-config-preset-ux.");

console.log("debug config preset UX tests passed");

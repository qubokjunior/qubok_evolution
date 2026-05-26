import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = relativePath => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const persistence = readText("src/sim/fieldDampingConfigPersistence.ts");
const app = readText("src/ui/App.ts");
const panel = readText("src/ui/fieldDampingPanel.ts");
const debugLayoutPanel = readText("src/ui/debugLayoutPanel.ts");
const docs = readText("docs/integration_m45.md");

for (const token of ["FIELD_DAMPING_CONFIG_STORAGE_KEY", "loadStoredFieldDampingConfig", "saveFieldDampingConfig", "clearStoredFieldDampingConfig", "BOOLEAN_KEYS", "NUMBER_KEYS", "localStorage.getItem", "localStorage.setItem"]) {
  assert(persistence.includes(token), "fieldDampingConfigPersistence missing token: " + token);
}

for (const token of ["loadStoredFieldDampingConfig", "saveFieldDampingConfig", "initialFieldDampingConfig", "...initialFieldDampingConfig", "onConfigChange: saveFieldDampingConfig", "DemoSimulationFieldDampingConfig"]) {
  assert(app.includes(token), "App missing field damping persistence token: " + token);
}

for (const token of ["FieldDampingControlPanelOptions", "onConfigChange", "options.onConfigChange?.(simulation.updateFieldDampingConfig"]) {
  assert(panel.includes(token), "fieldDampingPanel missing persistence callback token: " + token);
}

for (const token of ["clearStoredFieldDampingConfig", "reset layout + debug config"]) {
  assert(debugLayoutPanel.includes(token), "debugLayoutPanel missing field damping reset token: " + token);
}

assert(docs.includes("M45-J4"), "integration_m45 must document M45-J4.");
assert(packageJson.scripts["test:field-damping-config-persistence"] === "node scripts/test-field-damping-config-persistence.mjs", "package.json must expose test:field-damping-config-persistence.");
assert(packageJson.scripts.test.includes("test:field-damping-config-persistence"), "npm run test must include test:field-damping-config-persistence.");

console.log("field damping config persistence tests passed");

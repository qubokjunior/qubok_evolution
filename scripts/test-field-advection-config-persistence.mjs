import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = relativePath => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const persistence = readText("src/sim/fieldAdvectionConfigPersistence.ts");
const app = readText("src/ui/App.ts");
const panel = readText("src/ui/fieldAdvectionPanel.ts");
const debugLayoutPanel = readText("src/ui/debugLayoutPanel.ts");
const docs = readText("docs/integration_m46.md");

for (const token of ["FIELD_ADVECTION_CONFIG_STORAGE_KEY", "loadStoredFieldAdvectionConfig", "saveFieldAdvectionConfig", "clearStoredFieldAdvectionConfig", "BOOLEAN_KEYS", "NUMBER_KEYS", "localStorage.getItem", "localStorage.setItem"]) assert(persistence.includes(token), "fieldAdvectionConfigPersistence missing token: " + token);
for (const token of ["loadStoredFieldAdvectionConfig", "saveFieldAdvectionConfig", "initialFieldAdvectionConfig", "...initialFieldAdvectionConfig", "onConfigChange: saveFieldAdvectionConfig"]) assert(app.includes(token), "App missing field advection persistence token: " + token);
for (const token of ["FieldAdvectionControlPanelOptions", "onConfigChange", "options.onConfigChange?.(simulation.updateFieldAdvectionConfig"]) assert(panel.includes(token), "fieldAdvectionPanel missing persistence callback token: " + token);
for (const token of ["clearStoredFieldAdvectionConfig", "reset layout + debug config"]) assert(debugLayoutPanel.includes(token), "debugLayoutPanel missing field advection reset token: " + token);
assert(docs.includes("M46-A6"), "integration_m46 must document M46-A6.");
assert(packageJson.scripts["test:field-advection-config-persistence"] === "node scripts/test-field-advection-config-persistence.mjs", "package.json must expose test:field-advection-config-persistence.");
assert(packageJson.scripts.test.includes("test:field-advection-config-persistence"), "npm run test must include test:field-advection-config-persistence.");
console.log("field advection config persistence tests passed");

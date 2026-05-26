import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = relativePath => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const primitives = readText("src/ui/controlPanelPrimitives.ts");
const docs = readText("docs/integration_m45.md");

for (const token of ["collapseStorageKey", "control_panel_collapsed", "control_subsection_collapsed", "readStoredBoolean", "writeStoredBoolean", "localStorage.getItem", "localStorage.setItem"]) {
  assert(primitives.includes(token), "controlPanelPrimitives missing collapse persistence token: " + token);
}

assert(docs.includes("M45-H6"), "integration_m45 must document M45-H6.");
assert(packageJson.scripts["test:editable-collapse-persistence"] === "node scripts/test-editable-collapse-persistence.mjs", "package.json must expose test:editable-collapse-persistence.");
assert(packageJson.scripts.test.includes("test:editable-collapse-persistence"), "npm run test must include test:editable-collapse-persistence.");

console.log("editable collapse persistence tests passed");

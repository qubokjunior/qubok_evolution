import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = relativePath => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const app = readText("src/ui/App.ts");
const panel = readText("src/ui/fieldDampingPanel.ts");
const primitives = readText("src/ui/controlPanelPrimitives.ts");
const styles = readText("src/styles.css");

for (const token of ["createFieldDampingControlPanel", "fieldDampingPanel.destroy()"]) assert(app.includes(token), "App missing field damping panel token: " + token);
for (const token of ["DemoSimulationFieldDampingConfig", "DemoSimulationFieldDampingConfigPatch", "createBooleanControl", "createNumericControl", "createControlFooter", "updateFieldDampingConfig"]) assert(panel.includes(token), "fieldDampingPanel missing token: " + token);
for (const token of ["obstacle/sec", "terrain/sec", "max obstacle cells", "max terrain cells"]) assert(panel.includes(token), "fieldDampingPanel missing control label: " + token);
for (const token of ["range.type = \"range\"", "input.type = \"checkbox\"", "number.type = \"number\"", "createControlFooter", "reset"]) assert(primitives.includes(token), "shared primitives missing field damping input token: " + token);
for (const cssToken of [".qubok_evolve-control-panel", "pointer-events: auto", ".qubok_evolve-control-number-controls", "grid-template-columns: 1fr 72px", ".qubok_evolve-control-button:hover"]) assert(styles.includes(cssToken), "styles missing field damping panel CSS: " + cssToken);
assert(packageJson.scripts["test:field-damping-panel"] === "node scripts/test-field-damping-panel.mjs", "package.json must expose test:field-damping-panel.");
assert(packageJson.scripts.test.includes("test:field-damping-panel"), "npm run test must include test:field-damping-panel.");

console.log("field damping panel tests passed");

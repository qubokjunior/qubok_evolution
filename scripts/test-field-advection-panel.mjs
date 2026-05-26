import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = relativePath => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const app = readText("src/ui/App.ts");
const panel = readText("src/ui/fieldAdvectionPanel.ts");
const demoSimulation = readText("src/sim/demoSimulation.ts");
const docs = readText("docs/integration_m46.md");

for (const token of ["createFieldAdvectionControlPanel", "fieldAdvectionPanel.destroy()"]) assert(app.includes(token), "App missing field advection panel token: " + token);
for (const token of ["DemoSimulationFieldAdvectionConfig", "DemoSimulationFieldAdvectionConfigPatch", "createBooleanControl", "createNumericControl", "createControlFooter", "updateFieldAdvectionConfig", "getFieldAdvectionConfig"]) assert(panel.includes(token), "fieldAdvectionPanel missing token: " + token);
for (const label of ["enable advection", "strength", "substeps", "min active"]) assert(panel.includes(label), "fieldAdvectionPanel missing label: " + label);
for (const token of ["DemoSimulationFieldAdvectionConfig", "DemoSimulationFieldAdvectionConfigPatch", "getFieldAdvectionConfig", "updateFieldAdvectionConfig", "enableFieldAdvection", "fieldAdvectionStrength", "fieldAdvectionSubsteps", "fieldAdvectionMinActiveMagnitude"]) assert(demoSimulation.includes(token), "demoSimulation missing advection config token: " + token);
assert(docs.includes("M46-A5: editable advection controls"), "integration_m46 must document M46-A5 editable controls.");
assert(packageJson.scripts["test:field-advection-panel"] === "node scripts/test-field-advection-panel.mjs", "package.json must expose test:field-advection-panel.");
assert(packageJson.scripts.test.includes("test:field-advection-panel"), "npm run test must include test:field-advection-panel.");
console.log("field advection panel tests passed");

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = relativePath => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const demoSimulation = readText("src/sim/demoSimulation.ts");
const pixiRenderer = readText("src/render/pixiRenderer.ts");
const perfMetrics = readText("src/shared/perfMetrics.ts");
const debugOverlay = readText("src/render/debugOverlay.ts");
const integrationM46 = readText("docs/integration_m46.md");

for (const token of ["advectEnvironmentalField", "createFieldAdvectionScratch", "FieldAdvectionStepMetrics", "fieldAdvectionStats", "fieldAdvectionMs", "enableFieldAdvection", "fieldAdvectionStrength", "fieldAdvectionSubsteps", "fieldAdvectionMinActiveMagnitude"]) assert(demoSimulation.includes(token), "demoSimulation missing advection token: " + token);
assert(demoSimulation.indexOf("const fieldDampingStats = applyFieldDamping") < demoSimulation.indexOf("const fieldAdvectionStats = advectEnvironmentalField"), "field advection must run after damping.");
assert(demoSimulation.indexOf("const fieldAdvectionStats = advectEnvironmentalField") < demoSimulation.indexOf("const fieldDynamicsStats = stepEnvironmentalFieldDynamics"), "field advection must run before dynamics.");
for (const token of ["FieldAdvectionStepMetrics", "fieldAdvectionStats", "fieldAdvectionMs"]) assert(pixiRenderer.includes(token), "pixiRenderer missing advection token: " + token);
for (const metric of ["fieldAdvectionMs", "fieldAdvectionSampleCount", "fieldAdvectionAdvectedCellCount", "fieldAdvectionMaxBacktraceDistanceCells", "fieldAdvectionMagnitudeBefore", "fieldAdvectionMagnitudeAfter", "fieldAdvectionMagnitudeDelta"]) {
  assert(perfMetrics.includes(metric), "perfMetrics missing metric: " + metric);
  assert(pixiRenderer.includes(metric), "pixiRenderer missing metric: " + metric);
  assert(debugOverlay.includes(metric), "debugOverlay missing metric: " + metric);
}
for (const label of ["field advect", "field adv samples", "field adv cells", "field adv after"]) assert(debugOverlay.includes(label), "debugOverlay missing label: " + label);
assert(integrationM46.includes("sources/sinks -> damping -> advection -> dynamics"), "integration_m46 must document m46 demo step order.");
assert(packageJson.scripts["test:field-advection-integration"] === "node scripts/test-field-advection-integration.mjs", "package.json must expose test:field-advection-integration.");
assert(packageJson.scripts.test.includes("test:field-advection-integration"), "npm run test must include test:field-advection-integration.");
console.log("field advection integration tests passed");

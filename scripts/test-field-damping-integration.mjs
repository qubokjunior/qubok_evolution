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
const integrationM45 = readText("docs/integration_m45.md");

for (const token of ["applyFieldDamping", "FieldDampingStepMetrics", "fieldDampingStats", "fieldDampingMs", "enableObstacleFieldDamping", "enableTerrainFieldDamping", "obstacleFieldDampingPerSecond", "terrainFieldDampingScalePerSecond", "fieldDampingMaxObstacleCells", "fieldDampingMaxTerrainCells"]) assert(demoSimulation.includes(token), "demoSimulation missing damping token: " + token);
assert(demoSimulation.indexOf("applyFieldSourcesAndSinks") < demoSimulation.indexOf("applyFieldDamping"), "field damping must run after sources/sinks.");
assert(demoSimulation.indexOf("applyFieldDamping") < demoSimulation.indexOf("stepEnvironmentalFieldDynamics"), "field damping must run before field dynamics.");
for (const token of ["FieldDampingStepMetrics", "fieldDampingStats", "fieldDampingMs"]) assert(pixiRenderer.includes(token), "pixiRenderer missing damping token: " + token);
for (const metric of ["fieldDampingMs", "fieldDampingObstacleSampleCount", "fieldDampingObstacleDampedCellCount", "fieldDampingTerrainSampleCount", "fieldDampingTerrainDampedCellCount", "fieldDampingMagnitudeBefore", "fieldDampingMagnitudeAfter", "fieldDampingMagnitudeDamped"]) {
  assert(perfMetrics.includes(metric), "perfMetrics missing metric: " + metric);
  assert(pixiRenderer.includes(metric), "pixiRenderer missing metric: " + metric);
  assert(debugOverlay.includes(metric), "debugOverlay missing metric: " + metric);
}
for (const label of ["field damp", "field damp obst samples", "field damp obst cells", "field damp terrain samples", "field damp terrain cells", "field damp before", "field damp after", "field damp mag"]) assert(debugOverlay.includes(label), "debugOverlay missing label: " + label);
assert(integrationM45.includes("fieldDampingStats"), "integration_m45 must document fieldDampingStats.");
assert(integrationM45.includes("fieldDampingMs"), "integration_m45 must document fieldDampingMs.");
assert(packageJson.scripts["test:field-damping-integration"] === "node scripts/test-field-damping-integration.mjs", "package.json must expose test:field-damping-integration.");
assert(packageJson.scripts.test.includes("test:field-damping-integration"), "npm run test must include test:field-damping-integration.");
console.log("field damping integration tests passed");

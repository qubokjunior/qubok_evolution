import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = relativePath => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const demoSimulation = readText("src/sim/demoSimulation.ts");
const app = readText("src/ui/App.ts");
const pixiRenderer = readText("src/render/pixiRenderer.ts");
const perfMetrics = readText("src/shared/perfMetrics.ts");
const debugOverlay = readText("src/render/debugOverlay.ts");
const integrationM45 = readText("docs/integration_m45.md");

for (const token of ["DemoSimulationFieldDampingConfig", "DemoSimulationFieldDampingConfigPatch", "getFieldDampingConfig", "updateFieldDampingConfig", "let enableObstacleFieldDamping", "let enableTerrainFieldDamping"]) assert(demoSimulation.includes(token), "demoSimulation missing editable damping token: " + token);
for (const token of ["FIELD_DAMPING_CONTROL_KEYS", '"6": "toggleObstacle"', '"7": "toggleTerrain"', '"[": "obstacleDown"', '"]": "obstacleUp"', '";": "terrainDown"', "applyFieldDampingControlShortcut", "simulation.updateFieldDampingConfig"]) assert(app.includes(token), "App missing damping keyboard control token: " + token);
assert(app.indexOf("FIELD_DAMPING_CONTROL_KEYS[event.key]") < app.indexOf("RENDER_DEBUG_LAYER_KEYS[event.key]"), "damping controls must be checked before layer-key early return.");
for (const metric of ["fieldDampingObstacleEnabled", "fieldDampingTerrainEnabled", "fieldDampingObstaclePerSecond", "fieldDampingTerrainScalePerSecond", "fieldDampingMaxObstacleCells", "fieldDampingMaxTerrainCells"]) {
  assert(perfMetrics.includes(metric), "perfMetrics missing damping control metric: " + metric);
  assert(pixiRenderer.includes(metric), "pixiRenderer missing damping control metric: " + metric);
  assert(debugOverlay.includes(metric), "debugOverlay missing damping control metric: " + metric);
}
for (const label of ["field damp obst on", "field damp terrain on", "field damp obst/sec", "field damp terrain/sec", "field damp max obst", "field damp max terrain"]) assert(debugOverlay.includes(label), "debugOverlay missing damping control label: " + label);
assert(integrationM45.includes("6/7 toggle obstacle/terrain field damping"), "integration_m45 must document damping keyboard controls.");
assert(packageJson.scripts["test:field-damping-controls"] === "node scripts/test-field-damping-controls.mjs", "package.json must expose test:field-damping-controls.");
assert(packageJson.scripts.test.includes("test:field-damping-controls"), "npm run test must include test:field-damping-controls.");
console.log("field damping control tests passed");

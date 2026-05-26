import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = relativePath => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const debugOverlay = readText("src/render/debugOverlay.ts");
const pixiRenderer = readText("src/render/pixiRenderer.ts");
const perfMetrics = readText("src/shared/perfMetrics.ts");
const integrationM46 = readText("docs/integration_m46.md");

const advectionMetrics = [
  "fieldAdvectionMs",
  "fieldAdvectionSampleCount",
  "fieldAdvectionAdvectedCellCount",
  "fieldAdvectionMaxBacktraceDistanceCells",
  "fieldAdvectionMagnitudeBefore",
  "fieldAdvectionMagnitudeAfter",
  "fieldAdvectionMagnitudeDelta"
];

for (const metric of advectionMetrics) {
  assert(perfMetrics.includes(metric), "perfMetrics missing field advection metric: " + metric);
  assert(pixiRenderer.includes(`metrics.record("${metric}"`), "pixiRenderer must record metric: " + metric);
  assert(pixiRenderer.includes(`${metric}: snapshot.values.${metric}`), "pixiRenderer overlay payload missing metric: " + metric);
  assert(debugOverlay.includes(metric), "debugOverlay missing metric key: " + metric);
}

for (const label of ["field advect", "field adv samples", "field adv cells", "field adv backtrace", "field adv before", "field adv after", "field adv delta"]) {
  assert(debugOverlay.includes(label), "debugOverlay missing readable advection label: " + label);
}

assert(debugOverlay.indexOf("fieldDampingMagnitudeDamped") < debugOverlay.indexOf("fieldAdvectionMs"), "debug overlay must list advection after damping metrics.");
assert(debugOverlay.indexOf("fieldAdvectionMagnitudeDelta") < debugOverlay.indexOf("fieldDampingObstacleEnabled"), "debug overlay must list advection metrics before damping config readouts.");
assert(debugOverlay.includes("fieldAdvectionMs: \"field\""), "advection metrics must be grouped under field.");
assert(integrationM46.includes("M46-A4: overlay metrics/readouts"), "integration_m46 must keep M46-A4 overlay/readout slice.");
assert(packageJson.scripts["test:field-advection-overlay-qa"] === "node scripts/test-field-advection-overlay-qa.mjs", "package.json must expose test:field-advection-overlay-qa.");
assert(packageJson.scripts.test.includes("test:field-advection-overlay-qa"), "npm run test must include test:field-advection-overlay-qa.");

console.log("field advection overlay QA tests passed");

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = (relativePath) => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const perfMetrics = readText("src/shared/perfMetrics.ts");
const debugOverlay = readText("src/render/debugOverlay.ts");
const pixiRenderer = readText("src/render/pixiRenderer.ts");

assert(packageJson.scripts["test:field-force-overlay-qa"] === "node scripts/test-field-force-overlay-qa.mjs", "package.json must expose test:field-force-overlay-qa.");
assert(packageJson.scripts.test.includes("test:field-force-overlay-qa"), "npm run test must include test:field-force-overlay-qa.");

for (const token of [
  "fieldForceMs",
  "fieldForceEnabled",
  "fieldForceAgentCount",
  "fieldForceSampleCount",
  "fieldForceAffectedAgentCount",
  "fieldForceIgnoredDeadCount",
  "fieldForceZeroFieldCount",
  "fieldForceClampCount",
  "fieldForceMagnitudeTotal",
  "fieldForceMaxForceMagnitude",
  "fieldForceFieldMagnitudeSum"
]) {
  assert(perfMetrics.includes(token), "perf metrics missing token: " + token);
  assert(debugOverlay.includes(token), "debug overlay missing token: " + token);
  assert(pixiRenderer.includes(token), "pixiRenderer missing token: " + token);
}

for (const label of [
  "field force",
  "field force on",
  "field force agents",
  "field force samples",
  "field force affected",
  "field force clamps",
  "field force mag"
]) {
  assert(debugOverlay.includes(label), "debug overlay missing label: " + label);
}

assert(pixiRenderer.includes("FieldForceStepMetrics"), "pixiRenderer must type field force stats.");
assert(pixiRenderer.includes("FieldForceConfigReadout"), "pixiRenderer must type field force config readout.");
assert(pixiRenderer.includes("frame.fieldForceStats.totalForceMagnitude"), "pixiRenderer must record field force total magnitude.");
assert(pixiRenderer.includes("frame.fieldForceConfig.enableFieldForce ? 1 : 0"), "pixiRenderer must expose disabled/enabled readout.");

console.log("field force overlay QA tests passed");

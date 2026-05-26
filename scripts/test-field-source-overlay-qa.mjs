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
const visualQaTest = readText("scripts/test-field-source-visual-qa.mjs");
const integrationM44 = readText("docs/integration_m44.md");

const sourceMetrics = [
  "fieldSourcesMs",
  "fieldSourceCount",
  "fieldSinkCount",
  "fieldSourceEmittedCellCount",
  "fieldSinkAbsorbedCellCount",
  "fieldSourceMagnitudeEmitted",
  "fieldSinkMagnitudeAbsorbed",
  "fieldSourceMagnitudeAfter",
  "fieldRenderVectorCount",
  "fieldRenderTruncated"
];

for (const metric of sourceMetrics) {
  assert(perfMetrics.includes(metric), "perf metrics missing source/readout metric: " + metric);
  assert(debugOverlay.includes(metric), "debug overlay missing source/readout metric: " + metric);
}

for (const metric of [
  "fieldSourcesMs",
  "fieldSourceCount",
  "fieldSinkCount",
  "fieldSourceEmittedCellCount",
  "fieldSinkAbsorbedCellCount",
  "fieldSourceMagnitudeEmitted",
  "fieldSinkMagnitudeAbsorbed",
  "fieldSourceMagnitudeAfter"
]) {
  assert(pixiRenderer.includes(`metrics.record("${metric}"`), "pixi renderer does not record metric: " + metric);
}

for (const label of [
  "field src",
  "field src count",
  "field sink count",
  "field src cells",
  "field sink cells",
  "field src mag",
  "field sink mag",
  "field src after",
  "field vectors",
  "field trunc"
]) {
  assert(debugOverlay.includes(label), "debug overlay missing readable field-source label: " + label);
}

for (const qaToken of [
  "fieldSourceStats.totalMagnitudeEmitted",
  "fieldSourceStats.totalMagnitudeAbsorbed",
  "fieldRenderSnapshot.sampleVectorCount",
  "fieldRenderSnapshot.truncated",
  "finiteMagnitudeCount"
]) {
  assert(visualQaTest.includes(qaToken), "visual QA test missing runtime assertion token: " + qaToken);
}

assert(packageJson.scripts["test:field-source-overlay-qa"] === "node scripts/test-field-source-overlay-qa.mjs", "package.json must expose test:field-source-overlay-qa.");
assert(packageJson.scripts.test.includes("test:field-source-overlay-qa"), "npm run test must include field source overlay QA.");
assert(integrationM44.includes("Overlay/readout QA"), "integration_m44 must document overlay/readout QA.");
console.log("field source overlay QA tests passed");

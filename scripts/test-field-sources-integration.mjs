import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = (relativePath) => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const readme = readText("README.md");
const milestones = readText("docs/milestones.md");
const roadmap = readText("docs/roadmap.md");
const integrationM43 = readText("docs/integration_m43.md");
const fieldSources = readText("src/sim/fieldSources.ts");
const fieldSourcesTest = readText("scripts/test-field-sources.mjs");
const fieldSourcesBench = readText("scripts/bench-field-sources.mjs");

for (const requiredToken of [
  "FIELD_SOURCES_VERSION",
  "FieldPointSource",
  "FieldPointSink",
  "FieldSourceStepMetrics",
  "emitFieldPointSource",
  "absorbFieldPointSink",
  "applyFieldSourcesAndSinks",
  "measureTotalFieldMagnitude",
  "totalMagnitudeEmitted",
  "totalMagnitudeAbsorbed",
  "totalMagnitudeAfter"
]) {
  assert(fieldSources.includes(requiredToken), "field sources module missing token: " + requiredToken);
}

for (const requiredToken of [
  "FIELD_SOURCES_VERSION",
  "emitFieldPointSource",
  "absorbFieldPointSink",
  "applyFieldSourcesAndSinks",
  "measureTotalFieldMagnitude",
  "field sources tests passed"
]) {
  assert(fieldSourcesTest.includes(requiredToken), "field sources test missing token: " + requiredToken);
}

for (const requiredToken of [
  "field-sources",
  "sourceCount",
  "sinkCount",
  "applyFieldSourcesAndSinks",
  "msPerStep",
  "stepsPerSecond"
]) {
  assert(fieldSourcesBench.includes(requiredToken), "field sources benchmark missing token: " + requiredToken);
}

assert(packageJson.version === "0.1.0-milestone.45", "package.json must expose milestone.45.");
assert(packageJson.scripts["test:field-sources"] === "node scripts/test-field-sources.mjs", "package.json must expose test:field-sources.");
assert(packageJson.scripts["bench:field-sources"] === "node scripts/bench-field-sources.mjs", "package.json must expose bench:field-sources.");
assert(packageJson.scripts.test.includes("test:field-sources"), "npm run test must include test:field-sources.");
assert(readme.includes("m43") && readme.includes("field sources/sinks"), "README must preserve shipped m43 field sources/sinks summary.");
assert(milestones.includes("| m43 |") && milestones.includes("complete"), "milestones must preserve m43 as complete.");
assert(roadmap.includes("m44 shipped: field source semantics tuning and visualization QA"), "roadmap must include m44 shipped milestone.");
assert(integrationM43.includes("field sources") && integrationM43.includes("sinks"), "integration_m43 must describe field sources/sinks.");


assert(integrationM45.includes("obstacle/terrain damping sources") && integrationM45.includes("editable debug parameters"), "integration_m45 must describe obstacle/terrain damping sources and editable debug parameters.");


assert(roadmap.includes("m45 in progress: obstacle/terrain damping sources and editable debug parameters"), "roadmap must include m45 current milestone.");

console.log("field sources integration tests passed");

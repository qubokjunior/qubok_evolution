import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_field_source_visual_qa_test");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

const simDirectory = join(projectRoot, "src", "sim");
const moduleNames = (await readdir(simDirectory)).filter((name) => name.endsWith(".ts"));
for (const moduleName of moduleNames) await transpileSimModule(moduleName, moduleName.replace(".ts", ".mjs"));

const { createDemoSimulation } = await import(pathToFileURL(join(temporaryDirectory, "demoSimulation.mjs")).href);

const simulation = createDemoSimulation({
  seed: "qubok_evolve:m44:field-source-visual-qa",
  capacity: 64,
  initialAgentCount: 24,
  resourceCapacity: 128,
  targetResourceCount: 96,
  worldWidth: 512,
  worldHeight: 512,
  fieldCellSize: 64,
  fieldRenderStride: 1,
  fieldRenderMaxVectors: 128,
  fieldRenderMinMagnitude: 0.000001,
  fieldResourceSourceStrengthPerSecond: 4,
  fieldAgentSinkAbsorptionPerSecond: 0.005,
  fieldSourceMaxResources: 48,
  fieldSinkMaxAgents: 24,
  fieldDecayPerSecond: 0.001,
  fieldDiffusionRatePerSecond: 0.01
});

let frame;
for (let stepIndex = 0; stepIndex < 6; stepIndex += 1) frame = simulation.step(1 / 60);

assert(frame.fieldSourceStats.sourceCount > 0, "demo must emit resource field sources.");
assert(frame.fieldSourceStats.sinkCount > 0, "demo must emit agent field sinks.");
assert(frame.fieldSourceStats.emittedCellCount > 0, "resource sources must touch field cells.");
assert(frame.fieldSourceStats.absorbedCellCount > 0, "agent sinks must touch field cells.");
assert(frame.fieldSourceStats.totalMagnitudeEmitted > 0, "resource sources must emit non-zero magnitude.");
assert(frame.fieldSourceStats.totalMagnitudeAbsorbed >= 0, "agent absorbed magnitude must be non-negative.");
assert(frame.fieldSourceStats.totalMagnitudeEmitted > frame.fieldSourceStats.totalMagnitudeAbsorbed, "QA config should keep emitted field signal stronger than sink absorption.");
assert(frame.fieldSourceStats.totalMagnitudeAfter > 0, "field magnitude after source/sink step must stay visible.");
assert(frame.fieldSourcesMs >= 0, "field source timing metric must be non-negative.");
assert(frame.fieldRenderSnapshot.sampleVectorCount > 0, "field render snapshot must expose visible vectors.");
assert(frame.fieldRenderSnapshot.sampleVectorCount <= frame.fieldRenderSnapshot.cellCount, "field render vector count must stay bounded by field cells.");
assert(frame.fieldRenderSnapshot.truncated === false, "QA config should not truncate field vectors.");

let finiteMagnitudeCount = 0;
for (let index = 0; index < frame.fieldRenderSnapshot.sampleVectorCount; index += 1) {
  const magnitude = frame.fieldRenderSnapshot.magnitude[index];
  if (Number.isFinite(magnitude) && magnitude > 0) finiteMagnitudeCount += 1;
}
assert(finiteMagnitudeCount > 0, "field render snapshot must contain finite positive magnitudes.");

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("field source visual QA tests passed");

async function transpileSimModule(sourceName, outputName) {
  const sourcePath = join(projectRoot, "src", "sim", sourceName);
  const outputPath = join(temporaryDirectory, outputName);
  const sourceText = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(sourceText, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true } });
  const outputText = transpiled.outputText
    .replace(/from "(.\/[^"]+)"/g, (_match, path) => `from "${path}.mjs"`)
    .replace(/from '(.\/[^']+)'/g, (_match, path) => `from '${path}.mjs'`);
  await writeFile(outputPath, outputText, "utf8");
}

function assert(condition, message) { if (!condition) throw new Error(message); }

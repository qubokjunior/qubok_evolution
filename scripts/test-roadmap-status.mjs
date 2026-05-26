import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = (relativePath) => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const appVersion = readText("src/shared/appVersion.ts");
const readme = readText("README.md");
const roadmap = readText("docs/roadmap.md");
const architectureTracks = readText("docs/architecture_tracks.md");
const integrationM40 = readText("docs/integration_m40.md");
const integrationM41 = readText("docs/integration_m41.md");
const integrationM42 = readText("docs/integration_m42.md");
const integrationM43 = readText("docs/integration_m43.md");
const integrationM44 = readText("docs/integration_m44.md");
const integrationM45 = readText("docs/integration_m45.md");
const field = readText("src/sim/field.ts");
const fieldRenderSnapshot = readText("src/sim/fieldRenderSnapshot.ts");
const fieldDynamics = readText("src/sim/fieldDynamics.ts");
const fieldSources = readText("src/sim/fieldSources.ts");
const fieldDamping = readText("src/sim/fieldDamping.ts");
const movement = readText("src/sim/movement.ts");
const debugOverlay = readText("src/render/debugOverlay.ts");
const perfMetrics = readText("src/shared/perfMetrics.ts");
const pixiRenderer = readText("src/render/pixiRenderer.ts");
const demoSimulation = readText("src/sim/demoSimulation.ts");

assert(packageJson.version === "0.1.0-milestone.45", "package.json must expose m45 version.");
assert(appVersion.includes("PROJECT_VERSION = \"0.1.0-milestone.45\""), "appVersion must expose milestone.45.");
assert(appVersion.includes("PROJECT_MILESTONE = 45"), "appVersion must expose milestone number 45.");
assert(appVersion.includes("PROJECT_MILESTONE_LABEL = \"m45\""), "appVersion must expose m45 label.");
assert(readme.includes("docs/roadmap.md"), "README.md must link docs/roadmap.md.");
assert(roadmap.includes("m39 shipped: low-resolution environmental flow field sampled by movement"), "roadmap must include m39 field milestone.");
assert(roadmap.includes("m40 shipped: environmental field render snapshot and Pixi vector debug layer"), "roadmap must include m40 field render milestone.");
assert(roadmap.includes("m41 shipped: render debug controls"), "roadmap must include m41 shipped milestone.");
assert(roadmap.includes("m43 shipped: field sources/sinks foundation"), "roadmap must include m43 shipped milestone.");
assert(architectureTracks.includes("renderer must not own authoritative simulation state"), "architecture tracks must preserve sim/render boundary.");
assert(field.includes("FIELD_LAYER_VERSION"), "field must expose FIELD_LAYER_VERSION.");
assert(field.includes("sampleFieldAtPosition"), "field must expose sampleFieldAtPosition.");
assert(fieldRenderSnapshot.includes("FIELD_RENDER_SNAPSHOT_VERSION"), "field render snapshot must expose version.");
assert(fieldRenderSnapshot.includes("makeFieldRenderSnapshot"), "field render snapshot must expose snapshot builder.");
assert(fieldRenderSnapshot.includes("analyzeFieldRenderSnapshot"), "field render snapshot must expose analyzer.");
assert(fieldDynamics.includes("FIELD_DYNAMICS_VERSION"), "field dynamics must expose version.");
assert(fieldDynamics.includes("stepEnvironmentalFieldDynamics"), "field dynamics must expose stepEnvironmentalFieldDynamics.");
assert(fieldDynamics.includes("createFieldDynamicsScratch"), "field dynamics must expose scratch creation.");
assert(movement.includes("field?: EnvironmentalFieldLayer"), "movement must accept field layer.");
assert(movement.includes("fieldMovementSampleCount"), "movement must expose field movement stats.");
assert(demoSimulation.includes("fieldRenderSnapshot"), "demoSimulation must emit fieldRenderSnapshot.");
assert(demoSimulation.includes("fieldDynamicsStats"), "demoSimulation must emit fieldDynamicsStats.");
assert(demoSimulation.includes("fieldRenderStride"), "demoSimulation must expose fieldRenderStride.");
assert(debugOverlay.includes("field render"), "debug overlay must expose field render label.");
assert(debugOverlay.includes("field vectors"), "debug overlay must expose field vector label.");
assert(debugOverlay.includes("field dyn"), "debug overlay must expose field dynamics label.");
assert(perfMetrics.includes("fieldRenderVectorCount"), "perf metrics must expose fieldRenderVectorCount.");
assert(perfMetrics.includes("fieldDynamicsMs"), "perf metrics must expose fieldDynamicsMs.");
assert(pixiRenderer.includes("renderFieldVectorLayer"), "pixi renderer must render field vectors.");
assert(pixiRenderer.includes("fieldLayer"), "pixi renderer must own field layer.");
assert(pixiRenderer.includes("fieldDynamicsMagnitudeAfter"), "pixi renderer must pass field dynamics overlay metrics.");
assert(integrationM40.includes("environmental field render snapshot"), "integration_m40 must describe environmental field render snapshot.");
assert(integrationM41.includes("overlay grouping"), "integration_m41 must describe overlay grouping.");
assert(integrationM42.includes("decay") && integrationM42.includes("diffusion"), "integration_m42 must describe field decay/diffusion.");
assert(packageJson.scripts.test.includes("test:roadmap-status"), "npm run test must include test:roadmap-status.");

assert(roadmap.includes("m43 shipped: field sources/sinks foundation"), "roadmap must include m43 shipped milestone.");
assert(integrationM43.includes("field sources") && integrationM43.includes("sinks"), "integration_m43 must describe field sources/sinks.");
for (const requiredToken of ["FIELD_SOURCES_VERSION", "applyFieldSourcesAndSinks", "FieldSourceStepMetrics", "measureTotalFieldMagnitude"]) assert(fieldSources.includes(requiredToken), "fieldSources missing token: " + requiredToken);
for (const requiredToken of ["fieldSourceStats", "fieldSourcesMs", "applyFieldSourcesAndSinks"]) assert(demoSimulation.includes(requiredToken), "demoSimulation missing field source token: " + requiredToken);
for (const requiredToken of ["fieldSourceStats", "fieldSourcesMs", "fieldSourceMagnitudeAfter"]) assert(pixiRenderer.includes(requiredToken), "pixiRenderer missing field source token: " + requiredToken);
for (const requiredToken of ["field src", "field sink", "field src after"]) assert(debugOverlay.includes(requiredToken), "debugOverlay missing field source label: " + requiredToken);
for (const requiredToken of ["fieldSourcesMs", "fieldSourceCount", "fieldSinkCount", "fieldSourceMagnitudeAfter"]) assert(perfMetrics.includes(requiredToken), "perf metrics missing field source token: " + requiredToken);


assert(integrationM44.includes("field source semantics tuning") && integrationM44.includes("visualization QA"), "integration_m44 must describe field source semantics tuning and visualization QA.");


assert(roadmap.includes("m44 shipped: field source semantics tuning and visualization QA"), "roadmap must include m44 shipped milestone.");


assert(integrationM45.includes("obstacle/terrain damping sources") && integrationM45.includes("editable debug parameters"), "integration_m45 must describe obstacle/terrain damping sources and editable debug parameters.");


assert(roadmap.includes("m45 in progress: obstacle/terrain damping sources and editable debug parameters"), "roadmap must include m45 current milestone.");


assert(fieldDamping.includes("FIELD_DAMPING_VERSION") && fieldDamping.includes("applyFieldDamping"), "fieldDamping must expose m45 core damping API.");
assert(packageJson.scripts["test:field-damping"] === "node scripts/test-field-damping.mjs", "package.json must expose test:field-damping.");
assert(packageJson.scripts.test.includes("test:field-damping"), "npm run test must include test:field-damping.");

console.log("roadmap status tests passed");

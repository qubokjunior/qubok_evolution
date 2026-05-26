import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const expectedBranch = "m31-roadmap-architecture-tracks";

main();

function main() {
  console.log("\n--- VERIFY BRANCH ---");
  const branch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
  if (branch !== expectedBranch) {
    throw new Error("Expected branch " + expectedBranch + ", got " + branch);
  }

  console.log("\n--- RESTORE TRACKED TARGETS FROM HEAD ---");
  for (const file of ["README.md", "package.json", "src/shared/appVersion.ts", "scripts/test-demo-integration.mjs"]) {
    execFileSync("git", ["checkout", "HEAD", "--", file], { stdio: "inherit" });
  }
  remove("docs/roadmap.md");
  remove("docs/architecture_tracks.md");
  remove("docs/integration_m31.md");
  remove("scripts/test-roadmap-status.mjs");

  console.log("\n--- PATCH package.json ---");
  const pkg = JSON.parse(read("package.json"));
  pkg.version = "0.1.0-milestone.31";
  pkg.scripts["test:roadmap-status"] = "node scripts/test-roadmap-status.mjs";
  if (!pkg.scripts.test.includes("npm run test:roadmap-status")) {
    const anchor = "npm run check:boundaries && npm run test:repo-status";
    if (!pkg.scripts.test.includes(anchor)) {
      throw new Error("Missing package.json test chain anchor.");
    }
    pkg.scripts.test = pkg.scripts.test.replace(anchor, "npm run check:boundaries && npm run test:repo-status && npm run test:roadmap-status");
  }
  write("package.json", JSON.stringify(pkg, null, 2) + "\n");

  console.log("\n--- PATCH appVersion.ts ---");
  write("src/shared/appVersion.ts", [
    "export const PROJECT_NAME = \"qubok_evolve\" as const;",
    "export const PROJECT_VERSION = \"0.1.0-milestone.31\" as const;",
    "export const PROJECT_MILESTONE = 31 as const;",
    "export const PROJECT_MILESTONE_LABEL = \"m31\" as const;"
  ].join("\n") + "\n");

  console.log("\n--- WRITE DOCS ---");
  write("README.md", readmeText());
  write("docs/roadmap.md", roadmapText());
  write("docs/architecture_tracks.md", architectureTracksText());
  write("docs/integration_m31.md", integrationText());
  write("scripts/test-roadmap-status.mjs", roadmapStatusTestText());

  console.log("\n--- PATCH demo integration test ---");
  patchDemoIntegrationTest();

  console.log("\n--- SANITY ---");
  assert(read("package.json").includes("0.1.0-milestone.31"), "package version not patched");
  assert(read("src/shared/appVersion.ts").includes("m31"), "appVersion not patched");
  assert(read("README.md").includes("docs/roadmap.md"), "README missing roadmap link");
  assert(read("docs/roadmap.md").includes("terrain/material track"), "roadmap missing terrain track");
  assert(read("scripts/test-roadmap-status.mjs").includes("docs/roadmap.md"), "test missing roadmap check");

  console.log("\nPATCH COMPLETE: m31 roadmap architecture tracks patched. Run verify manually:");
  console.log("npm run test:roadmap-status");
  console.log("npm run test");
  console.log("npm run build");
  console.log("npm run bench:world-free-list");
  console.log("git status --short");
}

function patchDemoIntegrationTest() {
  let text = read("scripts/test-demo-integration.mjs");
  text = text.replaceAll("0.1.0-milestone.30", "0.1.0-milestone.31");
  text = text.replaceAll("milestone.30", "milestone.31");
  text = text.replaceAll("m30", "m31");

  if (!text.includes("const roadmap = readText")) {
    text = text.replace(
      "const repoStatusTest = readText(\"scripts/test-repo-status.mjs\");",
      "const repoStatusTest = readText(\"scripts/test-repo-status.mjs\");\nconst roadmap = readText(\"docs/roadmap.md\");\nconst architectureTracks = readText(\"docs/architecture_tracks.md\");\nconst roadmapStatusTest = readText(\"scripts/test-roadmap-status.mjs\");"
    );
  }

  const block = [
    "assert(readme.includes(\"0.1.0-milestone.31\"), \"README must expose the current m31 milestone version.\");",
    "assert(readme.includes(\"docs/roadmap.md\"), \"README must link roadmap docs.\");",
    "assert(roadmap.includes(\"terrain/material track\"), \"roadmap must include terrain/material track.\");",
    "assert(roadmap.includes(\"controller/brain track\"), \"roadmap must include controller/brain track.\");",
    "assert(architectureTracks.includes(\"renderer must not own authoritative simulation state\"), \"architecture tracks must preserve sim/render boundary.\");",
    "assert(roadmapStatusTest.includes(\"docs/roadmap.md\"), \"roadmap status test must validate roadmap docs.\");",
    "assert(packageJson.scripts[\"test:roadmap-status\"] === \"node scripts/test-roadmap-status.mjs\", \"package.json must expose test:roadmap-status.\");",
    "assert(packageJson.scripts.test.includes(\"test:roadmap-status\"), \"npm run test must include roadmap status test.\");"
  ].join("\n");

  if (!text.includes("README must link roadmap docs")) {
    const anchor = "assert(packageJson.scripts.test.includes(\"test:repo-status\"), \"npm run test must include repo status test.\");";
    if (!text.includes(anchor)) {
      throw new Error("Missing demo integration anchor for m31.");
    }
    text = text.replace(anchor, anchor + "\n" + block);
  }

  write("scripts/test-demo-integration.mjs", text);
}

function readmeText() {
  return [
    "# qubok_evolve",
    "",
    "High-performance realtime 2D artificial-life ecosystem simulator.",
    "",
    "Current status: m31 / 0.1.0-milestone.31.",
    "",
    "## What exists now",
    "",
    "qubok_evolve is a deterministic, data-oriented 2D artificial-life runtime. The simulation state lives in typed arrays under `src/sim`, the PixiJS renderer consumes read-only snapshots under `src/render`, and milestone work is validated with Node-based tests and benchmarks.",
    "",
    "Implemented runtime foundations:",
    "",
    "- typed-array `WorldState` with deterministic spawning, lifecycle counters, phenotype fields, sensor buffers, and lineage fields;",
    "- movement, spatial hash, neighbor query, resources, energy survival, reproduction, mutation, predator/prey interaction, and sector sensors;",
    "- obstacle mask used by sensing, soft movement response, spawn validation, lifecycle telemetry, and debug rendering;",
    "- free-list dead-slot reuse so death creates structural room for later births;",
    "- live performance/debug overlay with obstacle and world-slot telemetry;",
    "- static tests guarding architecture boundaries, repo status, roadmap status, and lifecycle death routing.",
    "",
    "## Commands",
    "",
    "```powershell",
    "npm install",
    "npm run test",
    "npm run build",
    "npm run dev",
    "```",
    "",
    "Targeted checks:",
    "",
    "```powershell",
    "npm run test:repo-status",
    "npm run test:roadmap-status",
    "npm run test:death-path-audit",
    "npm run test:lifecycle-pressure",
    "npm run bench:world-free-list",
    "```",
    "",
    "Open the local URL printed by Vite, usually:",
    "",
    "```text",
    "http://127.0.0.1:5173/",
    "```",
    "",
    "## Milestones and docs",
    "",
    "- `docs/milestones.md` — compact milestone index through m30.",
    "- `docs/roadmap.md` — development tracks after m31.",
    "- `docs/architecture_tracks.md` — boundary contracts for future work.",
    "- `docs/world_state.md` — typed-array world state and lifecycle slot contract.",
    "- `docs/integration_m31.md` — current roadmap architecture-track milestone.",
    "",
    "## Boundary rule",
    "",
    "PixiJS is allowed in `src/render/` only. The simulation layer must remain renderer-agnostic. The renderer reads immutable snapshots and must not own authoritative simulation state."
  ].join("\n") + "\n";
}

function roadmapText() {
  return [
    "# qubok_evolve roadmap",
    "",
    "Current status: m31 / 0.1.0-milestone.31.",
    "",
    "This roadmap splits future work into independent architecture tracks so later milestones do not mix terrain, morphology, controller, renderer, worker, and WebGPU changes in one step.",
    "",
    "## terrain/material track",
    "",
    "Goal: turn the flat world into layered 2D terrain data without coupling terrain to rendering.",
    "",
    "Near steps:",
    "- terrain material grid with ids, friction, drag, resource affinity, and movement modifiers;",
    "- terrain query API used by movement, sensors, spawning, and reproduction;",
    "- debug snapshot for terrain fields.",
    "",
    "## fluid-like field track",
    "",
    "Goal: add cheap 2D environmental flow fields for fish/bird/flocking-like behavior.",
    "",
    "Near steps:",
    "- low-resolution vector field sampled by agents;",
    "- flow force integration separated from movement;",
    "- debug render snapshot for field vectors.",
    "",
    "## morphology/entity editor track",
    "",
    "Goal: prepare entity phenotype and morphology data for a later editor without breaking the typed-array runtime.",
    "",
    "Near steps:",
    "- component schema for body parts, sensors, mouth, locomotion, armor, and storage;",
    "- compiler from component layout to runtime phenotype arrays;",
    "- validation tests for component budgets and sensor/energy costs.",
    "",
    "## controller/brain track",
    "",
    "Goal: introduce decision logic after sensing and morphology foundations are stable.",
    "",
    "Near steps:",
    "- minimal action vector contract;",
    "- deterministic rule controller baseline;",
    "- controller metrics and replay tests.",
    "",
    "## render/performance track",
    "",
    "Goal: keep visual debugging useful while entity counts grow.",
    "",
    "Near steps:",
    "- overlay grouping and toggles;",
    "- render snapshot cost checks;",
    "- chunk size/code-splitting follow-up for the current Vite warning.",
    "",
    "## worker/WebGPU track",
    "",
    "Goal: keep the main thread responsive only after the simulation contract is stable.",
    "",
    "Near steps:",
    "- serializable snapshot boundary review;",
    "- worker transfer benchmark;",
    "- deterministic replay guard.",
    "",
    "## Track sequencing rule",
    "",
    "Each future milestone should primarily touch one track. Cross-track work needs an integration doc explaining why the coupling is necessary."
  ].join("\n") + "\n";
}

function architectureTracksText() {
  return [
    "# qubok_evolve architecture tracks",
    "",
    "Current status: m31.",
    "",
    "## Shared boundary rule",
    "",
    "The simulation layer owns authoritative state. Render and UI layers consume snapshots and may not mutate runtime arrays directly.",
    "",
    "PixiJS remains confined to src/render. Simulation modules under src/sim must stay renderer-agnostic.",
    "",
    "## Track contracts",
    "",
    "| Track | May touch | Must not touch |",
    "|---|---|---|",
    "| terrain/material | terrain data modules, movement/resource/sensor query integration, tests | Pixi internals except through snapshots |",
    "| fluid-like field | field data modules, movement force inputs, field snapshots | entity lifecycle ownership |",
    "| morphology/entity editor | schema/compiler/tests for phenotype data | direct DOM/Pixi editor coupling inside src/sim |",
    "| controller/brain | action vector contract, controller modules, deterministic tests | renderer-owned decision state |",
    "| render/performance | src/render, debug overlay, render snapshots, Vite/build config | authoritative simulation arrays |",
    "| worker/WebGPU | transfer boundaries, worker adapters, compute experiments | nondeterministic mutation of main WorldState |",
    "",
    "## Lifecycle contract",
    "",
    "All runtime death paths still route through killAgent(world, index). Direct alive-zero writes outside src/sim/world.ts remain forbidden.",
    "",
    "## Roadmap discipline",
    "",
    "A milestone should name its primary track in the integration doc. If it spans tracks, the integration doc must list each touched boundary and its reason.",
    "",
    "renderer must not own authoritative simulation state."
  ].join("\n") + "\n";
}

function integrationText() {
  return [
    "# m31 integration: roadmap architecture tracks",
    "",
    "Milestone 31 creates roadmap and architecture-track documentation for the next phase after m30.",
    "",
    "## Implementation",
    "",
    "- docs/roadmap.md splits future work into terrain/material, fluid-like field, morphology/entity editor, controller/brain, render/performance, and worker/WebGPU tracks.",
    "- docs/architecture_tracks.md defines per-track boundaries.",
    "- README.md links roadmap and architecture-track docs.",
    "- scripts/test-roadmap-status.mjs keeps README, roadmap, architecture docs, and package version synchronized.",
    "- npm run test includes test:roadmap-status.",
    "",
    "## Acceptance",
    "",
    "- npm run test:roadmap-status",
    "- npm run test",
    "- npm run build",
    "- npm run bench:world-free-list",
    "",
    "## Explicitly not changed",
    "",
    "- no simulation behavior changes",
    "- no terrain implementation",
    "- no controller/brain implementation",
    "- no renderer refactor",
    "- no worker/WebGPU migration"
  ].join("\n") + "\n";
}

function roadmapStatusTestText() {
  return [
    "import { readFileSync } from \"node:fs\";",
    "import { dirname, resolve } from \"node:path\";",
    "import { fileURLToPath } from \"node:url\";",
    "",
    "const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), \"..\");",
    "const readText = (relativePath) => readFileSync(resolve(projectRoot, relativePath), \"utf8\");",
    "const assert = (condition, message) => { if (!condition) throw new Error(message); };",
    "",
    "const packageJson = JSON.parse(readText(\"package.json\"));",
    "const appVersion = readText(\"src/shared/appVersion.ts\");",
    "const readme = readText(\"README.md\");",
    "const roadmap = readText(\"docs/roadmap.md\");",
    "const architectureTracks = readText(\"docs/architecture_tracks.md\");",
    "const integrationM31 = readText(\"docs/integration_m31.md\");",
    "",
    "assert(packageJson.version === \"0.1.0-milestone.31\", \"package.json must expose m31 version.\");",
    "assert(appVersion.includes('PROJECT_VERSION = \\\"0.1.0-milestone.31\\\"'), \"appVersion must expose milestone.31.\");",
    "assert(appVersion.includes('PROJECT_MILESTONE_LABEL = \\\"m31\\\"'), \"appVersion must expose m31 label.\");",
    "assert(readme.includes(\"docs/roadmap.md\"), \"README.md must link docs/roadmap.md.\");",
    "assert(readme.includes(\"docs/architecture_tracks.md\"), \"README.md must link docs/architecture_tracks.md.\");",
    "for (const token of [\"terrain/material track\", \"fluid-like field track\", \"morphology/entity editor track\", \"controller/brain track\", \"render/performance track\", \"worker/WebGPU track\"]) {",
    "  assert(roadmap.includes(token), \"roadmap missing track token: \" + token);",
    "}",
    "assert(architectureTracks.includes(\"renderer must not own authoritative simulation state\"), \"architecture tracks must preserve render boundary.\");",
    "assert(integrationM31.includes(\"roadmap architecture tracks\"), \"integration_m31 must describe roadmap architecture tracks.\");",
    "assert(packageJson.scripts[\"test:roadmap-status\"] === \"node scripts/test-roadmap-status.mjs\", \"package.json must expose test:roadmap-status.\");",
    "assert(packageJson.scripts.test.includes(\"test:roadmap-status\"), \"npm run test must include test:roadmap-status.\");",
    "console.log(\"roadmap status tests passed\");"
  ].join("\n") + "\n";
}

function read(relativePath) {
  return readFileSync(filePath(relativePath), "utf8");
}

function write(relativePath, text) {
  const target = filePath(relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, text, "utf8");
}

function remove(relativePath) {
  const target = filePath(relativePath);
  if (existsSync(target)) {
    rmSync(target, { force: true, recursive: true });
  }
}

function filePath(relativePath) {
  return isAbsolute(relativePath) ? relativePath : join(root, relativePath);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const branchName = "m31-roadmap-architecture-tracks";

main();

function main() {
  console.log("\n--- VERIFY BRANCH ---");
  const branch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
  if (branch !== branchName) throw new Error(`Expected branch ${branchName}, got ${branch}`);

  console.log("\n--- BACKUP TARGETS ---");
  const backupRoot = join(root, "docs", "_patch_backups", "m31_roadmap_architecture_tracks");
  mkdirSync(backupRoot, { recursive: true });
  for (const file of ["README.md", "package.json", "src/shared/appVersion.ts", "scripts/test-demo-integration.mjs", "docs/roadmap.md", "docs/architecture_tracks.md", "docs/integration_m31.md", "scripts/test-roadmap-status.mjs"]) {
    if (existsSync(path(file))) write(join(backupRoot, file.replaceAll("/", "__")), read(file));
  }

  console.log("\n--- RESTORE TRACKED TARGETS FROM HEAD ---");
  for (const file of ["README.md", "package.json", "src/shared/appVersion.ts", "scripts/test-demo-integration.mjs"]) {
    execFileSync("git", ["checkout", "HEAD", "--", file], { stdio: "inherit" });
  }
  remove("docs/roadmap.md");
  remove("docs/architecture_tracks.md");
  remove("docs/integration_m31.md");
  remove("scripts/test-roadmap-status.mjs");

  console.log("\n--- PATCH package/appVersion ---");
  const pkg = JSON.parse(read("package.json"));
  pkg.version = "0.1.0-milestone.31";
  pkg.scripts["test:roadmap-status"] = "node scripts/test-roadmap-status.mjs";
  if (!pkg.scripts.test.includes("npm run test:roadmap-status")) {
    const anchor = "npm run check:boundaries && npm run test:repo-status";
    if (!pkg.scripts.test.includes(anchor)) throw new Error("Missing package.json test chain anchor.");
    pkg.scripts.test = pkg.scripts.test.replace(anchor, "npm run check:boundaries && npm run test:repo-status && npm run test:roadmap-status");
  }
  write("package.json", `${JSON.stringify(pkg, null, 2)}\n`);
  write("src/shared/appVersion.ts", [
    'export const PROJECT_NAME = "qubok_evolve" as const;',
    'export const PROJECT_VERSION = "0.1.0-milestone.31" as const;',
    'export const PROJECT_MILESTONE = 31 as const;',
    'export const PROJECT_MILESTONE_LABEL = "m31" as const;'
  ].join("\n") + "\n");

  console.log("\n--- WRITE DOCS AND TEST ---");
  write("docs/roadmap.md", roadmap());
  write("docs/architecture_tracks.md", architectureTracks());
  write("docs/integration_m31.md", integration());
  write("scripts/test-roadmap-status.mjs", roadmapTest());

  console.log("\n--- PATCH README AND DEMO TEST ---");
  patchReadme();
  patchDemoIntegration();

  console.log("\n--- SANITY ---");
  sanity();
  console.log("\nPATCH COMPLETE: m31 roadmap architecture tracks patched. Run verify manually:\nnpm run test:roadmap-status\nnpm run test\nnpm run build\nnpm run bench:world-free-list\ngit status --short");
}

function patchReadme() {
  let text = read("README.md");
  text = text.replaceAll("0.1.0-milestone.30", "0.1.0-milestone.31").replaceAll("Current status: m30", "Current status: m31");
  if (!text.includes("docs/roadmap.md")) {
    text = text.replace("- `docs/milestones.md` â€” compact milestone index through m30.", "- `docs/milestones.md` â€” compact milestone index through m30.\n- `docs/roadmap.md` â€” development tracks after m31.\n- `docs/architecture_tracks.md` â€” boundary contracts for future work.");
  }
  write("README.md", text);
}

function patchDemoIntegration() {
  let text = read("scripts/test-demo-integration.mjs");
  text = text.replaceAll("0.1.0-milestone.30", "0.1.0-milestone.31").replaceAll("milestone.30", "milestone.31").replaceAll("m30", "m31");
  if (!text.includes('const roadmap = readText("docs/roadmap.md");')) {
    text = text.replace('const repoStatusTest = readText("scripts/test-repo-status.mjs");', 'const repoStatusTest = readText("scripts/test-repo-status.mjs");\nconst roadmap = readText("docs/roadmap.md");\nconst architectureTracks = readText("docs/architecture_tracks.md");\nconst roadmapStatusTest = readText("scripts/test-roadmap-status.mjs");');
  }
  const block = [
    'assert(readme.includes("0.1.0-milestone.31"), "README must expose the current m31 milestone version.");',
    'assert(readme.includes("docs/roadmap.md"), "README must link roadmap docs.");',
    'assert(roadmap.includes("terrain/material track"), "roadmap must include terrain/material track.");',
    'assert(roadmap.includes("controller/brain track"), "roadmap must include controller/brain track.");',
    'assert(architectureTracks.includes("renderer must not own authoritative simulation state"), "architecture tracks must preserve sim/render boundary.");',
    'assert(roadmapStatusTest.includes("docs/roadmap.md"), "roadmap status test must validate roadmap docs.");',
    'assert(packageJson.scripts["test:roadmap-status"] === "node scripts/test-roadmap-status.mjs", "package.json must expose test:roadmap-status.");',
    'assert(packageJson.scripts.test.includes("test:roadmap-status"), "npm run test must include roadmap status test.");'
  ].join("\n");
  if (!text.includes("README must link roadmap docs")) {
    text = text.replace('assert(packageJson.scripts.test.includes("test:repo-status"), "npm run test must include repo status test.");', 'assert(packageJson.scripts.test.includes("test:repo-status"), "npm run test must include repo status test.");\n' + block);
  }
  write("scripts/test-demo-integration.mjs", text);
}

function roadmap() {
  return `# qubok_evolve roadmap

Current status: m31 / 0.1.0-milestone.31.

This roadmap splits future work into independent architecture tracks so later milestones do not mix terrain, morphology, controller, renderer, worker, and WebGPU changes in one step.

## terrain/material track

Goal: turn the flat world into layered 2D terrain data without coupling terrain to rendering.

Near steps:
- terrain material grid with ids, friction, drag, resource affinity, and movement modifiers;
- terrain query API used by movement, sensors, spawning, and reproduction;
- debug snapshot for terrain fields.

Later research:
- signed distance field for obstacle boundaries;
- erosion/noise generation;
- biome-like resource distribution.

## fluid-like field track

Goal: add cheap 2D environmental flow fields for fish/bird/flocking-like behavior.

Near steps:
- low-resolution vector field sampled by agents;
- flow force integration separated from movement;
- debug render snapshot for field vectors.

Later research:
- diffusion/advection approximations;
- pressure-like local fields;
- field-driven resource transport.

## morphology/entity editor track

Goal: prepare entity phenotype/morphology data for a later editor without breaking the typed-array runtime.

Near steps:
- component schema for body parts, sensors, mouth, locomotion, armor, storage;
- compiler from component layout to runtime phenotype arrays;
- validation tests for component budgets and sensor/energy costs.

Later research:
- grid-based body editor;
- procedural creature silhouettes;
- part-level mutation.

## controller/brain track

Goal: introduce decision logic after sensing/morphology foundations are stable.

Near steps:
- minimal action vector contract;
- deterministic rule controller baseline;
- controller metrics and replay tests.

Later research:
- neural controller arrays;
- evolution of weights;
- behavior taxonomy debug views.

## render/performance track

Goal: keep visual debugging useful while entity counts grow.

Near steps:
- overlay grouping and toggles;
- render snapshot cost checks;
- chunk size/code-splitting follow-up for the current Vite warning.

Later research:
- instanced rendering alternatives;
- spatial culling;
- heatmap overlays.

## worker/WebGPU track

Goal: keep the main thread responsive only after the simulation contract is stable.

Near steps:
- serializable snapshot boundary review;
- worker transfer benchmark;
- deterministic replay guard.

Later research:
- Web Worker simulation loop;
- SharedArrayBuffer experiments;
- WebGPU compute feasibility pass.

## Track sequencing rule

Each future milestone should primarily touch one track. Cross-track work needs an integration doc explaining why the coupling is necessary.
`;
}

function architectureTracks() {
  return `# qubok_evolve architecture tracks

Current status: m31.

## Shared boundary rule

The simulation layer owns authoritative state. Render and UI layers consume snapshots and may not mutate runtime arrays directly.

PixiJS remains confined to src/render. Simulation modules under src/sim must stay renderer-agnostic.

## Track contracts

| Track | May touch | Must not touch |
|---|---|---|
| terrain/material | terrain data modules, movement/resource/sensor query integration, tests | Pixi internals except through snapshots |
| fluid-like field | field data modules, movement force inputs, field snapshots | entity lifecycle ownership |
| morphology/entity editor | schema/compiler/tests for phenotype data | direct DOM/Pixi editor coupling inside src/sim |
| controller/brain | action vector contract, controller modules, deterministic tests | renderer-owned decision state |
| render/performance | src/render, debug overlay, render snapshots, Vite/build config | authoritative simulation arrays |
| worker/WebGPU | transfer boundaries, worker adapters, compute experiments | nondeterministic mutation of main WorldState |

## Lifecycle contract

All runtime death paths still route through killAgent(world, index). Direct alive-zero writes outside src/sim/world.ts remain forbidden.

## Roadmap discipline

A milestone should name its primary track in the integration doc. If it spans tracks, the integration doc must list each touched boundary and its reason.

renderer must not own authoritative simulation state.
`;
}

function integration() {
  return `# m31 integration: roadmap architecture tracks

Milestone 31 creates roadmap and architecture-track documentation for the next phase after m30.

## Implementation

- docs/roadmap.md splits future work into terrain/material, fluid-like field, morphology/entity editor, controller/brain, render/performance, and worker/WebGPU tracks.
- docs/architecture_tracks.md defines per-track boundaries.
- README.md links roadmap and architecture-track docs.
- scripts/test-roadmap-status.mjs keeps README, roadmap, architecture docs, and package version synchronized.
- npm run test includes test:roadmap-status.

## Acceptance

- npm run test:roadmap-status
- npm run test
- npm run build
- npm run bench:world-free-list

## Explicitly not changed

- no simulation behavior changes
- no terrain implementation
- no controller/brain implementation
- no renderer refactor
- no worker/WebGPU migration
`;
}

function roadmapTest() {
  return `import { readFileSync } from "node:fs";
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
const integrationM31 = readText("docs/integration_m31.md");

assert(packageJson.version === "0.1.0-milestone.31", "package.json must expose m31 version.");
assert(appVersion.includes('PROJECT_VERSION = "0.1.0-milestone.31"'), "appVersion must expose milestone.31.");
assert(appVersion.includes('PROJECT_MILESTONE_LABEL = "m31"'), "appVersion must expose m31 label.");
assert(readme.includes("docs/roadmap.md"), "README.md must link docs/roadmap.md.");
assert(readme.includes("docs/architecture_tracks.md"), "README.md must link docs/architecture_tracks.md.");
for (const token of ["terrain/material track", "fluid-like field track", "morphology/entity editor track", "controller/brain track", "render/performance track", "worker/WebGPU track"]) {
  assert(roadmap.includes(token), "roadmap missing track token: " + token);
}
assert(architectureTracks.includes("renderer must not own authoritative simulation state"), "architecture tracks must preserve render boundary.");
assert(integrationM31.includes("roadmap architecture tracks"), "integration_m31 must describe roadmap architecture tracks.");
assert(packageJson.scripts["test:roadmap-status"] === "node scripts/test-roadmap-status.mjs", "package.json must expose test:roadmap-status.");
assert(packageJson.scripts.test.includes("test:roadmap-status"), "npm run test must include test:roadmap-status.");
console.log("roadmap status tests passed");
`;
}

function sanity() {
  for (const file of ["README.md", "docs/roadmap.md", "docs/architecture_tracks.md", "docs/integration_m31.md", "scripts/test-roadmap-status.mjs"]) {
    if (!existsSync(path(file))) throw new Error(`Missing generated file: ${file}`);
  }
  if (!read("package.json").includes("0.1.0-milestone.31")) throw new Error("package version sanity failed");
  if (!read("src/shared/appVersion.ts").includes("m31")) throw new Error("appVersion sanity failed");
}

function read(relativePath) { return readFileSync(path(relativePath), "utf8"); }
function write(relativePath, text) { const target = relativePath.includes(":\") ? relativePath : path(relativePath); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, text, "utf8"); }
function path(relativePath) { return join(root, relativePath); }
function remove(relativePath) { if (existsSync(path(relativePath))) rmSync(path(relativePath), { force: true, recursive: true }); }


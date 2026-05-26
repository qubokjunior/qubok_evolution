import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const projectRoot = process.cwd();
const expectedBranch = "m30-repo-status-sync";
const backupRoot = join(projectRoot, "docs", "_patch_backups", "m30_repo_status_sync");

main();

function main() {
  console.log("\n--- VERIFY BRANCH ---");
  const branch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
  if (branch !== expectedBranch) throw new Error(`Expected branch ${expectedBranch}, got ${branch}`);

  console.log("\n--- BACKUP CURRENT TARGETS ---");
  mkdirSync(backupRoot, { recursive: true });
  for (const file of [
    "README.md",
    "package.json",
    "src/shared/appVersion.ts",
    "scripts/test-demo-integration.mjs",
    "scripts/test-repo-status.mjs",
    "docs/world_state.md",
    "docs/milestones.md",
    "docs/integration_m30.md"
  ]) {
    if (existsSync(filePath(file))) {
      write(join(backupRoot, file.replaceAll("/", "__").replaceAll("\\", "__")), read(file));
    }
  }

  console.log("\n--- RESTORE TRACKED TARGETS FROM HEAD ---");
  for (const file of ["README.md", "package.json", "src/shared/appVersion.ts", "scripts/test-demo-integration.mjs", "docs/world_state.md"]) {
    execFileSync("git", ["checkout", "HEAD", "--", file], { stdio: "inherit" });
  }
  rmIfExists("scripts/test-repo-status.mjs");
  rmIfExists("docs/milestones.md");
  rmIfExists("docs/integration_m30.md");

  console.log("\n--- PATCH package.json ---");
  patchPackageJson();

  console.log("\n--- PATCH appVersion.ts ---");
  write("src/shared/appVersion.ts", [
    'export const PROJECT_NAME = "qubok_evolve" as const;',
    'export const PROJECT_VERSION = "0.1.0-milestone.30" as const;',
    'export const PROJECT_MILESTONE = 30 as const;',
    'export const PROJECT_MILESTONE_LABEL = "m30" as const;'
  ].join("\n"));

  console.log("\n--- WRITE README.md ---");
  write("README.md", readmeText());

  console.log("\n--- WRITE docs/milestones.md ---");
  write("docs/milestones.md", milestonesText());

  console.log("\n--- WRITE repo status test ---");
  write("scripts/test-repo-status.mjs", repoStatusTestText());

  console.log("\n--- PATCH demo integration test ---");
  patchDemoIntegrationTest();

  console.log("\n--- PATCH docs ---");
  patchDocs();

  console.log("\n--- SANITY TOKENS ---");
  sanityCheck();

  console.log(`\nPATCH COMPLETE: m30 repo status sync patched. Run verify manually:\nnpm run test:repo-status\nnpm run test\nnpm run build\nnpm run bench:world-free-list\ngit status --short`);
}

function patchPackageJson() {
  const json = JSON.parse(read("package.json"));
  json.version = "0.1.0-milestone.30";
  json.scripts["test:repo-status"] = "node scripts/test-repo-status.mjs";

  if (!json.scripts.test.includes("npm run test:repo-status")) {
    const anchor = "npm run check:boundaries && npm run test:rng";
    if (!json.scripts.test.includes(anchor)) throw new Error("Missing package.json test chain anchor for m30.");
    json.scripts.test = json.scripts.test.replace(anchor, "npm run check:boundaries && npm run test:repo-status && npm run test:rng");
  }

  write("package.json", `${JSON.stringify(json, null, 2)}\n`);
}

function patchDemoIntegrationTest() {
  let text = read("scripts/test-demo-integration.mjs");
  text = text
    .replaceAll("0.1.0-milestone.29", "0.1.0-milestone.30")
    .replaceAll("milestone.29", "milestone.30")
    .replaceAll("m29", "m30");

  if (!text.includes('const readme = readText("README.md");')) {
    text = text.replace(
      'const lifecyclePressureTest = readText("scripts/test-lifecycle-pressure.mjs");',
      'const lifecyclePressureTest = readText("scripts/test-lifecycle-pressure.mjs");\nconst readme = readText("README.md");\nconst milestones = readText("docs/milestones.md");\nconst repoStatusTest = readText("scripts/test-repo-status.mjs");'
    );
  }

  const block = [
    'assert(readme.includes("0.1.0-milestone.30"), "README must expose the current milestone version.");',
    'assert(readme.includes("docs/milestones.md"), "README must link the milestone index.");',
    'assert(milestones.includes("| m30 |"), "milestones index must include m30.");',
    'assert(repoStatusTest.includes("README.md"), "repo status test must validate README status sync.");',
    'assert(packageJson.scripts["test:repo-status"] === "node scripts/test-repo-status.mjs", "package.json must expose test:repo-status.");',
    'assert(packageJson.scripts.test.includes("test:repo-status"), "npm run test must include repo status test.");'
  ].join("\n");

  if (!text.includes("README must expose the current milestone version")) {
    text = text.replace(
      'assert(packageJson.scripts.test.includes("test:death-path-audit"), "npm run test must include death path audit.");',
      'assert(packageJson.scripts.test.includes("test:death-path-audit"), "npm run test must include death path audit.");\n' + block
    );
  }

  write("scripts/test-demo-integration.mjs", text);
}

function patchDocs() {
  write("docs/integration_m30.md", [
    "# m30 integration: repository status sync",
    "",
    "Milestone 30 updates the repository landing surface so it matches the real runtime status after m26-m29.",
    "",
    "## Problem fixed",
    "",
    "The top-level README still described milestone 1, even though the codebase is now at m30. That made GitHub's main page materially stale.",
    "",
    "## Implementation",
    "",
    "- README.md now identifies the current version as 0.1.0-milestone.30 / m30.",
    "- docs/milestones.md provides a compact milestone index.",
    "- scripts/test-repo-status.mjs verifies package/appVersion/README/docs status sync.",
    "- npm run test now includes test:repo-status.",
    "",
    "## Acceptance",
    "",
    "- npm run test:repo-status",
    "- npm run test",
    "- npm run build",
    "- npm run bench:world-free-list",
    "",
    "## Explicitly not changed",
    "",
    "- no simulation behavior changes",
    "- no renderer changes",
    "- no terrain editor",
    "- no controller/brain",
    "- no worker migration"
  ].join("\n"));

  let worldDoc = read("docs/world_state.md");
  const section = [
    "## m30 repository status note",
    "",
    "Milestone 30 does not change WorldState behavior. It updates README/status documentation and adds repo-status tests so the repository landing page tracks the actual milestone/version after the lifecycle free-list work."
  ].join("\n");
  if (!worldDoc.includes("## m30 repository status note")) {
    worldDoc = `${worldDoc.trimEnd()}\n\n${section}\n`;
  }
  write("docs/world_state.md", worldDoc);
}

function repoStatusTestText() {
  return [
    'import { readFileSync } from "node:fs";',
    'import { dirname, resolve } from "node:path";',
    'import { fileURLToPath } from "node:url";',
    '',
    'const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");',
    'const readText = (relativePath) => readFileSync(resolve(projectRoot, relativePath), "utf8");',
    'const assert = (condition, message) => { if (!condition) throw new Error(message); };',
    '',
    'const packageJson = JSON.parse(readText("package.json"));',
    'const appVersion = readText("src/shared/appVersion.ts");',
    'const readme = readText("README.md");',
    'const milestones = readText("docs/milestones.md");',
    'const integrationM30 = readText("docs/integration_m30.md");',
    '',
    'assert(packageJson.version === "0.1.0-milestone.30", "package.json must expose 0.1.0-milestone.30.");',
    'assert(appVersion.includes("PROJECT_VERSION = \\"0.1.0-milestone.30\\""), "appVersion must expose milestone.30.");',
    'assert(appVersion.includes("PROJECT_MILESTONE = 30"), "appVersion must expose milestone number 30.");',
    'assert(appVersion.includes("PROJECT_MILESTONE_LABEL = \\"m30\\""), "appVersion must expose m30 label.");',
    'assert(readme.includes("0.1.0-milestone.30"), "README.md must expose current milestone version.");',
    'assert(readme.includes("Current status: m30"), "README.md must expose current status m30.");',
    'assert(readme.includes("docs/milestones.md"), "README.md must point to milestone index.");',
    'assert(!readme.includes("## Milestone 1"), "README.md must not be frozen at Milestone 1.");',
    'assert(!readme.includes("Not implemented yet:"), "README.md must not contain stale m1 not-implemented block.");',
    'for (const marker of ["| m26 |", "| m27 |", "| m28 |", "| m29 |", "| m30 |"]) {',
    '  assert(milestones.includes(marker), `docs/milestones.md missing milestone marker: ${marker}`);',
    '}',
    'assert(integrationM30.includes("repository status sync"), "integration_m30 must describe repo status sync.");',
    'assert(packageJson.scripts["test:repo-status"] === "node scripts/test-repo-status.mjs", "package.json must expose test:repo-status.");',
    'assert(packageJson.scripts.test.includes("test:repo-status"), "npm run test must include test:repo-status.");',
    '',
    'console.log("repo status tests passed");'
  ].join("\n");
}

function readmeText() {
  return [
    "# qubok_evolve",
    "",
    "High-performance realtime 2D artificial-life ecosystem simulator.",
    "",
    "Current status: m30 / 0.1.0-milestone.30.",
    "",
    "## What exists now",
    "",
    "qubok_evolve is now a deterministic, data-oriented 2D artificial-life runtime, not just a renderer scaffold. The simulation state lives in typed arrays under `src/sim`, the PixiJS renderer consumes read-only snapshots under `src/render`, and milestone work is validated with small Node-based tests and benchmarks.",
    "",
    "Implemented runtime foundations:",
    "",
    "- typed-array `WorldState` with deterministic spawning, lifecycle counters, phenotype fields, sector sensor buffers, and lineage fields;",
    "- movement integration with force accumulation, drag, speed clamp, heading update, bounds modes, and movement energy cost;",
    "- spatial hash and local neighbor sampling;",
    "- resource layer with pickup, respawn, and obstacle-aware placement;",
    "- energy/starvation survival loop;",
    "- reproduction with phenotype mutation and obstacle-aware offspring placement;",
    "- predator/prey interaction with diet masks, damage, armor, kills, and energy transfer;",
    "- fixed-width sector sensors for allies, threats, food, and obstacles;",
    "- obstacle mask used by sensing, soft movement response, spawn validation, lifecycle telemetry, and debug rendering;",
    "- free-list dead-slot reuse so death creates structural room for future births;",
    "- live performance/debug overlay including obstacle and world-slot telemetry;",
    "- static tests guarding architecture boundaries, repo status, and lifecycle death routing.",
    "",
    "## Current lifecycle contract",
    "",
    "All runtime death paths must call `killAgent(world, index)`. Direct `alive[index] = 0` writes outside `src/sim/world.ts` are blocked by `npm run test:death-path-audit`, because direct writes bypass the reusable-slot free-list introduced in m26.",
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
    "- `docs/world_state.md` — typed-array world state and lifecycle slot contract.",
    "- `docs/integration_m30.md` — current repo-status sync milestone.",
    "",
    "## Boundary rule",
    "",
    "PixiJS is allowed in `src/render/` only. The simulation layer must remain renderer-agnostic. The renderer reads immutable snapshots and must not own authoritative simulation state."
  ].join("\n");
}

function milestonesText() {
  return [
    "# qubok_evolve milestones",
    "",
    "Compact milestone index through m30. Older early milestones are summarized at the system level; recent lifecycle milestones are listed with stricter implementation detail.",
    "",
    "| Milestone | Focus | Status |",
    "|---|---|---|",
    "| m1 | Vite + TypeScript scaffold, Pixi render boundary, dark canvas, basic performance overlay, architecture docs. | complete |",
    "| m2 | Deterministic random utilities and early runtime validation groundwork. | complete |",
    "| m3 | Typed-array world state foundation and spawn/snapshot basics. | complete |",
    "| m4 | Movement integration foundation. | complete |",
    "| m5 | Spatial hash locality foundation. | complete |",
    "| m6 | Neighbor query and local sampling groundwork. | complete |",
    "| m7 | Resource layer foundation. | complete |",
    "| m8 | Render snapshot boundary and read-only sim-to-render bridge. | complete |",
    "| m9 | Energy/survival loop foundation. | complete |",
    "| m10 | Reproduction foundation. | complete |",
    "| m11 | Phenotype mutation rules and mutation tests/benchmarks. | complete |",
    "| m12 | Predator/prey interaction foundation. | complete |",
    "| m13 | Sensor pass foundation with fixed-width sector channels. | complete |",
    "| m14 | Demo integration hardening across sim subsystems. | complete |",
    "| m15 | Runtime/render integration and build/test stabilization. | complete |",
    "| m16 | Demo simulation integration version visible in render snapshot tests. | complete |",
    "| m17 | Additional subsystem benchmark/test coverage. | complete |",
    "| m18 | Obstacle mask foundation. | complete |",
    "| m19 | Obstacle soft movement response. | complete |",
    "| m20 | Obstacle-aware spawn validation. | complete |",
    "| m21 | Resource respawn with obstacle avoidance. | complete |",
    "| m22 | Reproduction placement with obstacle validation. | complete |",
    "| m23 | Obstacle-aware sensors and lifecycle-adjacent integration. | complete |",
    "| m24 | Obstacle lifecycle telemetry. | complete |",
    "| m25 | Obstacle debug render snapshot and Pixi overlay layer. | complete |",
    "| m26 | World dead-slot free-list reuse. | complete |",
    "| m27 | Live world slot telemetry in metrics/debug overlay. | complete |",
    "| m28 | Controlled lifecycle pressure scenario validating death -> reusable slot -> birth. | complete |",
    "| m29 | Death-path audit guarding against direct alive-zero writes outside world.ts. | complete |",
    "| m30 | README/status sync, milestone index, and repo-status test. | complete |",
    "",
    "## Current next-step candidates",
    "",
    "- m31: README-backed roadmap split for terrain/editor/controller research tracks.",
    "- m31 alternative: obstacle visibility controls or render caching if runtime polish is preferred.",
    "- Later: terrain material grid, signed-distance-field correction, field transport, controller/brain layer, morphology compiler/editor, workerization, and WebGPU experiments."
  ].join("\n");
}

function sanityCheck() {
  const packageJson = read("package.json");
  const appVersion = read("src/shared/appVersion.ts");
  const readme = read("README.md");
  const milestones = read("docs/milestones.md");
  const repoStatus = read("scripts/test-repo-status.mjs");
  const demoTest = read("scripts/test-demo-integration.mjs");
  const integration = read("docs/integration_m30.md");

  assert(packageJson.includes('"version": "0.1.0-milestone.30"'), "package version sanity failed");
  assert(packageJson.includes('"test:repo-status": "node scripts/test-repo-status.mjs"'), "repo status script sanity failed");
  assert(appVersion.includes('PROJECT_VERSION = "0.1.0-milestone.30"'), "appVersion sanity failed");
  assert(appVersion.includes('PROJECT_MILESTONE_LABEL = "m30"'), "appVersion label sanity failed");
  assert(readme.includes("Current status: m30"), "README current status sanity failed");
  assert(readme.includes("docs/milestones.md"), "README docs link sanity failed");
  assert(milestones.includes("| m30 |"), "milestones m30 sanity failed");
  assert(repoStatus.includes("README.md"), "repo status test sanity failed");
  assert(demoTest.includes("README must expose the current milestone version"), "demo integration README sanity failed");
  assert(integration.includes("repository status sync"), "integration m30 sanity failed");
}

function read(relativePath) {
  return readFileSync(filePath(relativePath), "utf8");
}

function write(relativePathOrAbsolute, text) {
  const absolutePath = resolvePath(relativePathOrAbsolute);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, text.endsWith("\n") ? text : `${text}\n`, "utf8");
}

function rmIfExists(relativePath) {
  const absolutePath = filePath(relativePath);
  if (existsSync(absolutePath)) rmSync(absolutePath, { force: true, recursive: true });
}

function filePath(relativePath) {
  return join(projectRoot, relativePath);
}

function resolvePath(relativePathOrAbsolute) {
  return resolve(relativePathOrAbsolute) === relativePathOrAbsolute ? relativePathOrAbsolute : filePath(relativePathOrAbsolute);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

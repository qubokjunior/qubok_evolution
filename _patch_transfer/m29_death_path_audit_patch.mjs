import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const projectRoot = process.cwd();
const expectedBranch = "m29-death-path-audit";
const backupRoot = join(projectRoot, "docs", "_patch_backups", "m29_death_path_audit");

main();

function main() {
  console.log("\n--- VERIFY BRANCH ---");
  const branch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
  if (branch !== expectedBranch) {
    throw new Error(`Expected branch ${expectedBranch}, got ${branch}`);
  }

  console.log("\n--- BACKUP CURRENT TARGETS ---");
  mkdirSync(backupRoot, { recursive: true });
  for (const file of [
    "package.json",
    "src/shared/appVersion.ts",
    "scripts/test-demo-integration.mjs",
    "docs/world_state.md",
    "docs/integration_m29.md",
    "scripts/test-death-path-audit.mjs"
  ]) {
    const absolute = filePath(file);
    if (existsSync(absolute)) {
      write(join(backupRoot, file.replaceAll("/", "__").replaceAll("\\", "__")), read(file));
    }
  }

  console.log("\n--- RESTORE TRACKED TARGETS FROM HEAD ---");
  for (const file of [
    "package.json",
    "src/shared/appVersion.ts",
    "scripts/test-demo-integration.mjs",
    "docs/world_state.md"
  ]) {
    execFileSync("git", ["checkout", "HEAD", "--", file], { stdio: "inherit" });
  }
  rmIfExists("docs/integration_m29.md");
  rmIfExists("scripts/test-death-path-audit.mjs");

  console.log("\n--- PATCH package.json ---");
  patchPackageJson();

  console.log("\n--- PATCH appVersion.ts ---");
  write("src/shared/appVersion.ts", `export const PROJECT_NAME = "qubok_evolve" as const;
export const PROJECT_VERSION = "0.1.0-milestone.29" as const;
export const PROJECT_MILESTONE = 29 as const;
export const PROJECT_MILESTONE_LABEL = "m29" as const;`);

  console.log("\n--- WRITE death path audit test ---");
  write("scripts/test-death-path-audit.mjs", deathPathAuditTestText());

  console.log("\n--- PATCH demo integration test ---");
  patchDemoIntegrationTest();

  console.log("\n--- PATCH docs ---");
  patchDocs();

  console.log("\n--- SANITY TOKENS ---");
  sanityCheck();

  console.log(`
PATCH COMPLETE: m29 death-path audit patched. Run verify manually:
npm run test:death-path-audit
npm run test
npm run build
npm run bench:world-free-list
git status --short`);
}

function patchPackageJson() {
  const json = JSON.parse(read("package.json"));
  json.version = "0.1.0-milestone.29";
  json.scripts["test:death-path-audit"] = "node scripts/test-death-path-audit.mjs";

  const oldNeedle =
    "npm run test:lifecycle-pressure && npm run test:movement";
  const newNeedle =
    "npm run test:lifecycle-pressure && npm run test:death-path-audit && npm run test:movement";

  if (!json.scripts.test.includes("npm run test:death-path-audit")) {
    if (!json.scripts.test.includes(oldNeedle)) {
      throw new Error("Could not find package.json test chain anchor for m29.");
    }
    json.scripts.test = json.scripts.test.replace(oldNeedle, newNeedle);
  }

  write("package.json", `${JSON.stringify(json, null, 2)}\n`);
}

function patchDemoIntegrationTest() {
  let text = read("scripts/test-demo-integration.mjs");

  text = text
    .replaceAll("0.1.0-milestone.28", "0.1.0-milestone.29")
    .replaceAll("milestone.28", "milestone.29")
    .replaceAll("m28", "m29");

  if (!text.includes('const deathPathAuditTest = readText("scripts/test-death-path-audit.mjs");')) {
    text = text.replace(
      'const lifecyclePressureTest = readText("scripts/test-lifecycle-pressure.mjs");',
      'const lifecyclePressureTest = readText("scripts/test-lifecycle-pressure.mjs");\nconst deathPathAuditTest = readText("scripts/test-death-path-audit.mjs");'
    );
  }

  const m29Block = `
assert(deathPathAuditTest.includes("direct alive-zero writes"), "death path audit must scan direct alive-zero writes.");
assert(deathPathAuditTest.includes("energy.ts must route death through killAgent"), "death path audit must lock energy death routing.");
assert(deathPathAuditTest.includes("predatorPrey.ts must route kills through killAgent"), "death path audit must lock predator/prey kill routing.");
assert(packageJson.scripts["test:death-path-audit"] === "node scripts/test-death-path-audit.mjs", "package.json must expose test:death-path-audit.");
assert(packageJson.scripts.test.includes("test:death-path-audit"), "npm run test must include death path audit.");
`;

  if (!text.includes("deathPathAuditTest.includes")) {
    text = text.replace(
      'assert(lifecyclePressureTest.includes("death -> reusable slot -> birth"), "lifecycle pressure test must document the m29 loop.");',
      'assert(lifecyclePressureTest.includes("death -> reusable slot -> birth"), "lifecycle pressure test must document the m29 loop.");\n' + m29Block.trim()
    );
  }

  write("scripts/test-demo-integration.mjs", text);
}

function patchDocs() {
  write("docs/integration_m29.md", `# m29 integration: death-path consistency audit

Milestone 29 hardens the lifecycle contract introduced by m26 and exercised by m28.

## Problem guarded

After free-list slot reuse exists, a runtime system must not kill agents by writing directly to \`world.alive[index] = 0\`.

Direct alive-zero writes bypass \`killAgent(world, index)\`, so the dead slot would not enter \`reusableSlots\`. That reintroduces the old append-only capacity failure under a different form.

## Implementation

m29 adds \`scripts/test-death-path-audit.mjs\`.

The test scans \`src/sim/*.ts\` for direct alive-zero writes outside \`src/sim/world.ts\`.

Allowed:

- \`src/sim/world.ts\`, where \`killAgent()\` owns the low-level alive bit write.

Forbidden in runtime systems:

- \`world.alive[index] = 0\`
- \`someWorld.alive[targetIndex] = 0\`
- local \`alive[index] = 0\` death shortcuts outside the world module.

The test also verifies that the two known runtime death paths still call \`killAgent()\`:

- energy starvation death in \`energy.ts\`
- predator/prey kills in \`predatorPrey.ts\`

## Acceptance

- \`npm run test:death-path-audit\`
- \`npm run test\`
- \`npm run build\`
- \`npm run bench:world-free-list\`

## Explicitly not changed

- no new biology
- no controller/brain
- no terrain editor
- no pathfinding
- no renderer refactor
- no worker migration
- no world compaction
`);

  let worldDoc = read("docs/world_state.md");
  const section = `
## m29 death-path audit

Milestone 29 adds a static lifecycle guard: runtime systems outside \`src/sim/world.ts\` may not write \`alive[index] = 0\` directly.

All death paths must route through \`killAgent(world, index)\`, because \`killAgent()\` is now responsible for both:

1. flipping the alive bit;
2. adding the dead slot to \`reusableSlots\` exactly once.

This protects the m26 free-list contract from future systems that might otherwise bypass reusable slot creation.
`;

  if (!worldDoc.includes("## m29 death-path audit")) {
    worldDoc = `${worldDoc.trimEnd()}\n\n${section.trim()}\n`;
  }

  write("docs/world_state.md", worldDoc);
}

function deathPathAuditTestText() {
  return `import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const simRoot = resolve(projectRoot, "src", "sim");

const allowedDirectAliveZeroFiles = new Set(["world.ts"]);

const directAliveZeroPatterns = [
  /\\b[a-zA-Z_$][\\w$]*(?:\\.[a-zA-Z_$][\\w$]*)*\\.alive\\s*\\[[^\\]]+\\]\\s*=\\s*0\\b/g,
  /\\balive\\s*\\[[^\\]]+\\]\\s*=\\s*0\\b/g
];

const violations = [];

for (const absolutePath of listTypeScriptFiles(simRoot)) {
  const relativePath = absolutePath.slice(projectRoot.length + 1).replaceAll("\\\\", "/");
  const fileName = basename(absolutePath);

  if (allowedDirectAliveZeroFiles.has(fileName)) {
    continue;
  }

  const source = stripComments(readFileSync(absolutePath, "utf8"));

  for (const pattern of directAliveZeroPatterns) {
    for (const match of source.matchAll(pattern)) {
      const location = getLineColumn(source, match.index ?? 0);
      violations.push({
        file: relativePath,
        line: location.line,
        column: location.column,
        text: match[0]
      });
    }
  }
}

if (violations.length > 0) {
  const formatted = violations
    .map((violation) => {
      return \`\${violation.file}:\${violation.line}:\${violation.column} direct alive-zero write: \${violation.text}\`;
    })
    .join("\\n");

  throw new Error(
    \`Found direct alive-zero writes outside world.ts. Runtime death paths must call killAgent(world, index).\\n\${formatted}\`
  );
}

const worldSource = readText("src/sim/world.ts");
const energySource = readText("src/sim/energy.ts");
const predatorPreySource = readText("src/sim/predatorPrey.ts");

assert(worldSource.includes("export function killAgent"), "world.ts must expose killAgent.");
assert(worldSource.includes("reusableSlotCount"), "world.ts must own reusable slot state.");
assert(energySource.includes("killAgent(world, index)"), "energy.ts must route death through killAgent.");
assert(predatorPreySource.includes("killAgent(world, preyIndex)"), "predatorPrey.ts must route kills through killAgent.");

console.log("death path audit tests passed");

function listTypeScriptFiles(root) {
  const files = [];

  for (const entry of readdirSync(root)) {
    const absolutePath = join(root, entry);
    const stat = statSync(absolutePath);

    if (stat.isDirectory()) {
      files.push(...listTypeScriptFiles(absolutePath));
      continue;
    }

    if (entry.endsWith(".ts")) {
      files.push(absolutePath);
    }
  }

  return files;
}

function readText(relativePath) {
  return readFileSync(resolve(projectRoot, relativePath), "utf8");
}

function stripComments(source) {
  return source
    .replace(/\/\\*[\\s\\S]*?\\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function getLineColumn(source, index) {
  const prefix = source.slice(0, index);
  const lines = prefix.split("\\n");
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
`;
}

function sanityCheck() {
  const packageJson = read("package.json");
  const appVersion = read("src/shared/appVersion.ts");
  const demoTest = read("scripts/test-demo-integration.mjs");
  const auditTest = read("scripts/test-death-path-audit.mjs");
  const integrationDoc = read("docs/integration_m29.md");
  const worldDoc = read("docs/world_state.md");

  assert(packageJson.includes('"version": "0.1.0-milestone.29"'), "package version sanity failed");
  assert(packageJson.includes('"test:death-path-audit": "node scripts/test-death-path-audit.mjs"'), "death audit script sanity failed");
  assert(packageJson.includes("test:death-path-audit"), "test chain sanity failed");
  assert(appVersion.includes('PROJECT_VERSION = "0.1.0-milestone.29"'), "appVersion version sanity failed");
  assert(appVersion.includes('PROJECT_MILESTONE_LABEL = "m29"'), "appVersion label sanity failed");
  assert(demoTest.includes("deathPathAuditTest"), "demo integration audit token sanity failed");
  assert(auditTest.includes("direct alive-zero writes"), "audit test scan token sanity failed");
  assert(auditTest.includes("energy.ts must route death through killAgent"), "audit test energy token sanity failed");
  assert(auditTest.includes("predatorPrey.ts must route kills through killAgent"), "audit test predator token sanity failed");
  assert(integrationDoc.includes("death-path consistency audit"), "integration doc sanity failed");
  assert(worldDoc.includes("m29 death-path audit"), "world doc sanity failed");
}

function replaceOnce(text, search, replacement, label) {
  if (!text.includes(search)) {
    throw new Error(`Missing patch anchor: ${label}`);
  }

  return text.replace(search, replacement);
}

function read(relativePath) {
  return readFileSync(filePath(relativePath), "utf8");
}

function write(relativePathOrAbsolute, text) {
  const absolutePath = resolvePath(relativePathOrAbsolute);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, text, "utf8");
}

function rmIfExists(relativePath) {
  const absolutePath = filePath(relativePath);
  if (existsSync(absolutePath)) {
    rmSync(absolutePath, { force: true, recursive: true });
  }
}

function filePath(relativePath) {
  return join(projectRoot, relativePath);
}

function resolvePath(relativePathOrAbsolute) {
  return resolve(relativePathOrAbsolute) === relativePathOrAbsolute
    ? relativePathOrAbsolute
    : filePath(relativePathOrAbsolute);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

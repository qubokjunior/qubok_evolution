import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = relativePath => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const debugOverlay = readText("src/render/debugOverlay.ts");
const styles = readText("src/styles.css");
const docs = readText("docs/integration_m45.md");

for (const token of ["DEFAULT_OPEN_GROUPS", "\"runtime\"", "\"field\"", "qubok_evolve-perf-group-body", "body.hidden", "dataset.collapsed", "heading.addEventListener(\"click\""]) {
  assert(debugOverlay.includes(token), "debugOverlay missing collapsible overlay token: " + token);
}

for (const token of [".qubok_evolve-perf-group-title::before", "content: \"▾\"", "content: \"▸\"", ".qubok_evolve-perf-group-body[hidden]"]) {
  assert(styles.includes(token), "styles missing collapsible overlay CSS: " + token);
}

assert(docs.includes("M45-G1"), "integration_m45 must document M45-G1.");
assert(packageJson.scripts["test:overlay-collapse"] === "node scripts/test-overlay-collapse.mjs", "package.json must expose test:overlay-collapse.");
assert(packageJson.scripts.test.includes("test:overlay-collapse"), "npm run test must include test:overlay-collapse.");
console.log("overlay collapse tests passed");

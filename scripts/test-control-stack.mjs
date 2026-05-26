import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = relativePath => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const app = readText("src/ui/App.ts");
const styles = readText("src/styles.css");
const docs = readText("docs/integration_m45.md");

for (const token of ["qubok_evolve-control-stack", "shell.append(canvasHost, overlayHost, controlStack)", "createFieldDampingControlPanel(controlStack", "createFieldVisualDebugPanel(controlStack", "createDebugLayoutPanel(controlStack"]) {
  assert(app.includes(token), "App missing control stack token: " + token);
}

for (const token of [".qubok_evolve-control-stack", "flex-direction: column", "overflow: hidden auto", "pointer-events: none", "position: relative", "flex: 0 0 auto"]) {
  assert(styles.includes(token), "styles missing control stack token: " + token);
}

assert(!styles.includes("top: 420px"), "visual debug panel must not use fixed top offset.");
assert(!styles.includes("top: 720px"), "layout panel must not use fixed top offset.");
assert(docs.includes("M45-I1"), "integration_m45 must document M45-I1.");
assert(packageJson.scripts["test:control-stack"] === "node scripts/test-control-stack.mjs", "package.json must expose test:control-stack.");
assert(packageJson.scripts.test.includes("test:control-stack"), "npm run test must include test:control-stack.");

console.log("control stack tests passed");

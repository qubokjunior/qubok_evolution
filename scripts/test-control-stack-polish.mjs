import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = relativePath => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const primitives = readText("src/ui/controlPanelPrimitives.ts");
const debugLayoutPanel = readText("src/ui/debugLayoutPanel.ts");
const styles = readText("src/styles.css");
const docs = readText("docs/integration_m45.md");

for (const token of ["defaultCollapsed", "initialCollapsed", "storedCollapsed ?? options.defaultCollapsed ?? false"]) {
  assert(primitives.includes(token), "controlPanelPrimitives missing default collapse token: " + token);
}

assert(debugLayoutPanel.includes("defaultCollapsed: true"), "debug layout panel should start collapsed by default.");
for (const token of ["gap: 6px", "padding-bottom: 2px", "max-width: calc(100vw - 32px)", ".qubok_evolve-control-stack:hover"]) {
  assert(styles.includes(token), "styles missing stack polish token: " + token);
}

assert(docs.includes("M45-I2"), "integration_m45 must document M45-I2.");
assert(packageJson.scripts["test:control-stack-polish"] === "node scripts/test-control-stack-polish.mjs", "package.json must expose test:control-stack-polish.");
assert(packageJson.scripts.test.includes("test:control-stack-polish"), "npm run test must include test:control-stack-polish.");

console.log("control stack polish tests passed");

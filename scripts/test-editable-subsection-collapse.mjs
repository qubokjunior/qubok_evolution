import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = relativePath => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const primitives = readText("src/ui/controlPanelPrimitives.ts");
const styles = readText("src/styles.css");
const docs = readText("docs/integration_m45.md");

for (const token of ["createControlSubsection", "qubok_evolve-control-subsection-body", "toggleSubsectionCollapsed", "body.hidden", "aria-expanded", "title.addEventListener(\"click\"", "keydown"]) {
  assert(primitives.includes(token), "controlPanelPrimitives missing collapsible subsection token: " + token);
}

for (const token of [".qubok_evolve-control-subsection-title::before", "content: \"▾\"", "content: \"▸\"", ".qubok_evolve-control-subsection-body[hidden]"]) {
  assert(styles.includes(token), "styles missing collapsible subsection CSS token: " + token);
}

assert(docs.includes("M45-H5"), "integration_m45 must document M45-H5.");
assert(packageJson.scripts["test:editable-subsection-collapse"] === "node scripts/test-editable-subsection-collapse.mjs", "package.json must expose test:editable-subsection-collapse.");
assert(packageJson.scripts.test.includes("test:editable-subsection-collapse"), "npm run test must include test:editable-subsection-collapse.");

console.log("editable subsection collapse tests passed");

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

for (const token of ["qubok_evolve-control-resize-handle", "attachHorizontalResize", "pointerdown", "pointermove", "setPointerCapture", "startWidth + (startX - moveEvent.clientX)", "resizeStorageKey", "readStoredPanelWidth", "localStorage.setItem", "minWidth", "maxWidth"]) {
  assert(primitives.includes(token), "controlPanelPrimitives missing resize token: " + token);
}

for (const token of [".qubok_evolve-control-resize-handle", "cursor: ew-resize", "touch-action: none", "data-resizing"]) {
  assert(styles.includes(token), "styles missing resize CSS token: " + token);
}

assert(docs.includes("M45-H3"), "integration_m45 must document M45-H3.");
assert(packageJson.scripts["test:editable-panel-resize"] === "node scripts/test-editable-panel-resize.mjs", "package.json must expose test:editable-panel-resize.");
assert(packageJson.scripts.test.includes("test:editable-panel-resize"), "npm run test must include test:editable-panel-resize.");

console.log("editable panel resize tests passed");

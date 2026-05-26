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

for (const token of ["PERF_OVERLAY_WIDTH_STORAGE_KEY", "qubok_evolve-perf-resize-handle", "attachPerfOverlayHorizontalResize", "pointerdown", "pointermove", "setPointerCapture", "startWidth + (moveEvent.clientX - startX)", "readStoredPerfOverlayWidth", "localStorage.setItem", "PERF_OVERLAY_MIN_WIDTH", "PERF_OVERLAY_MAX_WIDTH"]) {
  assert(debugOverlay.includes(token), "debugOverlay missing overlay resize token: " + token);
}

for (const token of [".qubok_evolve-perf-resize-handle", "cursor: ew-resize", "touch-action: none", "data-resizing", "position: relative"]) {
  assert(styles.includes(token), "styles missing overlay resize CSS token: " + token);
}

assert(docs.includes("M45-H4"), "integration_m45 must document M45-H4.");
assert(packageJson.scripts["test:overlay-resize"] === "node scripts/test-overlay-resize.mjs", "package.json must expose test:overlay-resize.");
assert(packageJson.scripts.test.includes("test:overlay-resize"), "npm run test must include test:overlay-resize.");

console.log("overlay resize tests passed");

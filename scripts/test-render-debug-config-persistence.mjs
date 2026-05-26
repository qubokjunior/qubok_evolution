import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = relativePath => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const persistence = readText("src/render/renderDebugConfigPersistence.ts");
const pixiRenderer = readText("src/render/pixiRenderer.ts");
const app = readText("src/ui/App.ts");
const debugLayoutPanel = readText("src/ui/debugLayoutPanel.ts");
const docs = readText("docs/integration_m45.md");

for (const token of ["RENDER_DEBUG_CONFIG_STORAGE_KEY", "loadStoredRenderDebugConfig", "saveRenderDebugConfig", "clearStoredRenderDebugConfig", "BOOLEAN_KEYS", "NUMBER_KEYS", "makeRenderDebugConfig", "localStorage.getItem", "localStorage.setItem"]) {
  assert(persistence.includes(token), "renderDebugConfigPersistence missing token: " + token);
}

for (const token of ["onRenderDebugConfigChange?:", "options.onRenderDebugConfigChange?.(renderDebugConfig)"]) {
  assert(pixiRenderer.includes(token), "pixiRenderer missing render debug persistence hook: " + token);
}

for (const token of ["loadStoredRenderDebugConfig", "saveRenderDebugConfig", "initialRenderDebugConfig", "onRenderDebugConfigChange: saveRenderDebugConfig"]) {
  assert(app.includes(token), "App missing render debug persistence token: " + token);
}

for (const token of ["clearStoredRenderDebugConfig", "reset layout + render config"]) {
  assert(debugLayoutPanel.includes(token), "debugLayoutPanel missing render debug reset token: " + token);
}

assert(docs.includes("M45-J3"), "integration_m45 must document M45-J3.");
assert(packageJson.scripts["test:render-debug-config-persistence"] === "node scripts/test-render-debug-config-persistence.mjs", "package.json must expose test:render-debug-config-persistence.");
assert(packageJson.scripts.test.includes("test:render-debug-config-persistence"), "npm run test must include test:render-debug-config-persistence.");

console.log("render debug config persistence tests passed");

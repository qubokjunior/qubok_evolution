import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tmpDir = resolve(projectRoot, ".tmp_render_debug_config_test");
const readText = (relativePath) => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

rmSync(tmpDir, { recursive: true, force: true });
mkdirSync(tmpDir, { recursive: true });

const source = readText("src/render/renderDebugConfig.ts");
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
    strict: true
  }
}).outputText;
writeFileSync(resolve(tmpDir, "renderDebugConfig.mjs"), output);

const mod = await import(resolve(tmpDir, "renderDebugConfig.mjs").href ?? `file://${resolve(tmpDir, "renderDebugConfig.mjs")}`);

assert(source.includes("RENDER_DEBUG_CONFIG_VERSION"), "render debug config must expose version token.");
assert(source.includes("DEFAULT_RENDER_DEBUG_CONFIG"), "render debug config must expose defaults.");
assert(source.includes("makeRenderDebugConfig"), "render debug config must expose factory.");
assert(source.includes("toggleRenderDebugLayer"), "render debug config must expose layer toggle helper.");

const defaults = mod.DEFAULT_RENDER_DEBUG_CONFIG;
assert(defaults.showGrid === true, "grid should be visible by default.");
assert(defaults.showTerrainLayer === true, "terrain should be visible by default.");
assert(defaults.showObstacleLayer === true, "obstacles should be visible by default.");
assert(defaults.showFieldVectorLayer === true, "field vectors should be visible by default.");
assert(defaults.showAgents === true, "agents should be visible by default.");
assert(defaults.fieldVectorAlpha === 0.34, "fieldVectorAlpha default mismatch.");
assert(defaults.fieldVectorScale === 3.2, "fieldVectorScale default mismatch.");
assert(defaults.fieldVectorStride === 2, "fieldVectorStride default mismatch.");
assert(defaults.fieldVectorMinMagnitude === 0.05, "fieldVectorMinMagnitude default mismatch.");

const patched = mod.makeRenderDebugConfig({ showGrid: false, fieldVectorAlpha: 8, fieldVectorStride: 2.6, fieldVectorMinMagnitude: -4 });
assert(patched.showGrid === false, "patch should override showGrid.");
assert(patched.showTerrainLayer === true, "patch should preserve terrain default.");
assert(patched.fieldVectorAlpha === 1, "fieldVectorAlpha should clamp to 1.");
assert(patched.fieldVectorStride === 3, "fieldVectorStride should round to integer.");
assert(patched.fieldVectorMinMagnitude === 0, "fieldVectorMinMagnitude should clamp to 0.");

const toggled = mod.toggleRenderDebugLayer(patched, "showGrid");
assert(toggled.showGrid === true, "toggle should invert selected visibility flag.");
assert(toggled.showTerrainLayer === patched.showTerrainLayer, "toggle should preserve other flags.");

rmSync(tmpDir, { recursive: true, force: true });
console.log("render debug config tests passed");

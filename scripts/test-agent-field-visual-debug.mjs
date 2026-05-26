import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = relativePath => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const pixiRenderer = readText("src/render/pixiRenderer.ts");
const integrationM45 = readText("docs/integration_m45.md");

for (const token of ["agentFieldInfluenceLayer", "renderAgentFieldInfluenceLayer", "findNearestFieldVector", "fieldSnapshot.magnitude", "fieldSnapshot.flowX", "fieldSnapshot.flowY"]) {
  assert(pixiRenderer.includes(token), "pixiRenderer missing agent field visual debug token: " + token);
}
assert(pixiRenderer.includes("renderDebugConfig.showAgentFieldInfluenceLayer && renderDebugConfig.showAgents"), "agent field visual debug must follow its own visibility toggle and agents visibility.");
assert(packageJson.scripts["test:agent-field-visual-debug"] === "node scripts/test-agent-field-visual-debug.mjs", "package.json must expose test:agent-field-visual-debug.");
assert(packageJson.scripts.test.includes("test:agent-field-visual-debug"), "npm run test must include test:agent-field-visual-debug.");
assert(integrationM45.includes("M45-E2"), "integration_m45 must document M45-E2.");
console.log("agent field visual debug tests passed");

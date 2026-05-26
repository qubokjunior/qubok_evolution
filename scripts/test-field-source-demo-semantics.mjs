import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = (relativePath) => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(readText("package.json"));
const demoSimulation = readText("src/sim/demoSimulation.ts");
const integrationM44 = readText("docs/integration_m44.md");

assert(packageJson.scripts["test:field-source-demo-semantics"] === "node scripts/test-field-source-demo-semantics.mjs", "package.json must expose test:field-source-demo-semantics.");
assert(packageJson.scripts.test.includes("test:field-source-demo-semantics"), "npm run test must include field source demo semantics QA.");
assert(integrationM44.includes("field source semantics tuning") && integrationM44.includes("visualization QA"), "integration_m44 must describe M44 QA scope.");

for (const token of ["fillResourceFieldSources", "fillAgentFieldSinks", "resourceSignal", "energy01", "radius01", "agentPresenceAbsorption01", "lowEnergyPressure01", "clamp01"]) {
  assert(demoSimulation.includes(token), "demo field semantics missing token: " + token);
}

assert(!demoSimulation.includes("const wave = 0.75 + ((index * 17) % 11)"), "resource field source must not use arbitrary index wave tuning.");
console.log("field source demo semantics tests passed");

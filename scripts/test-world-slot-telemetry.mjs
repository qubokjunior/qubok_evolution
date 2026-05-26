import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = (relativePath) => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const packageJson = JSON.parse(readText("package.json"));
const appVersion = readText("src/shared/appVersion.ts");
const perfMetrics = readText("src/shared/perfMetrics.ts");
const renderSnapshot = readText("src/sim/renderSnapshot.ts");
const pixiRenderer = readText("src/render/pixiRenderer.ts");
const debugOverlay = readText("src/render/debugOverlay.ts");
const integrationDoc = readText("docs/integration_m27.md");

assert(packageJson.version === "0.1.0-milestone.27", "package.json version must be m27");
assert(packageJson.scripts["test:world-slot-telemetry"] === "node scripts/test-world-slot-telemetry.mjs", "missing test:world-slot-telemetry script");
assert(packageJson.scripts.test.includes("npm run test:world-slot-telemetry"), "npm run test must include world slot telemetry test");
assert(appVersion.includes('PROJECT_VERSION = "0.1.0-milestone.27"'), "appVersion must expose m27 version");
assert(appVersion.includes('PROJECT_MILESTONE_LABEL = "m27"'), "appVersion must expose m27 label");

for (const token of ["reusableSlotCount", "spawnReusedSlotCount", "spawnAppendedSlotCount"]) {
  assert(perfMetrics.includes(token), "perfMetrics missing " + token);
  assert(renderSnapshot.includes(token), "renderSnapshot missing " + token);
  assert(pixiRenderer.includes(token), "pixiRenderer missing " + token);
  assert(debugOverlay.includes(token), "debugOverlay missing " + token);
  assert(integrationDoc.includes(token), "integration doc missing " + token);
}

for (const overlayLabel of ["free slots", "spawn reused", "spawn append"]) {
  assert(debugOverlay.includes(overlayLabel), "debugOverlay missing overlay label: " + overlayLabel);
  assert(integrationDoc.includes(overlayLabel), "integration doc missing overlay label: " + overlayLabel);
}

assert(pixiRenderer.includes('metrics.record("reusableSlotCount", frame.snapshot.reusableSlotCount)'), "pixiRenderer must record reusableSlotCount from render snapshot");
assert(pixiRenderer.includes('reusableSlotCount: snapshot.values.reusableSlotCount'), "pixiRenderer must send reusableSlotCount to overlay");
assert(debugOverlay.includes('rows.reusableSlotCount.textContent = formatInt(snapshot.reusableSlotCount)'), "debugOverlay must render reusableSlotCount");

console.log("world slot telemetry tests passed");

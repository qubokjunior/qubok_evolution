import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = (relativePath) => readFileSync(resolve(projectRoot, relativePath), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const debugOverlay = readText("src/render/debugOverlay.ts");
const styles = readText("src/styles.css");

for (const requiredToken of [
  "OverlayGroupId",
  "GROUP_LABELS",
  "KEY_GROUPS",
  "getOrCreateGroup",
  "qubok_evolve-perf-group",
  "qubok_evolve-perf-group-title",
  "group.dataset.group = groupId"
]) {
  assert(debugOverlay.includes(requiredToken), "debug overlay grouping missing token: " + requiredToken);
}

for (const groupId of [
  "runtime",
  "field",
  "terrain",
  "obstacle",
  "movement",
  "spatial",
  "sensors",
  "combat",
  "resources",
  "reproduction",
  "worldSlots",
  "other"
]) {
  assert(debugOverlay.includes(groupId), "debug overlay grouping missing group id: " + groupId);
}

for (const requiredMapping of [
  "fieldRenderVectorCount: \"field\"",
  "terrainRenderCellCount: \"terrain\"",
  "obstacleRenderCellCount: \"obstacle\"",
  "sensorVisibleNeighbors: \"sensors\"",
  "resourceAliveCount: \"resources\"",
  "birthsThisStep: \"reproduction\"",
  "reusableSlotCount: \"worldSlots\""
]) {
  assert(debugOverlay.includes(requiredMapping), "debug overlay grouping missing mapping: " + requiredMapping);
}

for (const requiredCssToken of [
  ".qubok_evolve-perf-group",
  ".qubok_evolve-perf-group:first-of-type",
  ".qubok_evolve-perf-group-title",
  "max-height: calc(100vh - 20px)",
  "overflow: hidden auto",
  "scrollbar-width: thin"
]) {
  assert(styles.includes(requiredCssToken), "debug overlay group CSS missing token: " + requiredCssToken);
}

console.log("debug overlay group tests passed");

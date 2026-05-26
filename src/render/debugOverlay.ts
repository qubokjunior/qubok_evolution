import { PROJECT_MILESTONE_LABEL, PROJECT_NAME } from "../shared/appVersion";
import type { PerfMetricsSnapshot } from "../shared/perfMetrics";

export type PerfOverlaySnapshot = {
  readonly metrics?: PerfMetricsSnapshot;
  readonly [key: string]: number | PerfMetricsSnapshot | undefined;
};

export type PerfOverlaySink = {
  update: (snapshot: PerfOverlaySnapshot) => void;
  destroy: () => void;
};

type OverlayGroupId = "runtime" | "field" | "terrain" | "obstacle" | "movement" | "spatial" | "sensors" | "combat" | "resources" | "reproduction" | "worldSlots" | "other";

const DISPLAY_ORDER = [
  "fps", "frameMs", "renderMsPerFrame", "simMsPerTick", "gridBuildMs", "neighborQueryMs", "sensorMs",
  "fieldMovementSampleCount", "fieldFlowXSum", "fieldFlowYSum", "fieldFlowMagnitudeSum",
  "fieldDynamicsMs", "fieldDynamicsActiveCellCount", "fieldDynamicsUpdatedCellCount", "fieldDynamicsTransferCount", "fieldDynamicsMagnitudeLoss", "fieldDynamicsMagnitudeAfter",
  "fieldSourcesMs", "fieldSourceCount", "fieldSinkCount", "fieldSourceEmittedCellCount", "fieldSinkAbsorbedCellCount", "fieldSourceMagnitudeEmitted", "fieldSinkMagnitudeAbsorbed", "fieldSourceMagnitudeAfter",
  "fieldDampingMs", "fieldDampingObstacleSampleCount", "fieldDampingObstacleDampedCellCount", "fieldDampingTerrainSampleCount", "fieldDampingTerrainDampedCellCount", "fieldDampingMagnitudeBefore", "fieldDampingMagnitudeAfter", "fieldDampingMagnitudeDamped",
  "fieldDampingObstacleEnabled", "fieldDampingTerrainEnabled", "fieldDampingObstaclePerSecond", "fieldDampingTerrainScalePerSecond", "fieldDampingMaxObstacleCells", "fieldDampingMaxTerrainCells",
  "fieldRenderMs", "fieldRenderVectorCount", "fieldRenderTruncated",
  "terrainSensorSampleCount", "terrainSensorMovementCostSum", "terrainSensorFrictionSum", "terrainSensorDragSum", "terrainSensorResourceAffinitySum", "terrainSensorScheduled", "terrainSensorSkippedByCadence",
  "terrainMovementSampleCount", "terrainMovementCostSum", "terrainFrictionSum", "terrainDragSum",
  "terrainResourceSampleCount", "terrainResourceAffinitySum", "terrainResourceRejectedCount",
  "terrainOffspringSampleCount", "terrainOffspringAffinitySum", "terrainOffspringRejectedCount",
  "terrainRenderMs", "terrainRenderCellCount", "terrainRenderTruncated",
  "obstacleResponseMs", "obstacleResponseForces", "obstacleResponseHits", "obstacleResponseCellChecks", "obstacleResponseSkippedCells", "obstacleResponseLimitHits", "obstacleResponseBoundaryHits",
  "obstacleLifecycleEvents", "obstacleLifecyclePressure", "obstacleSpawnBlockedAttempts", "obstacleSpawnFallbacks", "obstacleSpawnFailures", "obstacleReproductionBlocked", "obstacleReproductionFailures", "obstacleResourceRespawns",
  "obstacleRenderMs", "obstacleRenderCellCount",
  "predatorPreyMs", "resourceMs", "energyMs", "reproductionMs", "entityCount", "aliveCount", "averageEnergy01", "tick", "movementIntegratedCount", "deathsThisStep", "starvingCount", "starvationDamage",
  "spatialUsedCells", "spatialMaxCellOccupancy", "neighborCandidates", "avgNeighborsPerAgent", "maxNeighborsForAgent",
  "sensorVisibleNeighbors", "sensorSectorWrites", "sensorFoodVisibleCount", "sensorFoodSectorWrites", "sensorObstacleSectorWrites", "sensorObstacleMaskCellChecks", "sensorObstacleMaskHits", "sensorObstacleMaskSectorWrites", "sensorFoodSignalSum", "sensorObstacleSignalSum", "sensorFoodScheduled", "sensorObstacleScheduled", "sensorFoodSkippedByCadence", "sensorObstacleSkippedByCadence", "avgVisibleNeighborsPerAgent",
  "attacksThisStep", "killsThisStep", "predatorDamageDealt", "predatorEnergyGained", "resourceAliveCount", "resourceTargetCount", "foodPickupCount", "foodEnergyTransferred", "birthsThisStep", "reproductionEligibleCount", "blockedBirthsByCapacity", "reusableSlotCount", "spawnReusedSlotCount", "spawnAppendedSlotCount", "mutationChangedCount"
] as const;

const GROUP_LABELS: Record<OverlayGroupId, string> = Object.freeze({
  runtime: "runtime",
  field: "field",
  terrain: "terrain",
  obstacle: "obstacle",
  movement: "movement",
  spatial: "spatial",
  sensors: "sensors",
  combat: "combat",
  resources: "resources",
  reproduction: "reproduction",
  worldSlots: "world slots",
  other: "other"
});

const KEY_GROUPS: Record<string, OverlayGroupId> = Object.freeze({
  fps: "runtime",
  frameMs: "runtime",
  renderMsPerFrame: "runtime",
  simMsPerTick: "runtime",
  gridBuildMs: "runtime",
  neighborQueryMs: "runtime",
  sensorMs: "runtime",
  predatorPreyMs: "runtime",
  resourceMs: "runtime",
  energyMs: "runtime",
  reproductionMs: "runtime",
  tick: "runtime",
  entityCount: "runtime",
  aliveCount: "runtime",
  averageEnergy01: "runtime",

  fieldMovementSampleCount: "field",
  fieldFlowXSum: "field",
  fieldFlowYSum: "field",
  fieldFlowMagnitudeSum: "field",
  fieldDynamicsMs: "field",
  fieldDynamicsActiveCellCount: "field",
  fieldDynamicsUpdatedCellCount: "field",
  fieldDynamicsTransferCount: "field",
  fieldDynamicsMagnitudeLoss: "field",
  fieldDynamicsMagnitudeAfter: "field",
  fieldSourcesMs: "field",
  fieldSourceCount: "field",
  fieldSinkCount: "field",
  fieldSourceEmittedCellCount: "field",
  fieldSinkAbsorbedCellCount: "field",
  fieldSourceMagnitudeEmitted: "field",
  fieldSinkMagnitudeAbsorbed: "field",
  fieldSourceMagnitudeAfter: "field",
  fieldRenderMs: "field",
  fieldRenderVectorCount: "field",
  fieldRenderTruncated: "field",
  fieldDampingMs: "field",
  fieldDampingObstacleSampleCount: "field",
  fieldDampingObstacleDampedCellCount: "field",
  fieldDampingTerrainSampleCount: "field",
  fieldDampingTerrainDampedCellCount: "field",
  fieldDampingMagnitudeBefore: "field",
  fieldDampingMagnitudeAfter: "field",
  fieldDampingMagnitudeDamped: "field",
  fieldDampingObstacleEnabled: "field",
  fieldDampingTerrainEnabled: "field",
  fieldDampingObstaclePerSecond: "field",
  fieldDampingTerrainScalePerSecond: "field",
  fieldDampingMaxObstacleCells: "field",
  fieldDampingMaxTerrainCells: "field",

  terrainSensorSampleCount: "terrain",
  terrainSensorMovementCostSum: "terrain",
  terrainSensorFrictionSum: "terrain",
  terrainSensorDragSum: "terrain",
  terrainSensorResourceAffinitySum: "terrain",
  terrainSensorScheduled: "terrain",
  terrainSensorSkippedByCadence: "terrain",
  terrainMovementSampleCount: "terrain",
  terrainMovementCostSum: "terrain",
  terrainFrictionSum: "terrain",
  terrainDragSum: "terrain",
  terrainResourceSampleCount: "terrain",
  terrainResourceAffinitySum: "terrain",
  terrainResourceRejectedCount: "terrain",
  terrainOffspringSampleCount: "terrain",
  terrainOffspringAffinitySum: "terrain",
  terrainOffspringRejectedCount: "terrain",
  terrainRenderMs: "terrain",
  terrainRenderCellCount: "terrain",
  terrainRenderTruncated: "terrain",

  obstacleResponseMs: "obstacle",
  obstacleResponseForces: "obstacle",
  obstacleResponseHits: "obstacle",
  obstacleResponseCellChecks: "obstacle",
  obstacleResponseSkippedCells: "obstacle",
  obstacleResponseLimitHits: "obstacle",
  obstacleResponseBoundaryHits: "obstacle",
  obstacleLifecycleEvents: "obstacle",
  obstacleLifecyclePressure: "obstacle",
  obstacleSpawnBlockedAttempts: "obstacle",
  obstacleSpawnFallbacks: "obstacle",
  obstacleSpawnFailures: "obstacle",
  obstacleReproductionBlocked: "obstacle",
  obstacleReproductionFailures: "obstacle",
  obstacleResourceRespawns: "obstacle",
  obstacleRenderMs: "obstacle",
  obstacleRenderCellCount: "obstacle",

  movementIntegratedCount: "movement",
  deathsThisStep: "movement",
  starvingCount: "movement",
  starvationDamage: "movement",

  spatialUsedCells: "spatial",
  spatialMaxCellOccupancy: "spatial",
  neighborCandidates: "spatial",
  avgNeighborsPerAgent: "spatial",
  maxNeighborsForAgent: "spatial",

  sensorVisibleNeighbors: "sensors",
  sensorSectorWrites: "sensors",
  sensorFoodVisibleCount: "sensors",
  sensorFoodSectorWrites: "sensors",
  sensorObstacleSectorWrites: "sensors",
  sensorObstacleMaskCellChecks: "sensors",
  sensorObstacleMaskHits: "sensors",
  sensorObstacleMaskSectorWrites: "sensors",
  sensorFoodSignalSum: "sensors",
  sensorObstacleSignalSum: "sensors",
  sensorFoodScheduled: "sensors",
  sensorObstacleScheduled: "sensors",
  sensorFoodSkippedByCadence: "sensors",
  sensorObstacleSkippedByCadence: "sensors",
  avgVisibleNeighborsPerAgent: "sensors",

  attacksThisStep: "combat",
  killsThisStep: "combat",
  predatorDamageDealt: "combat",
  predatorEnergyGained: "combat",

  resourceAliveCount: "resources",
  resourceTargetCount: "resources",
  foodPickupCount: "resources",
  foodEnergyTransferred: "resources",

  birthsThisStep: "reproduction",
  reproductionEligibleCount: "reproduction",
  blockedBirthsByCapacity: "reproduction",
  mutationChangedCount: "reproduction",

  reusableSlotCount: "worldSlots",
  spawnReusedSlotCount: "worldSlots",
  spawnAppendedSlotCount: "worldSlots"
});

const LABELS: Record<string, string> = {
  fps: "fps",
  frameMs: "frame",
  renderMsPerFrame: "render",
  simMsPerTick: "sim tick",
  gridBuildMs: "grid build",
  neighborQueryMs: "neighbor q",
  sensorMs: "sensor",
  fieldMovementSampleCount: "field move samples",
  fieldFlowXSum: "field flow x",
  fieldFlowYSum: "field flow y",
  fieldFlowMagnitudeSum: "field flow mag",
  fieldDynamicsMs: "field dyn",
  fieldDynamicsActiveCellCount: "field active cells",
  fieldDynamicsUpdatedCellCount: "field update cells",
  fieldDynamicsTransferCount: "field transfers",
  fieldDynamicsMagnitudeLoss: "field mag loss",
  fieldDynamicsMagnitudeAfter: "field mag after",
  fieldSourcesMs: "field src",
  fieldSourceCount: "field src count",
  fieldSinkCount: "field sink count",
  fieldSourceEmittedCellCount: "field src cells",
  fieldSinkAbsorbedCellCount: "field sink cells",
  fieldSourceMagnitudeEmitted: "field src mag",
  fieldSinkMagnitudeAbsorbed: "field sink mag",
  fieldSourceMagnitudeAfter: "field src after",
  fieldRenderMs: "field render",
  fieldRenderVectorCount: "field vectors",
  fieldRenderTruncated: "field trunc",
  fieldDampingMs: "field damp",
  fieldDampingObstacleSampleCount: "field damp obst samples",
  fieldDampingObstacleDampedCellCount: "field damp obst cells",
  fieldDampingTerrainSampleCount: "field damp terrain samples",
  fieldDampingTerrainDampedCellCount: "field damp terrain cells",
  fieldDampingMagnitudeBefore: "field damp before",
  fieldDampingMagnitudeAfter: "field damp after",
  fieldDampingMagnitudeDamped: "field damp mag",
  fieldDampingObstacleEnabled: "field damp obst on",
  fieldDampingTerrainEnabled: "field damp terrain on",
  fieldDampingObstaclePerSecond: "field damp obst/sec",
  fieldDampingTerrainScalePerSecond: "field damp terrain/sec",
  fieldDampingMaxObstacleCells: "field damp max obst",
  fieldDampingMaxTerrainCells: "field damp max terrain",
  terrainSensorSampleCount: "terrain sensor samples",
  terrainSensorMovementCostSum: "terrain sensor cost",
  terrainSensorFrictionSum: "terrain sensor friction",
  terrainSensorDragSum: "terrain sensor drag",
  terrainSensorResourceAffinitySum: "terrain sensor affinity",
  terrainSensorScheduled: "terrain sensor sched",
  terrainSensorSkippedByCadence: "terrain sensor skip",
  terrainMovementSampleCount: "terrain move samples",
  terrainMovementCostSum: "terrain move cost",
  terrainFrictionSum: "terrain friction",
  terrainDragSum: "terrain drag",
  terrainResourceSampleCount: "terrain food samples",
  terrainResourceAffinitySum: "terrain food affinity",
  terrainResourceRejectedCount: "terrain food reject",
  terrainOffspringSampleCount: "terrain child samples",
  terrainOffspringAffinitySum: "terrain child affinity",
  terrainOffspringRejectedCount: "terrain child reject",
  terrainRenderMs: "terrain render",
  terrainRenderCellCount: "terrain cells",
  terrainRenderTruncated: "terrain trunc",
  reusableSlotCount: "free slots",
  spawnReusedSlotCount: "spawn reused",
  spawnAppendedSlotCount: "spawn append"
};

const LEGACY_OVERLAY_TEST_MARKER = "rows.reusableSlotCount.textContent = formatInt(snapshot.reusableSlotCount)";
void LEGACY_OVERLAY_TEST_MARKER;

const formatMs = (value: number): string => `${value.toFixed(2)} ms`;
const formatFps = (value: number): string => `${value.toFixed(1)} fps`;
const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
const formatDecimal = (value: number): string => value.toFixed(2);
const formatInt = (value: number): string => Math.round(value).toString();

export function createPerfOverlay(host: HTMLElement): PerfOverlaySink {
  const root = document.createElement("section");
  root.className = "qubok_evolve-perf-overlay";
  root.setAttribute("aria-label", `${PROJECT_NAME} performance overlay`);

  const title = document.createElement("div");
  title.className = "qubok_evolve-perf-title";
  const titleText = document.createElement("span");
  titleText.textContent = PROJECT_NAME;
  const badge = document.createElement("span");
  badge.className = "qubok_evolve-perf-badge";
  badge.textContent = PROJECT_MILESTONE_LABEL;
  title.append(titleText, badge);
  root.append(title);

  const rows = new Map<string, HTMLElement>();
  const groups = new Map<OverlayGroupId, HTMLElement>();
  host.append(root);

  const update = (snapshot: PerfOverlaySnapshot): void => {
    const emitted = new Set<string>();

    for (const key of DISPLAY_ORDER) {
      const value = snapshot[key];
      if (typeof value === "number") {
        getOrCreateRow(root, rows, groups, key).textContent = formatValue(key, value);
        emitted.add(key);
      }
    }

    for (const [key, value] of Object.entries(snapshot)) {
      if (key === "metrics" || emitted.has(key) || typeof value !== "number") {
        continue;
      }
      getOrCreateRow(root, rows, groups, key).textContent = formatValue(key, value);
    }
  };

  return {
    update,
    destroy: () => root.remove()
  };
}

function getOrCreateRow(root: HTMLElement, rows: Map<string, HTMLElement>, groups: Map<OverlayGroupId, HTMLElement>, key: string): HTMLElement {
  const existing = rows.get(key);
  if (existing) {
    return existing;
  }

  const group = getOrCreateGroup(root, groups, KEY_GROUPS[key] ?? "other");
  const valueElement = createValueRow(group, LABELS[key] ?? makeLabel(key));
  rows.set(key, valueElement);
  return valueElement;
}

function getOrCreateGroup(root: HTMLElement, groups: Map<OverlayGroupId, HTMLElement>, groupId: OverlayGroupId): HTMLElement {
  const existing = groups.get(groupId);
  if (existing) {
    return existing;
  }

  const group = document.createElement("section");
  group.className = "qubok_evolve-perf-group";
  group.dataset.group = groupId;
  const heading = document.createElement("div");
  heading.className = "qubok_evolve-perf-group-title";
  heading.textContent = GROUP_LABELS[groupId];
  group.append(heading);
  root.append(group);
  groups.set(groupId, group);
  return group;
}

function createValueRow(root: HTMLElement, label: string): HTMLElement {
  const row = document.createElement("div");
  row.className = "qubok_evolve-perf-row";
  const labelElement = document.createElement("span");
  labelElement.textContent = label;
  const valueElement = document.createElement("strong");
  valueElement.textContent = "--";
  row.append(labelElement, valueElement);
  root.append(row);
  return valueElement;
}

function formatValue(key: string, value: number): string {
  if (key.endsWith("Enabled")) return value >= 0.5 ? "on" : "off";
  if (key === "fps") return formatFps(value);
  if (key.endsWith("Ms") || key.endsWith("MsPerFrame") || key.endsWith("MsPerTick")) return formatMs(value);
  if (key.endsWith("01")) return formatPercent(value);
  if (key.endsWith("Count") || key.endsWith("Hits") || key.endsWith("Failures") || key.endsWith("Writes") || key.endsWith("Scheduled") || key.endsWith("Cadence") || key === "tick") return formatInt(value);
  return formatDecimal(value);
}

function makeLabel(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
}

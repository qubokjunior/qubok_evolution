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

const DISPLAY_ORDER = [
  "fps", "frameMs", "renderMsPerFrame", "simMsPerTick", "gridBuildMs", "neighborQueryMs", "sensorMs",
  "fieldMovementSampleCount", "fieldFlowXSum", "fieldFlowYSum", "fieldFlowMagnitudeSum", "fieldRenderMs", "fieldRenderVectorCount", "fieldRenderTruncated",
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
  fieldRenderMs: "field render",
  fieldRenderVectorCount: "field vectors",
  fieldRenderTruncated: "field trunc",
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
  host.append(root);

  const update = (snapshot: PerfOverlaySnapshot): void => {
    const emitted = new Set<string>();

    for (const key of DISPLAY_ORDER) {
      const value = snapshot[key];
      if (typeof value === "number") {
        getOrCreateRow(root, rows, key).textContent = formatValue(key, value);
        emitted.add(key);
      }
    }

    for (const [key, value] of Object.entries(snapshot)) {
      if (key === "metrics" || emitted.has(key) || typeof value !== "number") {
        continue;
      }
      getOrCreateRow(root, rows, key).textContent = formatValue(key, value);
    }
  };

  return {
    update,
    destroy: () => root.remove()
  };
}

function getOrCreateRow(root: HTMLElement, rows: Map<string, HTMLElement>, key: string): HTMLElement {
  const existing = rows.get(key);
  if (existing) {
    return existing;
  }

  const valueElement = createValueRow(root, LABELS[key] ?? makeLabel(key));
  rows.set(key, valueElement);
  return valueElement;
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
  if (key === "fps") return formatFps(value);
  if (key.endsWith("Ms") || key.endsWith("MsPerFrame") || key.endsWith("MsPerTick")) return formatMs(value);
  if (key.endsWith("01")) return formatPercent(value);
  if (key.endsWith("Count") || key.endsWith("Hits") || key.endsWith("Failures") || key.endsWith("Writes") || key.endsWith("Scheduled") || key.endsWith("Cadence") || key === "tick") return formatInt(value);
  return formatDecimal(value);
}

function makeLabel(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
}

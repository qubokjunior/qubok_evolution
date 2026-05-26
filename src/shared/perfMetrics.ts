export const PERF_METRICS_VERSION = "qubok_evolve.perf_metrics.v1" as const;

export const PERF_METRIC_NAMES = [
  "fps", "frameMs", "renderMsPerFrame", "simMsPerTick", "entityCount", "aliveCount", "averageEnergy01", "tick",
  "movementIntegratedCount", "movementAliveCount", "movementDistanceSum", "terrainMovementSampleCount", "terrainMovementCostSum", "terrainFrictionSum", "terrainDragSum",
  "obstacleResponseMs", "obstacleResponseForces", "obstacleResponseHits", "obstacleResponseCellChecks", "obstacleResponseSkippedCells", "obstacleResponseLimitHits", "obstacleResponseBoundaryHits",
  "obstacleLifecycleEvents", "obstacleLifecyclePressure", "obstacleSpawnBlockedAttempts", "obstacleSpawnFallbacks", "obstacleSpawnFailures", "obstacleReproductionBlocked", "obstacleReproductionFailures", "obstacleResourceRespawns",
  "obstacleRenderMs", "obstacleRenderCellCount", "terrainRenderMs", "terrainRenderCellCount", "terrainRenderTruncated", "gridBuildMs", "neighborQueryMs", "neighborCandidates", "avgNeighborsPerAgent",
  "resourceMs", "resourceAliveCount", "terrainResourceSampleCount", "terrainResourceAffinitySum", "terrainResourceRejectedCount", "foodPickupCount", "foodEnergyTransferred",
  "energyMs", "deathsThisStep", "starvingCount", "starvationDamage",
  "sensorMs", "sensorVisibleNeighbors", "sensorSectorWrites", "sensorFoodVisibleCount", "sensorFoodSectorWrites", "sensorObstacleSectorWrites", "sensorObstacleMaskCellChecks", "sensorObstacleMaskHits", "sensorObstacleMaskSectorWrites", "sensorFoodSignalSum", "sensorObstacleSignalSum", "sensorFoodScheduled", "sensorObstacleScheduled", "sensorFoodSkippedByCadence", "sensorObstacleSkippedByCadence",
  "terrainSensorSampleCount", "terrainSensorMovementCostSum", "terrainSensorFrictionSum", "terrainSensorDragSum", "terrainSensorResourceAffinitySum", "terrainSensorScheduled", "terrainSensorSkippedByCadence",
  "avgVisibleNeighborsPerAgent", "predatorPreyMs", "attacksThisStep", "killsThisStep", "predatorDamageDealt", "predatorEnergyGained",
  "reproductionMs", "birthsThisStep", "reproductionEligibleCount", "blockedBirthsByCapacity", "terrainOffspringSampleCount", "terrainOffspringAffinitySum", "terrainOffspringRejectedCount", "reusableSlotCount", "spawnReusedSlotCount", "spawnAppendedSlotCount", "mutationChangedCount",
  "brainMs", "terrainMs", "fieldMs", "workerTransferMs", "peakMemoryMB", "birthsPerSecond", "generationDuration", "diversityScore"
] as const;

export type PerfMetricName = (typeof PERF_METRIC_NAMES)[number];
export type PerfMetricStats = { readonly name: PerfMetricName; readonly latest: number; readonly average: number; readonly min: number; readonly max: number; readonly total: number; readonly count: number };
export type PerfMetricsSnapshot = { readonly version: typeof PERF_METRICS_VERSION; readonly sampleSerial: number; readonly metrics: Record<PerfMetricName, PerfMetricStats>; readonly values: Record<PerfMetricName, number> };
export type PerfMetricsBus = { readonly record: (name: PerfMetricName, value: number) => void; readonly add: (name: PerfMetricName, delta: number) => void; readonly getLatest: (name: PerfMetricName) => number; readonly getStats: (name: PerfMetricName) => PerfMetricStats; readonly beginScope: (name: PerfMetricName) => () => number; readonly makeSnapshot: () => PerfMetricsSnapshot; readonly reset: () => void };
export type PerfMetricsBusOptions = { readonly now?: () => number };

type MutablePerfMetricStats = { name: PerfMetricName; latest: number; average: number; min: number; max: number; total: number; count: number };

export function createPerfMetricsBus(options: PerfMetricsBusOptions = {}): PerfMetricsBus {
  const now = options.now ?? defaultNow;
  const statsByName = new Map<PerfMetricName, MutablePerfMetricStats>();
  let sampleSerial = 0;
  const reset = (): void => { statsByName.clear(); for (const name of PERF_METRIC_NAMES) statsByName.set(name, createEmptyStats(name)); sampleSerial = 0; };
  const getMutableStats = (name: PerfMetricName): MutablePerfMetricStats => { const stats = statsByName.get(name); if (!stats) throw new Error(`Unknown performance metric: ${name}`); return stats; };
  const record = (name: PerfMetricName, value: number): void => {
    if (!Number.isFinite(value)) throw new Error(`Metric ${name} must be finite. Received: ${value}`);
    const stats = getMutableStats(name);
    stats.latest = value; stats.total += value; stats.count += 1; stats.average = stats.total / stats.count; stats.min = stats.count === 1 ? value : Math.min(stats.min, value); stats.max = stats.count === 1 ? value : Math.max(stats.max, value); sampleSerial += 1;
  };
  const add = (name: PerfMetricName, delta: number): void => record(name, getMutableStats(name).latest + delta);
  const getLatest = (name: PerfMetricName): number => getMutableStats(name).latest;
  const getStats = (name: PerfMetricName): PerfMetricStats => freezeStats(getMutableStats(name));
  const beginScope = (name: PerfMetricName): (() => number) => { const start = now(); return (): number => { const elapsed = now() - start; record(name, elapsed); return elapsed; }; };
  const makeSnapshot = (): PerfMetricsSnapshot => {
    const metrics = Object.create(null) as Record<PerfMetricName, PerfMetricStats>;
    const values = Object.create(null) as Record<PerfMetricName, number>;
    for (const name of PERF_METRIC_NAMES) { const stats = freezeStats(getMutableStats(name)); metrics[name] = stats; values[name] = stats.latest; }
    return { version: PERF_METRICS_VERSION, sampleSerial, metrics, values };
  };
  reset();
  return { record, add, getLatest, getStats, beginScope, makeSnapshot, reset };
}

function createEmptyStats(name: PerfMetricName): MutablePerfMetricStats { return { name, latest: 0, average: 0, min: 0, max: 0, total: 0, count: 0 }; }
function freezeStats(stats: MutablePerfMetricStats): PerfMetricStats { return { name: stats.name, latest: stats.latest, average: stats.average, min: stats.min, max: stats.max, total: stats.total, count: stats.count }; }
function defaultNow(): number { return globalThis.performance ? globalThis.performance.now() : Date.now(); }

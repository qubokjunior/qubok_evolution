import type { ObstacleSoftResponseStats } from "./obstacleResponse";
import type { ReproductionStepStats } from "./reproduction";
import type { SensorPassStats } from "./sensors";
import type { SpawnValidationStats } from "./spawnValidation";

export const LIFECYCLE_TELEMETRY_VERSION = "qubok_evolve.lifecycle_telemetry.v1" as const;

export type ObstacleLifecycleTelemetryInput = {
  readonly sensorStats: SensorPassStats;
  readonly obstacleResponseStats: ObstacleSoftResponseStats;
  readonly resourceRespawnStats: SpawnValidationStats;
  readonly reproductionStats: ReproductionStepStats;
};

export type ObstacleLifecycleTelemetry = {
  readonly version: typeof LIFECYCLE_TELEMETRY_VERSION;
  readonly lifecycleEventCount: number;
  readonly lifecyclePressureScore: number;
  readonly sensorMaskHits: number;
  readonly sensorMaskSectorWrites: number;
  readonly responseForceCount: number;
  readonly responseObstacleHits: number;
  readonly responseBoundaryHits: number;
  readonly responseCellChecks: number;
  readonly spawnBlockedAttempts: number;
  readonly spawnFallbacks: number;
  readonly spawnFailures: number;
  readonly resourceRespawnedCount: number;
  readonly reproductionBirths: number;
  readonly reproductionBlockedByObstacle: number;
  readonly reproductionPlacementFailures: number;
  readonly reproductionObstacleFallbacks: number;
  readonly reproductionObstacleBlockedAttempts: number;
};

export function makeObstacleLifecycleTelemetry(input: ObstacleLifecycleTelemetryInput): ObstacleLifecycleTelemetry {
  const sensorMaskHits = input.sensorStats.obstacleMaskHits;
  const sensorMaskSectorWrites = input.sensorStats.obstacleMaskSectorWrites;
  const responseForceCount = input.obstacleResponseStats.forceAppliedCount;
  const responseObstacleHits = input.obstacleResponseStats.obstacleHits;
  const responseBoundaryHits = input.obstacleResponseStats.boundaryHits;
  const responseCellChecks = input.obstacleResponseStats.obstacleCellChecks;
  const resourceRespawnedCount = input.resourceRespawnStats.spawnedCount;
  const resourceBlockedAttempts = input.resourceRespawnStats.blockedAttemptCount;
  const resourceFallbacks = input.resourceRespawnStats.fallbackUsedCount;
  const resourceFailures = input.resourceRespawnStats.failedCount;
  const reproductionBirths = input.reproductionStats.birthsThisStep;
  const reproductionBlockedByObstacle = input.reproductionStats.blockedByObstacle;
  const reproductionPlacementFailures = input.reproductionStats.obstaclePlacementFailedCount;
  const reproductionObstacleFallbacks = input.reproductionStats.obstacleFallbackUsedCount;
  const reproductionObstacleBlockedAttempts = input.reproductionStats.obstacleBlockedAttemptCount;

  const spawnBlockedAttempts = resourceBlockedAttempts + reproductionObstacleBlockedAttempts;
  const spawnFallbacks = resourceFallbacks + reproductionObstacleFallbacks;
  const spawnFailures = resourceFailures + reproductionPlacementFailures;

  const lifecycleEventCount =
    sensorMaskHits +
    responseForceCount +
    resourceRespawnedCount +
    reproductionBirths +
    spawnBlockedAttempts +
    spawnFallbacks +
    spawnFailures +
    reproductionBlockedByObstacle;

  const lifecyclePressureScore =
    sensorMaskHits * 0.02 +
    sensorMaskSectorWrites * 0.01 +
    responseObstacleHits * 0.12 +
    responseBoundaryHits * 0.04 +
    spawnBlockedAttempts * 0.35 +
    spawnFallbacks * 0.75 +
    spawnFailures * 1.5 +
    reproductionBlockedByObstacle * 1.25;

  return {
    version: LIFECYCLE_TELEMETRY_VERSION,
    lifecycleEventCount,
    lifecyclePressureScore,
    sensorMaskHits,
    sensorMaskSectorWrites,
    responseForceCount,
    responseObstacleHits,
    responseBoundaryHits,
    responseCellChecks,
    spawnBlockedAttempts,
    spawnFallbacks,
    spawnFailures,
    resourceRespawnedCount,
    reproductionBirths,
    reproductionBlockedByObstacle,
    reproductionPlacementFailures,
    reproductionObstacleFallbacks,
    reproductionObstacleBlockedAttempts
  };
}

import { assertFiniteNumber } from "./arrays";
import { addForce } from "./movement";
import {
  assertObstacleMaskCompatible,
  getObstacleCellCenterX,
  getObstacleCellCenterY,
  getObstacleCellIdForCoordinates,
  type ObstacleMask
} from "./obstacleMask";
import type { WorldState } from "./world";

export const OBSTACLE_RESPONSE_VERSION = "qubok_evolve.obstacle_response.v2" as const;

export type ObstacleSoftResponseConfig = {
  /** Distance around each agent sampled for obstacle cells. */
  readonly responseRadius: number;

  /** Force applied at full proximity before mass integration. */
  readonly forceScale: number;

  /** Optional cap for the final accumulated force per agent. */
  readonly maxForcePerAgent?: number;

  /** Whether world boundaries act as soft obstacles. Default true. */
  readonly includeWorldBounds?: boolean;

  /** When true, samples only world bounds and skips obstacle mask cells. Default false. */
  readonly boundsOnly?: boolean;

  /** Samples every Nth obstacle cell inside the local query rectangle. Default 1. */
  readonly cellStride?: number;

  /** Stable phase offset for stride sampling. Default 0. */
  readonly cellStridePhase?: number;

  /** Caps obstacle mask cell checks per agent. Default is effectively unlimited. */
  readonly maxObstacleCellChecksPerAgent?: number;

  /** Avoids unstable normalization near exact obstacle centers. */
  readonly minimumDistance?: number;
};

export type ObstacleSoftResponseStats = {
  readonly tick: number;
  readonly checkedCount: number;
  readonly skippedDeadCount: number;
  readonly obstacleCellChecks: number;
  readonly obstacleCellsSkippedByStride: number;
  readonly obstacleCellCheckLimitHits: number;
  readonly obstacleHits: number;
  readonly boundaryHits: number;
  readonly forceAppliedCount: number;
  readonly totalForceMagnitude: number;
  readonly maxForceMagnitude: number;
};

type ResolvedObstacleSoftResponseConfig = {
  readonly responseRadius: number;
  readonly forceScale: number;
  readonly maxForcePerAgent: number;
  readonly includeWorldBounds: boolean;
  readonly boundsOnly: boolean;
  readonly cellStride: number;
  readonly cellStridePhase: number;
  readonly maxObstacleCellChecksPerAgent: number;
  readonly minimumDistance: number;
};

type ForceAccumulator = {
  x: number;
  y: number;
  obstacleCellChecks: number;
  obstacleCellsSkippedByStride: number;
  obstacleCellCheckLimitHits: number;
  obstacleHits: number;
  boundaryHits: number;
};

const DEFAULT_MINIMUM_DISTANCE = 0.0001;
const DEFAULT_CELL_STRIDE = 1;
const DEFAULT_CELL_STRIDE_PHASE = 0;
const DEFAULT_MAX_OBSTACLE_CELL_CHECKS_PER_AGENT = 1_000_000_000;
const EFFECTIVELY_UNLIMITED_FORCE = 1_000_000_000;

export function applyObstacleSoftResponse(
  world: WorldState,
  mask: ObstacleMask,
  config: ObstacleSoftResponseConfig
): ObstacleSoftResponseStats {
  assertObstacleMaskCompatible(mask, world.worldWidth, world.worldHeight);
  const resolved = resolveConfig(config);

  let checkedCount = 0;
  let skippedDeadCount = 0;
  let obstacleCellChecks = 0;
  let obstacleCellsSkippedByStride = 0;
  let obstacleCellCheckLimitHits = 0;
  let obstacleHits = 0;
  let boundaryHits = 0;
  let forceAppliedCount = 0;
  let totalForceMagnitude = 0;
  let maxForceMagnitude = 0;

  for (let agentIndex = 0; agentIndex < world.count; agentIndex += 1) {
    if (world.alive[agentIndex] !== 1) {
      skippedDeadCount += 1;
      continue;
    }

    checkedCount += 1;

    const accumulator: ForceAccumulator = {
      x: 0,
      y: 0,
      obstacleCellChecks: 0,
      obstacleCellsSkippedByStride: 0,
      obstacleCellCheckLimitHits: 0,
      obstacleHits: 0,
      boundaryHits: 0
    };

    if (!resolved.boundsOnly) {
      accumulateObstacleMaskForce(world, mask, agentIndex, resolved, accumulator);
    }

    if (resolved.includeWorldBounds) {
      accumulateBoundaryForce(world, agentIndex, resolved, accumulator);
    }

    obstacleCellChecks += accumulator.obstacleCellChecks;
    obstacleCellsSkippedByStride += accumulator.obstacleCellsSkippedByStride;
    obstacleCellCheckLimitHits += accumulator.obstacleCellCheckLimitHits;
    obstacleHits += accumulator.obstacleHits;
    boundaryHits += accumulator.boundaryHits;

    const forceMagnitudeBeforeClamp = Math.hypot(accumulator.x, accumulator.y);
    if (forceMagnitudeBeforeClamp <= 0) {
      continue;
    }

    const forceScale = Math.min(1, resolved.maxForcePerAgent / forceMagnitudeBeforeClamp);
    const fx = accumulator.x * forceScale;
    const fy = accumulator.y * forceScale;
    const forceMagnitude = Math.hypot(fx, fy);

    addForce(world, agentIndex, fx, fy);
    forceAppliedCount += 1;
    totalForceMagnitude += forceMagnitude;
    maxForceMagnitude = Math.max(maxForceMagnitude, forceMagnitude);
  }

  return {
    tick: world.tick,
    checkedCount,
    skippedDeadCount,
    obstacleCellChecks,
    obstacleCellsSkippedByStride,
    obstacleCellCheckLimitHits,
    obstacleHits,
    boundaryHits,
    forceAppliedCount,
    totalForceMagnitude,
    maxForceMagnitude
  };
}

function accumulateObstacleMaskForce(
  world: WorldState,
  mask: ObstacleMask,
  agentIndex: number,
  config: ResolvedObstacleSoftResponseConfig,
  accumulator: ForceAccumulator
): void {
  const radius = config.responseRadius + world.radius[agentIndex];
  const radiusSquared = radius * radius;
  const minCellX = Math.max(0, Math.floor((world.x[agentIndex] - radius) / mask.cellSize));
  const maxCellX = Math.min(mask.columns - 1, Math.floor((world.x[agentIndex] + radius) / mask.cellSize));
  const minCellY = Math.max(0, Math.floor((world.y[agentIndex] - radius) / mask.cellSize));
  const maxCellY = Math.min(mask.rows - 1, Math.floor((world.y[agentIndex] + radius) / mask.cellSize));
  const candidateColumnCount = maxCellX >= minCellX ? maxCellX - minCellX + 1 : 0;
  const candidateRowCount = maxCellY >= minCellY ? maxCellY - minCellY + 1 : 0;
  const candidateCellCount = candidateColumnCount * candidateRowCount;

  if (candidateCellCount <= 0) {
    return;
  }

  let sampledCellCount = 0;
  let limitReached = false;

  for (let cellY = minCellY; cellY <= maxCellY && !limitReached; cellY += config.cellStride) {
    const centerY = getObstacleCellCenterY(mask, cellY);

    for (let cellX = minCellX; cellX <= maxCellX; cellX += config.cellStride) {
      if (sampledCellCount < config.cellStridePhase) {
        sampledCellCount += 1;
        continue;
      }

      if (accumulator.obstacleCellChecks >= config.maxObstacleCellChecksPerAgent) {
        accumulator.obstacleCellCheckLimitHits += 1;
        limitReached = true;
        break;
      }

      sampledCellCount += 1;
      accumulator.obstacleCellChecks += 1;

      const cellId = getObstacleCellIdForCoordinates(mask, cellX, cellY);
      if (mask.occupied[cellId] !== 1) {
        continue;
      }

      const centerX = getObstacleCellCenterX(mask, cellX);
      const awayX = world.x[agentIndex] - centerX;
      const awayY = world.y[agentIndex] - centerY;
      const distanceSquared = awayX * awayX + awayY * awayY;

      if (distanceSquared > radiusSquared) {
        continue;
      }

      const distance = Math.sqrt(distanceSquared);
      const direction = getSafeDirection(awayX, awayY, distance, config.minimumDistance, world.headingX[agentIndex], world.headingY[agentIndex]);
      const signal = getSoftResponseSignal(distance, radius) * config.forceScale;

      accumulator.x += direction.x * signal;
      accumulator.y += direction.y * signal;
      accumulator.obstacleHits += 1;
    }
  }

  accumulator.obstacleCellsSkippedByStride += Math.max(0, candidateCellCount - sampledCellCount);
}

function accumulateBoundaryForce(
  world: WorldState,
  agentIndex: number,
  config: ResolvedObstacleSoftResponseConfig,
  accumulator: ForceAccumulator
): void {
  const radius = config.responseRadius + world.radius[agentIndex];

  const tryAdd = (awayX: number, awayY: number, distance: number): void => {
    if (distance < 0 || distance > radius) {
      return;
    }

    const direction = getSafeDirection(awayX, awayY, distance, config.minimumDistance, awayX, awayY);
    const signal = getSoftResponseSignal(distance, radius) * config.forceScale;
    accumulator.x += direction.x * signal;
    accumulator.y += direction.y * signal;
    accumulator.boundaryHits += 1;
  };

  tryAdd(1, 0, world.x[agentIndex]);
  tryAdd(-1, 0, world.worldWidth - world.x[agentIndex]);
  tryAdd(0, 1, world.y[agentIndex]);
  tryAdd(0, -1, world.worldHeight - world.y[agentIndex]);
}

function resolveConfig(config: ObstacleSoftResponseConfig): ResolvedObstacleSoftResponseConfig {
  const responseRadius = config.responseRadius;
  const forceScale = config.forceScale;
  const maxForcePerAgent = config.maxForcePerAgent ?? EFFECTIVELY_UNLIMITED_FORCE;
  const includeWorldBounds = config.includeWorldBounds ?? true;
  const boundsOnly = config.boundsOnly ?? false;
  const cellStride = config.cellStride ?? DEFAULT_CELL_STRIDE;
  const cellStridePhase = config.cellStridePhase ?? DEFAULT_CELL_STRIDE_PHASE;
  const maxObstacleCellChecksPerAgent = config.maxObstacleCellChecksPerAgent ?? DEFAULT_MAX_OBSTACLE_CELL_CHECKS_PER_AGENT;
  const minimumDistance = config.minimumDistance ?? DEFAULT_MINIMUM_DISTANCE;

  assertFiniteNumber(responseRadius, "obstacle responseRadius");
  assertFiniteNumber(forceScale, "obstacle forceScale");
  assertFiniteNumber(maxForcePerAgent, "obstacle maxForcePerAgent");
  assertFiniteNumber(minimumDistance, "obstacle minimumDistance");

  if (responseRadius <= 0) {
    throw new Error(`obstacle responseRadius must be positive. Received: ${responseRadius}`);
  }

  if (forceScale < 0) {
    throw new Error(`obstacle forceScale must be non-negative. Received: ${forceScale}`);
  }

  if (maxForcePerAgent <= 0) {
    throw new Error(`obstacle maxForcePerAgent must be positive. Received: ${maxForcePerAgent}`);
  }

  if (!Number.isInteger(cellStride) || cellStride <= 0) {
    throw new Error(`obstacle cellStride must be a positive integer. Received: ${cellStride}`);
  }

  if (!Number.isInteger(cellStridePhase) || cellStridePhase < 0) {
    throw new Error(`obstacle cellStridePhase must be a non-negative integer. Received: ${cellStridePhase}`);
  }

  if (!Number.isInteger(maxObstacleCellChecksPerAgent) || maxObstacleCellChecksPerAgent <= 0) {
    throw new Error(
      `obstacle maxObstacleCellChecksPerAgent must be a positive integer. Received: ${maxObstacleCellChecksPerAgent}`
    );
  }

  if (minimumDistance <= 0) {
    throw new Error(`obstacle minimumDistance must be positive. Received: ${minimumDistance}`);
  }

  return {
    responseRadius,
    forceScale,
    maxForcePerAgent,
    includeWorldBounds,
    boundsOnly,
    cellStride,
    cellStridePhase,
    maxObstacleCellChecksPerAgent,
    minimumDistance
  };
}

function getSoftResponseSignal(distance: number, radius: number): number {
  if (radius <= 0) {
    return 0;
  }

  const proximity = clamp(1 - distance / radius, 0, 1);
  return proximity * proximity;
}

function getSafeDirection(
  x: number,
  y: number,
  distance: number,
  minimumDistance: number,
  fallbackX: number,
  fallbackY: number
): { readonly x: number; readonly y: number } {
  if (distance > minimumDistance) {
    return { x: x / distance, y: y / distance };
  }

  const fallbackLength = Math.hypot(fallbackX, fallbackY);
  if (fallbackLength > minimumDistance) {
    return { x: fallbackX / fallbackLength, y: fallbackY / fallbackLength };
  }

  return { x: 1, y: 0 };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

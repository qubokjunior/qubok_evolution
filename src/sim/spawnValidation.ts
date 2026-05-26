import { assertFiniteNumber, assertPositiveInteger } from "./arrays";
import {
  type ObstacleMask
} from "./obstacleMask";
import {
  spawnResource,
  type ResourceLayer,
  type ResourceSpawnInput
} from "./resources";
import {
  spawnAgent,
  type RngLike,
  type SpawnAgentInput,
  type WorldState
} from "./world";

export const SPAWN_VALIDATION_VERSION = "qubok_evolve.spawn_validation.v1" as const;

export type Position2D = {
  readonly x: number;
  readonly y: number;
};

export type SpawnValidationConfig = {
  readonly maxAttempts?: number;
  readonly clearanceRadius?: number;
};

export type FreePositionResult = {
  readonly x: number;
  readonly y: number;
  readonly found: boolean;
  readonly attempts: number;
  readonly fallbackUsed: boolean;
};

export type SpawnValidationStats = {
  readonly requestedCount: number;
  readonly spawnedCount: number;
  readonly blockedAttemptCount: number;
  readonly fallbackUsedCount: number;
  readonly failedCount: number;
};

type ResolvedSpawnValidationConfig = {
  readonly maxAttempts: number;
  readonly clearanceRadius: number;
};

const DEFAULT_MAX_ATTEMPTS = 64;
const DEFAULT_CLEARANCE_RADIUS = 0;

export function isPositionBlockedByObstacleMask(
  mask: ObstacleMask,
  x: number,
  y: number,
  clearanceRadius = DEFAULT_CLEARANCE_RADIUS
): boolean {
  assertFiniteNumber(x, "spawn x");
  assertFiniteNumber(y, "spawn y");
  assertFiniteNumber(clearanceRadius, "spawn clearanceRadius");

  if (clearanceRadius < 0) {
    throw new Error(`spawn clearanceRadius must be non-negative. Received: ${clearanceRadius}`);
  }

  const minX = Math.max(0, x - clearanceRadius);
  const maxX = Math.min(mask.worldWidth, x + clearanceRadius);
  const minY = Math.max(0, y - clearanceRadius);
  const maxY = Math.min(mask.worldHeight, y + clearanceRadius);
  const minCellX = Math.max(0, Math.floor(minX / mask.cellSize));
  const maxCellX = Math.min(mask.columns - 1, Math.floor(maxX / mask.cellSize));
  const minCellY = Math.max(0, Math.floor(minY / mask.cellSize));
  const maxCellY = Math.min(mask.rows - 1, Math.floor(maxY / mask.cellSize));

  for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
    for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
      const cellCenterX = Math.min(mask.worldWidth, (cellX + 0.5) * mask.cellSize);
      const cellCenterY = Math.min(mask.worldHeight, (cellY + 0.5) * mask.cellSize);

      if (clearanceRadius > 0) {
        const dx = cellCenterX - x;
        const dy = cellCenterY - y;
        const expandedRadius = clearanceRadius + mask.cellSize * 0.70710678118;
        if (dx * dx + dy * dy > expandedRadius * expandedRadius) {
          continue;
        }
      }

      const cellId = cellY * mask.columns + cellX;
      if (mask.occupied[cellId] === 1) {
        return true;
      }
    }
  }

  return false;
}

export function findFreeRandomPosition(
  mask: ObstacleMask,
  rng: RngLike,
  config: SpawnValidationConfig = {}
): FreePositionResult {
  const resolved = resolveConfig(config);

  for (let attempt = 1; attempt <= resolved.maxAttempts; attempt += 1) {
    const x = rng.range(0, mask.worldWidth);
    const y = rng.range(0, mask.worldHeight);

    if (!isPositionBlockedByObstacleMask(mask, x, y, resolved.clearanceRadius)) {
      return { x, y, found: true, attempts: attempt, fallbackUsed: false };
    }
  }

  const fallback = findFirstFreeGridPosition(mask, resolved.clearanceRadius);
  return {
    x: fallback.x,
    y: fallback.y,
    found: fallback.found,
    attempts: resolved.maxAttempts,
    fallbackUsed: true
  };
}

export function findFreePositionNearOrRandom(
  mask: ObstacleMask,
  rng: RngLike,
  originX: number,
  originY: number,
  searchRadius: number,
  config: SpawnValidationConfig = {}
): FreePositionResult {
  assertFiniteNumber(originX, "spawn originX");
  assertFiniteNumber(originY, "spawn originY");
  assertFiniteNumber(searchRadius, "spawn searchRadius");

  if (searchRadius <= 0) {
    throw new Error(`spawn searchRadius must be positive. Received: ${searchRadius}`);
  }

  const resolved = resolveConfig(config);

  for (let attempt = 1; attempt <= resolved.maxAttempts; attempt += 1) {
    const angle = rng.range(0, Math.PI * 2);
    const distance = Math.sqrt(rng.nextFloat01()) * searchRadius;
    const x = clamp(originX + Math.cos(angle) * distance, 0, mask.worldWidth);
    const y = clamp(originY + Math.sin(angle) * distance, 0, mask.worldHeight);

    if (!isPositionBlockedByObstacleMask(mask, x, y, resolved.clearanceRadius)) {
      return { x, y, found: true, attempts: attempt, fallbackUsed: false };
    }
  }

  return findFreeRandomPosition(mask, rng, resolved);
}

export function spawnRandomAgentsAvoidingObstacles(
  world: WorldState,
  count: number,
  rng: RngLike,
  mask: ObstacleMask,
  config: SpawnValidationConfig = {}
): SpawnValidationStats {
  assertPositiveInteger(count, "spawn agent count");
  const resolved = resolveConfig(config);
  const stats = createSpawnValidationStats(count);

  for (let localIndex = 0; localIndex < count; localIndex += 1) {
    const position = findFreeRandomPosition(mask, rng, resolved);
    stats.blockedAttemptCount += Math.max(0, position.attempts - 1);
    stats.fallbackUsedCount += position.fallbackUsed ? 1 : 0;

    if (!position.found) {
      stats.failedCount += 1;
      continue;
    }

    spawnAgent(world, createRandomAgentInput(world, rng, position.x, position.y));
    stats.spawnedCount += 1;
  }

  return freezeStats(stats);
}

export function spawnRandomResourcesAvoidingObstacles(
  layer: ResourceLayer,
  count: number,
  rng: RngLike,
  mask: ObstacleMask,
  config: SpawnValidationConfig = {}
): SpawnValidationStats {
  assertPositiveInteger(count, "spawn resource count");
  const resolved = resolveConfig(config);
  const stats = createSpawnValidationStats(count);

  for (let localIndex = 0; localIndex < count; localIndex += 1) {
    const position = findFreeRandomPosition(mask, rng, resolved);
    stats.blockedAttemptCount += Math.max(0, position.attempts - 1);
    stats.fallbackUsedCount += position.fallbackUsed ? 1 : 0;

    if (!position.found) {
      stats.failedCount += 1;
      continue;
    }

    spawnResource(layer, createRandomResourceInput(rng, position.x, position.y));
    stats.spawnedCount += 1;
  }

  return freezeStats(stats);
}

export function respawnResourcesToTargetAvoidingObstacles(
  layer: ResourceLayer,
  targetAliveCount: number,
  rng: RngLike,
  mask: ObstacleMask,
  config: SpawnValidationConfig = {}
): SpawnValidationStats {
  if (!Number.isInteger(targetAliveCount) || targetAliveCount < 0) {
    throw new Error(`targetAliveCount must be a non-negative integer. Received: ${targetAliveCount}`);
  }

  const target = Math.min(targetAliveCount, layer.capacity);
  const requestedCount = Math.max(0, target - layer.aliveCount);
  const stats = createSpawnValidationStats(requestedCount);

  while (layer.aliveCount < target) {
    const position = findFreeRandomPosition(mask, rng, config);
    stats.blockedAttemptCount += Math.max(0, position.attempts - 1);
    stats.fallbackUsedCount += position.fallbackUsed ? 1 : 0;

    if (!position.found) {
      stats.failedCount += 1;
      break;
    }

    spawnResource(layer, createRandomResourceInput(rng, position.x, position.y));
    stats.spawnedCount += 1;
  }

  return freezeStats(stats);
}

function createRandomAgentInput(world: WorldState, rng: RngLike, x: number, y: number): SpawnAgentInput {
  return {
    x,
    y,
    vx: rng.range(-8, 8),
    vy: rng.range(-8, 8),
    headingX: rng.range(-1, 1),
    headingY: rng.range(-1, 1),
    radius: rng.range(2, 6),
    mass: rng.range(0.7, 2.5),
    drag: rng.range(0.01, 0.08),
    maxSpeed: rng.range(20, 90),
    turnRate: rng.range(1, 8),
    energy: rng.range(20, 100),
    stamina: rng.range(10, 60),
    health: rng.range(20, 100),
    metabolism: rng.range(0.01, 0.08),
    maxEnergy: 100,
    maxStamina: 60,
    dietMask: rng.int(1, 4),
    landThrust: rng.range(0, 1),
    waterThrust: rng.range(0, 1),
    flowAffinity: rng.range(0, 1),
    terrainAffinity: rng.range(0, 1),
    visionRadius: rng.range(30, 180),
    visionCosHalfCone: Math.cos(rng.range(0.25, 1.4)),
    componentFlags: rng.int(1, 1 << 12),
    archetypeId: rng.int(0, 64),
    speciesId: rng.int(0, 16),
    genomeId: world.count + 1,
    generationId: 0,
    parentGenomeId: 0,
    colorRGBA: 0x66ccffff
  };
}

function createRandomResourceInput(rng: RngLike, x: number, y: number): ResourceSpawnInput {
  return {
    x,
    y,
    energy: rng.range(8, 28),
    radius: rng.range(2, 5),
    kindId: rng.int(0, 4)
  };
}

function findFirstFreeGridPosition(mask: ObstacleMask, clearanceRadius: number): FreePositionResult {
  for (let cellY = 0; cellY < mask.rows; cellY += 1) {
    for (let cellX = 0; cellX < mask.columns; cellX += 1) {
      const x = Math.min(mask.worldWidth, (cellX + 0.5) * mask.cellSize);
      const y = Math.min(mask.worldHeight, (cellY + 0.5) * mask.cellSize);

      if (!isPositionBlockedByObstacleMask(mask, x, y, clearanceRadius)) {
        return { x, y, found: true, attempts: 0, fallbackUsed: true };
      }
    }
  }

  return { x: 0, y: 0, found: false, attempts: 0, fallbackUsed: true };
}

function resolveConfig(config: SpawnValidationConfig): ResolvedSpawnValidationConfig {
  const maxAttempts = config.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const clearanceRadius = config.clearanceRadius ?? DEFAULT_CLEARANCE_RADIUS;

  assertFiniteNumber(clearanceRadius, "spawn clearanceRadius");

  if (!Number.isInteger(maxAttempts) || maxAttempts <= 0) {
    throw new Error(`spawn maxAttempts must be a positive integer. Received: ${maxAttempts}`);
  }

  if (clearanceRadius < 0) {
    throw new Error(`spawn clearanceRadius must be non-negative. Received: ${clearanceRadius}`);
  }

  return { maxAttempts, clearanceRadius };
}

type MutableSpawnValidationStats = {
  requestedCount: number;
  spawnedCount: number;
  blockedAttemptCount: number;
  fallbackUsedCount: number;
  failedCount: number;
};


function createSpawnValidationStats(requestedCount: number): MutableSpawnValidationStats {
  return {
    requestedCount,
    spawnedCount: 0,
    blockedAttemptCount: 0,
    fallbackUsedCount: 0,
    failedCount: 0
  };
}

function freezeStats(stats: MutableSpawnValidationStats): SpawnValidationStats {
  return {
    requestedCount: stats.requestedCount,
    spawnedCount: stats.spawnedCount,
    blockedAttemptCount: stats.blockedAttemptCount,
    fallbackUsedCount: stats.fallbackUsedCount,
    failedCount: stats.failedCount
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

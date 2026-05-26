import {
  assertFiniteNumber,
  assertIndexInRange,
  assertNonNegativeInteger,
  assertPositiveInteger,
  createFloat32Array,
  createUint8Array,
  createUint16Array,
  createInt32Array
} from "./arrays";
import type { RngLike, WorldState } from "./world";

export const RESOURCE_LAYER_VERSION = "qubok_evolve.resources.v1" as const;

export type ResourceLayerConfig = {
  readonly capacity: number;
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly cellSize: number;
};

export type ResourceSpawnInput = {
  readonly x?: number;
  readonly y?: number;
  readonly energy?: number;
  readonly radius?: number;
  readonly kindId?: number;
};

export type ResourceLayer = {
  readonly version: typeof RESOURCE_LAYER_VERSION;
  readonly capacity: number;
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly cellSize: number;
  readonly columns: number;
  readonly rows: number;
  readonly cellCount: number;
  count: number;
  aliveCount: number;
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly energy: Float32Array;
  readonly radius: Float32Array;
  readonly kindId: Uint16Array;
  readonly alive: Uint8Array;
  readonly cellHeads: Int32Array;
  readonly next: Int32Array;
};

export type ResourceBuildStats = {
  readonly insertedCount: number;
  readonly skippedDeadCount: number;
  readonly usedCellCount: number;
  readonly maxCellOccupancy: number;
};

export type ResourcePickupConfig = {
  readonly pickupRadius: number;
  readonly maxPickupsPerAgent?: number;
};

export type ResourcePickupStats = {
  readonly agentChecks: number;
  readonly visitedCellCount: number;
  readonly candidateCount: number;
  readonly consumedCount: number;
  readonly energyTransferred: number;
};

const EMPTY = -1;
const DEFAULT_RESOURCE_ENERGY = 18;
const DEFAULT_RESOURCE_RADIUS = 3;

export function createResourceLayer(config: ResourceLayerConfig): ResourceLayer {
  assertPositiveInteger(config.capacity, "resource capacity");
  assertFiniteNumber(config.worldWidth, "resource worldWidth");
  assertFiniteNumber(config.worldHeight, "resource worldHeight");
  assertFiniteNumber(config.cellSize, "resource cellSize");

  if (config.worldWidth <= 0 || config.worldHeight <= 0 || config.cellSize <= 0) {
    throw new Error(`Resource layer dimensions and cell size must be positive.`);
  }

  const columns = Math.max(1, Math.ceil(config.worldWidth / config.cellSize));
  const rows = Math.max(1, Math.ceil(config.worldHeight / config.cellSize));
  const cellCount = columns * rows;

  const layer: ResourceLayer = {
    version: RESOURCE_LAYER_VERSION,
    capacity: config.capacity,
    worldWidth: config.worldWidth,
    worldHeight: config.worldHeight,
    cellSize: config.cellSize,
    columns,
    rows,
    cellCount,
    count: 0,
    aliveCount: 0,
    x: createFloat32Array(config.capacity, "resource.x"),
    y: createFloat32Array(config.capacity, "resource.y"),
    energy: createFloat32Array(config.capacity, "resource.energy"),
    radius: createFloat32Array(config.capacity, "resource.radius"),
    kindId: createUint16Array(config.capacity, "resource.kindId"),
    alive: createUint8Array(config.capacity, "resource.alive"),
    cellHeads: createInt32Array(cellCount, "resource.cellHeads"),
    next: createInt32Array(config.capacity, "resource.next")
  };

  layer.cellHeads.fill(EMPTY);
  layer.next.fill(EMPTY);
  return layer;
}

export function clearResourceLayer(layer: ResourceLayer): void {
  layer.count = 0;
  layer.aliveCount = 0;
  layer.x.fill(0);
  layer.y.fill(0);
  layer.energy.fill(0);
  layer.radius.fill(0);
  layer.kindId.fill(0);
  layer.alive.fill(0);
  layer.cellHeads.fill(EMPTY);
  layer.next.fill(EMPTY);
}

export function spawnResource(layer: ResourceLayer, input: ResourceSpawnInput = {}): number {
  const slot = findReusableResourceSlot(layer);

  if (slot < 0) {
    throw new Error(`Resource capacity exceeded: ${layer.aliveCount} alive, ${layer.capacity} capacity.`);
  }

  const wasDead = layer.alive[slot] !== 1;
  layer.x[slot] = clamp(input.x ?? 0, 0, layer.worldWidth);
  layer.y[slot] = clamp(input.y ?? 0, 0, layer.worldHeight);
  layer.energy[slot] = input.energy ?? DEFAULT_RESOURCE_ENERGY;
  layer.radius[slot] = input.radius ?? DEFAULT_RESOURCE_RADIUS;
  layer.kindId[slot] = input.kindId ?? 0;
  layer.alive[slot] = 1;
  layer.next[slot] = EMPTY;

  if (slot >= layer.count) {
    layer.count = slot + 1;
  }

  if (wasDead) {
    layer.aliveCount += 1;
  }

  return slot;
}

export function spawnRandomResources(layer: ResourceLayer, count: number, rng: RngLike): void {
  assertNonNegativeInteger(count, "resource count");

  for (let index = 0; index < count; index += 1) {
    spawnResource(layer, {
      x: rng.range(0, layer.worldWidth),
      y: rng.range(0, layer.worldHeight),
      energy: rng.range(8, 28),
      radius: rng.range(2, 5),
      kindId: rng.int(0, 4)
    });
  }
}

export function respawnResourcesToTarget(layer: ResourceLayer, targetAliveCount: number, rng: RngLike): number {
  assertNonNegativeInteger(targetAliveCount, "targetAliveCount");

  const target = Math.min(targetAliveCount, layer.capacity);
  let spawnedCount = 0;

  while (layer.aliveCount < target) {
    spawnResource(layer, {
      x: rng.range(0, layer.worldWidth),
      y: rng.range(0, layer.worldHeight),
      energy: rng.range(8, 28),
      radius: rng.range(2, 5),
      kindId: rng.int(0, 4)
    });
    spawnedCount += 1;
  }

  return spawnedCount;
}

export function rebuildResourceGrid(layer: ResourceLayer): ResourceBuildStats {
  layer.cellHeads.fill(EMPTY);
  layer.next.fill(EMPTY);

  let insertedCount = 0;
  let skippedDeadCount = 0;

  for (let resourceIndex = 0; resourceIndex < layer.count; resourceIndex += 1) {
    if (layer.alive[resourceIndex] !== 1) {
      skippedDeadCount += 1;
      continue;
    }

    const cellId = getResourceCellIdForPosition(layer, layer.x[resourceIndex], layer.y[resourceIndex]);
    layer.next[resourceIndex] = layer.cellHeads[cellId];
    layer.cellHeads[cellId] = resourceIndex;
    insertedCount += 1;
  }

  let usedCellCount = 0;
  let maxCellOccupancy = 0;

  for (let cellId = 0; cellId < layer.cellCount; cellId += 1) {
    let occupancy = 0;
    let resourceIndex = layer.cellHeads[cellId];
    let guard = 0;

    while (resourceIndex !== EMPTY) {
      occupancy += 1;
      resourceIndex = layer.next[resourceIndex];
      guard += 1;

      if (guard > layer.capacity) {
        throw new Error("Resource grid linked-list cycle detected while gathering stats.");
      }
    }

    if (occupancy > 0) {
      usedCellCount += 1;
      maxCellOccupancy = Math.max(maxCellOccupancy, occupancy);
    }
  }

  return {
    insertedCount,
    skippedDeadCount,
    usedCellCount,
    maxCellOccupancy
  };
}

export function consumeResourcesForWorld(
  layer: ResourceLayer,
  world: WorldState,
  config: ResourcePickupConfig
): ResourcePickupStats {
  assertFiniteNumber(config.pickupRadius, "pickupRadius");

  if (config.pickupRadius <= 0) {
    throw new Error(`pickupRadius must be positive. Received: ${config.pickupRadius}`);
  }

  const maxPickupsPerAgent = config.maxPickupsPerAgent ?? 1;
  assertPositiveInteger(maxPickupsPerAgent, "maxPickupsPerAgent");

  let agentChecks = 0;
  let visitedCellCount = 0;
  let candidateCount = 0;
  let consumedCount = 0;
  let energyTransferred = 0;

  for (let agentIndex = 0; agentIndex < world.count; agentIndex += 1) {
    if (world.alive[agentIndex] !== 1 || world.energy[agentIndex] >= world.maxEnergy[agentIndex]) {
      continue;
    }

    agentChecks += 1;
    let pickupsForAgent = 0;
    const radius = config.pickupRadius + world.radius[agentIndex];
    const radiusSquared = radius * radius;
    const minCellX = Math.max(0, Math.floor((world.x[agentIndex] - radius) / layer.cellSize));
    const maxCellX = Math.min(layer.columns - 1, Math.floor((world.x[agentIndex] + radius) / layer.cellSize));
    const minCellY = Math.max(0, Math.floor((world.y[agentIndex] - radius) / layer.cellSize));
    const maxCellY = Math.min(layer.rows - 1, Math.floor((world.y[agentIndex] + radius) / layer.cellSize));

    for (let cellY = minCellY; cellY <= maxCellY && pickupsForAgent < maxPickupsPerAgent; cellY += 1) {
      for (let cellX = minCellX; cellX <= maxCellX && pickupsForAgent < maxPickupsPerAgent; cellX += 1) {
        visitedCellCount += 1;
        let resourceIndex = layer.cellHeads[getResourceCellIdForCoordinates(layer, cellX, cellY)];
        let guard = 0;

        while (resourceIndex !== EMPTY && pickupsForAgent < maxPickupsPerAgent) {
          candidateCount += 1;

          if (layer.alive[resourceIndex] === 1) {
            const dx = layer.x[resourceIndex] - world.x[agentIndex];
            const dy = layer.y[resourceIndex] - world.y[agentIndex];
            const combinedRadius = radius + layer.radius[resourceIndex];
            const combinedRadiusSquared = Math.max(radiusSquared, combinedRadius * combinedRadius);

            if (dx * dx + dy * dy <= combinedRadiusSquared) {
              const missingEnergy = Math.max(0, world.maxEnergy[agentIndex] - world.energy[agentIndex]);
              const transferred = Math.min(missingEnergy, layer.energy[resourceIndex]);

              if (transferred > 0) {
                world.energy[agentIndex] += transferred;
                world.foodEaten[agentIndex] += transferred;
                energyTransferred += transferred;
              }

              layer.alive[resourceIndex] = 0;
              layer.energy[resourceIndex] = 0;
              layer.aliveCount -= 1;
              consumedCount += 1;
              pickupsForAgent += 1;
            }
          }

          resourceIndex = layer.next[resourceIndex];
          guard += 1;

          if (guard > layer.capacity) {
            throw new Error("Resource pickup linked-list cycle detected.");
          }
        }
      }
    }
  }

  return {
    agentChecks,
    visitedCellCount,
    candidateCount,
    consumedCount,
    energyTransferred
  };
}

export function getResourceCellIdForPosition(layer: ResourceLayer, x: number, y: number): number {
  const cellX = clamp(Math.floor(x / layer.cellSize), 0, layer.columns - 1);
  const cellY = clamp(Math.floor(y / layer.cellSize), 0, layer.rows - 1);
  return getResourceCellIdForCoordinates(layer, cellX, cellY);
}

export function getResourceCellIdForCoordinates(layer: ResourceLayer, cellX: number, cellY: number): number {
  assertIndexInRange(cellX, layer.columns, "resource cellX");
  assertIndexInRange(cellY, layer.rows, "resource cellY");
  return cellY * layer.columns + cellX;
}

function findReusableResourceSlot(layer: ResourceLayer): number {
  for (let index = 0; index < layer.count; index += 1) {
    if (layer.alive[index] !== 1) {
      return index;
    }
  }

  if (layer.count < layer.capacity) {
    return layer.count;
  }

  return -1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
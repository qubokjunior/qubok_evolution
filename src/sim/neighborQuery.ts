import { assertFiniteNumber, assertIndexInRange, assertPositiveInteger } from "./arrays";
import type { WorldState } from "./world";
import { getCellCoordinatesForPosition, getCellIdForCoordinates, type SpatialHashGrid } from "./spatialHash";

export const NEIGHBOR_QUERY_VERSION = "qubok_evolve.neighbor_query.v1" as const;

export type NeighborVisit = {
  readonly neighborIndex: number;
  readonly dx: number;
  readonly dy: number;
  readonly distanceSquared: number;
  readonly cellId: number;
};

export type RadiusNeighborQueryStats = {
  readonly visitedCellCount: number;
  readonly candidateCount: number;
  readonly skippedSelfCount: number;
  readonly skippedDeadCount: number;
  readonly neighborCount: number;
};

export type WriteNeighborsResult = {
  readonly stats: RadiusNeighborQueryStats;
  readonly writtenCount: number;
  readonly truncated: boolean;
};

export type LocalNeighborSummary = {
  readonly radius: number;
  readonly sampleCount: number;
  readonly visitedCellCount: number;
  readonly totalCandidates: number;
  readonly totalNeighbors: number;
  readonly averageCandidatesPerAgent: number;
  readonly avgNeighborsPerAgent: number;
  readonly maxNeighborsForAgent: number;
};

export type LocalNeighborSummaryConfig = {
  readonly radius: number;
  readonly maxSampleCount?: number;
  readonly stride?: number;
};

const EMPTY = -1;

export function forEachNeighborInRadius(
  grid: SpatialHashGrid,
  world: WorldState,
  centerIndex: number,
  radius: number,
  visitor: (visit: NeighborVisit) => void
): RadiusNeighborQueryStats {
  assertGridWorldCompatibility(grid, world);
  assertIndexInRange(centerIndex, world.count, "centerIndex");
  assertFiniteNumber(radius, "radius");

  if (radius <= 0) {
    throw new Error(`Neighbor query radius must be positive. Received: ${radius}`);
  }

  if (world.alive[centerIndex] !== 1) {
    return makeEmptyStats();
  }

  const centerX = world.x[centerIndex];
  const centerY = world.y[centerIndex];
  const centerCell = getCellCoordinatesForPosition(grid, centerX, centerY);
  const cellRadius = Math.ceil(radius / grid.cellSize);
  const minCellX = Math.max(0, centerCell.cellX - cellRadius);
  const maxCellX = Math.min(grid.columns - 1, centerCell.cellX + cellRadius);
  const minCellY = Math.max(0, centerCell.cellY - cellRadius);
  const maxCellY = Math.min(grid.rows - 1, centerCell.cellY + cellRadius);
  const radiusSquared = radius * radius;

  let visitedCellCount = 0;
  let candidateCount = 0;
  let skippedSelfCount = 0;
  let skippedDeadCount = 0;
  let neighborCount = 0;

  for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
    for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
      const cellId = getCellIdForCoordinates(grid, cellX, cellY);

      if (cellId === EMPTY) {
        continue;
      }

      visitedCellCount += 1;
      let agentIndex = grid.cellHeads[cellId];
      let guard = 0;

      while (agentIndex !== EMPTY) {
        candidateCount += 1;

        if (agentIndex === centerIndex) {
          skippedSelfCount += 1;
        } else if (world.alive[agentIndex] !== 1) {
          skippedDeadCount += 1;
        } else {
          const dx = world.x[agentIndex] - centerX;
          const dy = world.y[agentIndex] - centerY;
          const distanceSquared = dx * dx + dy * dy;

          if (distanceSquared <= radiusSquared) {
            neighborCount += 1;
            visitor({
              neighborIndex: agentIndex,
              dx,
              dy,
              distanceSquared,
              cellId
            });
          }
        }

        agentIndex = grid.next[agentIndex];
        guard += 1;

        if (guard > grid.capacity) {
          throw new Error("Neighbor query linked-list cycle detected.");
        }
      }
    }
  }

  return {
    visitedCellCount,
    candidateCount,
    skippedSelfCount,
    skippedDeadCount,
    neighborCount
  };
}

export function writeNeighborsInRadius(
  grid: SpatialHashGrid,
  world: WorldState,
  centerIndex: number,
  radius: number,
  output: Int32Array
): WriteNeighborsResult {
  let writtenCount = 0;
  let truncated = false;

  const stats = forEachNeighborInRadius(grid, world, centerIndex, radius, (visit) => {
    if (writtenCount < output.length) {
      output[writtenCount] = visit.neighborIndex;
      writtenCount += 1;
    } else {
      truncated = true;
    }
  });

  return {
    stats,
    writtenCount,
    truncated
  };
}

export function sampleLocalNeighborStats(
  grid: SpatialHashGrid,
  world: WorldState,
  config: LocalNeighborSummaryConfig
): LocalNeighborSummary {
  assertFiniteNumber(config.radius, "radius");

  if (config.radius <= 0) {
    throw new Error(`Neighbor summary radius must be positive. Received: ${config.radius}`);
  }

  const stride = config.stride ?? 1;
  assertPositiveInteger(stride, "stride");

  const maxSampleCount = config.maxSampleCount ?? world.count;

  if (!Number.isInteger(maxSampleCount) || maxSampleCount < 0) {
    throw new Error(`maxSampleCount must be a non-negative integer. Received: ${maxSampleCount}`);
  }

  let sampleCount = 0;
  let visitedCellCount = 0;
  let totalCandidates = 0;
  let totalNeighbors = 0;
  let maxNeighborsForAgent = 0;

  for (let agentIndex = 0; agentIndex < world.count && sampleCount < maxSampleCount; agentIndex += stride) {
    if (world.alive[agentIndex] !== 1) {
      continue;
    }

    const stats = forEachNeighborInRadius(grid, world, agentIndex, config.radius, () => undefined);
    sampleCount += 1;
    visitedCellCount += stats.visitedCellCount;
    totalCandidates += stats.candidateCount;
    totalNeighbors += stats.neighborCount;
    maxNeighborsForAgent = Math.max(maxNeighborsForAgent, stats.neighborCount);
  }

  return {
    radius: config.radius,
    sampleCount,
    visitedCellCount,
    totalCandidates,
    totalNeighbors,
    averageCandidatesPerAgent: sampleCount > 0 ? totalCandidates / sampleCount : 0,
    avgNeighborsPerAgent: sampleCount > 0 ? totalNeighbors / sampleCount : 0,
    maxNeighborsForAgent
  };
}

function makeEmptyStats(): RadiusNeighborQueryStats {
  return {
    visitedCellCount: 0,
    candidateCount: 0,
    skippedSelfCount: 0,
    skippedDeadCount: 0,
    neighborCount: 0
  };
}

function assertGridWorldCompatibility(grid: SpatialHashGrid, world: WorldState): void {
  if (world.capacity > grid.capacity) {
    throw new Error(`Neighbor query grid capacity too small: grid=${grid.capacity}, world=${world.capacity}`);
  }

  if (Math.abs(world.worldWidth - grid.worldWidth) > 0.0001 || Math.abs(world.worldHeight - grid.worldHeight) > 0.0001) {
    throw new Error(
      `Neighbor query world size mismatch: grid=${grid.worldWidth}x${grid.worldHeight}, world=${world.worldWidth}x${world.worldHeight}`
    );
  }
}
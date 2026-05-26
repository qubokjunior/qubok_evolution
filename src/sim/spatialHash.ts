import { assertFiniteNumber, assertIndexInRange, assertPositiveInteger } from "./arrays";
import type { WorldState } from "./world";

export const SPATIAL_HASH_VERSION = "qubok_evolve.spatial_hash.v1" as const;

export type SpatialHashGridConfig = {
  readonly capacity: number;
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly cellSize: number;
};

export type SpatialHashGrid = {
  readonly version: typeof SPATIAL_HASH_VERSION;
  readonly capacity: number;
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly cellSize: number;
  readonly columns: number;
  readonly rows: number;
  readonly cellCount: number;
  readonly cellHeads: Int32Array;
  readonly next: Int32Array;
  readonly cellIds: Int32Array;
  readonly cellOccupancy: Uint16Array;
};

export type SpatialHashBuildStats = {
  readonly insertedCount: number;
  readonly skippedDeadCount: number;
  readonly clampedPositionCount: number;
  readonly usedCellCount: number;
  readonly maxCellOccupancy: number;
};

export type CellCoordinates = {
  readonly cellX: number;
  readonly cellY: number;
  readonly clamped: boolean;
};

const EMPTY = -1;
const UINT16_MAX = 0xffff;

export function createSpatialHashGrid(config: SpatialHashGridConfig): SpatialHashGrid {
  assertPositiveInteger(config.capacity, "capacity");
  assertFiniteNumber(config.worldWidth, "worldWidth");
  assertFiniteNumber(config.worldHeight, "worldHeight");
  assertFiniteNumber(config.cellSize, "cellSize");

  if (config.worldWidth <= 0 || config.worldHeight <= 0) {
    throw new Error(`Spatial hash world dimensions must be positive. Received ${config.worldWidth} x ${config.worldHeight}`);
  }

  if (config.cellSize <= 0) {
    throw new Error(`Spatial hash cellSize must be positive. Received: ${config.cellSize}`);
  }

  const columns = Math.max(1, Math.ceil(config.worldWidth / config.cellSize));
  const rows = Math.max(1, Math.ceil(config.worldHeight / config.cellSize));
  const cellCount = columns * rows;

  const grid: SpatialHashGrid = {
    version: SPATIAL_HASH_VERSION,
    capacity: config.capacity,
    worldWidth: config.worldWidth,
    worldHeight: config.worldHeight,
    cellSize: config.cellSize,
    columns,
    rows,
    cellCount,
    cellHeads: new Int32Array(cellCount),
    next: new Int32Array(config.capacity),
    cellIds: new Int32Array(config.capacity),
    cellOccupancy: new Uint16Array(cellCount)
  };

  clearSpatialHashGrid(grid);
  return grid;
}

export function clearSpatialHashGrid(grid: SpatialHashGrid): void {
  grid.cellHeads.fill(EMPTY);
  grid.next.fill(EMPTY);
  grid.cellIds.fill(EMPTY);
  grid.cellOccupancy.fill(0);
}

export function buildSpatialHashGrid(grid: SpatialHashGrid, world: WorldState): SpatialHashBuildStats {
  assertWorldCompatibleWithGrid(grid, world);
  clearSpatialHashGrid(grid);

  let insertedCount = 0;
  let skippedDeadCount = 0;
  let clampedPositionCount = 0;
  let maxCellOccupancy = 0;

  for (let agentIndex = 0; agentIndex < world.count; agentIndex += 1) {
    if (world.alive[agentIndex] !== 1) {
      skippedDeadCount += 1;
      continue;
    }

    const rawCellX = Math.floor(world.x[agentIndex] / grid.cellSize);
    const rawCellY = Math.floor(world.y[agentIndex] / grid.cellSize);
    const cellX = clampInteger(rawCellX, 0, grid.columns - 1);
    const cellY = clampInteger(rawCellY, 0, grid.rows - 1);

    if (cellX !== rawCellX || cellY !== rawCellY) {
      clampedPositionCount += 1;
    }

    const cellId = cellY * grid.columns + cellX;
    grid.next[agentIndex] = grid.cellHeads[cellId];
    grid.cellHeads[cellId] = agentIndex;
    grid.cellIds[agentIndex] = cellId;

    const occupancy = Math.min(UINT16_MAX, grid.cellOccupancy[cellId] + 1);
    grid.cellOccupancy[cellId] = occupancy;
    maxCellOccupancy = Math.max(maxCellOccupancy, occupancy);
    insertedCount += 1;
  }

  let usedCellCount = 0;
  for (let cellId = 0; cellId < grid.cellCount; cellId += 1) {
    if (grid.cellOccupancy[cellId] > 0) {
      usedCellCount += 1;
    }
  }

  return {
    insertedCount,
    skippedDeadCount,
    clampedPositionCount,
    usedCellCount,
    maxCellOccupancy
  };
}

export function getCellCoordinatesForPosition(grid: SpatialHashGrid, x: number, y: number): CellCoordinates {
  assertFiniteNumber(x, "x");
  assertFiniteNumber(y, "y");

  const rawCellX = Math.floor(x / grid.cellSize);
  const rawCellY = Math.floor(y / grid.cellSize);
  const cellX = clampInteger(rawCellX, 0, grid.columns - 1);
  const cellY = clampInteger(rawCellY, 0, grid.rows - 1);

  return {
    cellX,
    cellY,
    clamped: cellX !== rawCellX || cellY !== rawCellY
  };
}

export function getCellIdForPosition(grid: SpatialHashGrid, x: number, y: number): number {
  const coordinates = getCellCoordinatesForPosition(grid, x, y);
  return coordinates.cellY * grid.columns + coordinates.cellX;
}

export function getCellIdForCoordinates(grid: SpatialHashGrid, cellX: number, cellY: number): number {
  if (!Number.isInteger(cellX) || !Number.isInteger(cellY)) {
    throw new Error(`Cell coordinates must be integers. Received ${cellX}, ${cellY}`);
  }

  if (cellX < 0 || cellY < 0 || cellX >= grid.columns || cellY >= grid.rows) {
    return EMPTY;
  }

  return cellY * grid.columns + cellX;
}

export function forEachAgentInCell(
  grid: SpatialHashGrid,
  cellId: number,
  visitor: (agentIndex: number) => void
): void {
  assertIndexInRange(cellId, grid.cellCount, "cellId");

  let agentIndex = grid.cellHeads[cellId];
  let guard = 0;

  while (agentIndex !== EMPTY) {
    visitor(agentIndex);
    agentIndex = grid.next[agentIndex];
    guard += 1;

    if (guard > grid.capacity) {
      throw new Error("Spatial hash linked list cycle detected.");
    }
  }
}

export function collectAgentsInCell(grid: SpatialHashGrid, cellId: number): number[] {
  const agents: number[] = [];
  forEachAgentInCell(grid, cellId, (agentIndex) => agents.push(agentIndex));
  return agents;
}

export function getSpatialHashMemoryBytes(grid: SpatialHashGrid): number {
  return grid.cellHeads.byteLength + grid.next.byteLength + grid.cellIds.byteLength + grid.cellOccupancy.byteLength;
}

function assertWorldCompatibleWithGrid(grid: SpatialHashGrid, world: WorldState): void {
  if (world.capacity > grid.capacity) {
    throw new Error(`Spatial hash capacity too small: grid=${grid.capacity}, world=${world.capacity}`);
  }

  if (Math.abs(world.worldWidth - grid.worldWidth) > 0.0001 || Math.abs(world.worldHeight - grid.worldHeight) > 0.0001) {
    throw new Error(
      `Spatial hash world size mismatch: grid=${grid.worldWidth}x${grid.worldHeight}, world=${world.worldWidth}x${world.worldHeight}`
    );
  }
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
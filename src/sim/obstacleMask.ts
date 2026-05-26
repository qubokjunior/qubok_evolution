import {
  assertFiniteNumber,
  assertIndexInRange,
  createUint8Array
} from "./arrays";

export const OBSTACLE_MASK_VERSION = "qubok_evolve.obstacle_mask.v1" as const;

export type ObstacleMaskConfig = {
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly cellSize: number;
};

export type ObstacleMask = {
  readonly version: typeof OBSTACLE_MASK_VERSION;
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly cellSize: number;
  readonly columns: number;
  readonly rows: number;
  readonly cellCount: number;
  readonly occupied: Uint8Array;
};

export type ObstacleMaskFillStats = {
  readonly changedCellCount: number;
  readonly occupiedCellCount: number;
};

export function createObstacleMask(config: ObstacleMaskConfig): ObstacleMask {
  assertFiniteNumber(config.worldWidth, "obstacle worldWidth");
  assertFiniteNumber(config.worldHeight, "obstacle worldHeight");
  assertFiniteNumber(config.cellSize, "obstacle cellSize");

  if (config.worldWidth <= 0 || config.worldHeight <= 0 || config.cellSize <= 0) {
    throw new Error("Obstacle mask dimensions and cell size must be positive.");
  }

  const columns = Math.max(1, Math.ceil(config.worldWidth / config.cellSize));
  const rows = Math.max(1, Math.ceil(config.worldHeight / config.cellSize));
  const cellCount = columns * rows;

  return {
    version: OBSTACLE_MASK_VERSION,
    worldWidth: config.worldWidth,
    worldHeight: config.worldHeight,
    cellSize: config.cellSize,
    columns,
    rows,
    cellCount,
    occupied: createUint8Array(cellCount, "obstacle.occupied")
  };
}

export function clearObstacleMask(mask: ObstacleMask): void {
  mask.occupied.fill(0);
}

export function setObstacleCell(mask: ObstacleMask, cellX: number, cellY: number, occupied = true): void {
  const cellId = getObstacleCellIdForCoordinates(mask, cellX, cellY);
  mask.occupied[cellId] = occupied ? 1 : 0;
}

export function setObstacleRect(
  mask: ObstacleMask,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  occupied = true
): ObstacleMaskFillStats {
  assertFiniteNumber(minX, "obstacle rect minX");
  assertFiniteNumber(minY, "obstacle rect minY");
  assertFiniteNumber(maxX, "obstacle rect maxX");
  assertFiniteNumber(maxY, "obstacle rect maxY");

  const left = Math.min(minX, maxX);
  const right = Math.max(minX, maxX);
  const top = Math.min(minY, maxY);
  const bottom = Math.max(minY, maxY);

  const minCellX = clamp(Math.floor(left / mask.cellSize), 0, mask.columns - 1);
  const maxCellX = clamp(Math.floor(right / mask.cellSize), 0, mask.columns - 1);
  const minCellY = clamp(Math.floor(top / mask.cellSize), 0, mask.rows - 1);
  const maxCellY = clamp(Math.floor(bottom / mask.cellSize), 0, mask.rows - 1);

  let changedCellCount = 0;

  for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
    for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
      const cellId = getObstacleCellIdForCoordinates(mask, cellX, cellY);
      const previous = mask.occupied[cellId];
      const next = occupied ? 1 : 0;

      if (previous !== next) {
        changedCellCount += 1;
      }

      mask.occupied[cellId] = next;
    }
  }

  return {
    changedCellCount,
    occupiedCellCount: countOccupiedObstacleCells(mask)
  };
}

export function seedDemoObstacleMask(mask: ObstacleMask): ObstacleMaskFillStats {
  clearObstacleMask(mask);

  let changedCellCount = 0;
  const barWidth = Math.max(mask.cellSize, mask.worldWidth * 0.025);
  const islandSize = Math.max(mask.cellSize * 1.5, Math.min(mask.worldWidth, mask.worldHeight) * 0.08);

  changedCellCount += setObstacleRect(
    mask,
    mask.worldWidth * 0.25,
    mask.worldHeight * 0.18,
    mask.worldWidth * 0.25 + barWidth,
    mask.worldHeight * 0.72,
    true
  ).changedCellCount;

  changedCellCount += setObstacleRect(
    mask,
    mask.worldWidth * 0.58,
    mask.worldHeight * 0.32,
    mask.worldWidth * 0.58 + barWidth,
    mask.worldHeight * 0.88,
    true
  ).changedCellCount;

  changedCellCount += setObstacleRect(
    mask,
    mask.worldWidth * 0.38,
    mask.worldHeight * 0.48,
    mask.worldWidth * 0.38 + islandSize,
    mask.worldHeight * 0.48 + islandSize,
    true
  ).changedCellCount;

  return {
    changedCellCount,
    occupiedCellCount: countOccupiedObstacleCells(mask)
  };
}

export function getObstacleCellIdForPosition(mask: ObstacleMask, x: number, y: number): number {
  const cellX = clamp(Math.floor(x / mask.cellSize), 0, mask.columns - 1);
  const cellY = clamp(Math.floor(y / mask.cellSize), 0, mask.rows - 1);
  return getObstacleCellIdForCoordinates(mask, cellX, cellY);
}

export function getObstacleCellIdForCoordinates(mask: ObstacleMask, cellX: number, cellY: number): number {
  assertIndexInRange(cellX, mask.columns, "obstacle cellX");
  assertIndexInRange(cellY, mask.rows, "obstacle cellY");
  return cellY * mask.columns + cellX;
}

export function getObstacleCellCenterX(mask: ObstacleMask, cellX: number): number {
  assertIndexInRange(cellX, mask.columns, "obstacle center cellX");
  return Math.min(mask.worldWidth, (cellX + 0.5) * mask.cellSize);
}

export function getObstacleCellCenterY(mask: ObstacleMask, cellY: number): number {
  assertIndexInRange(cellY, mask.rows, "obstacle center cellY");
  return Math.min(mask.worldHeight, (cellY + 0.5) * mask.cellSize);
}

export function isObstacleCellOccupied(mask: ObstacleMask, cellX: number, cellY: number): boolean {
  return mask.occupied[getObstacleCellIdForCoordinates(mask, cellX, cellY)] === 1;
}

export function countOccupiedObstacleCells(mask: ObstacleMask): number {
  let count = 0;

  for (let index = 0; index < mask.cellCount; index += 1) {
    count += mask.occupied[index] === 1 ? 1 : 0;
  }

  return count;
}

export function assertObstacleMaskCompatible(mask: ObstacleMask, worldWidth: number, worldHeight: number): void {
  assertFiniteNumber(worldWidth, "obstacle compatible worldWidth");
  assertFiniteNumber(worldHeight, "obstacle compatible worldHeight");

  if (Math.abs(mask.worldWidth - worldWidth) > 0.0001 || Math.abs(mask.worldHeight - worldHeight) > 0.0001) {
    throw new Error(
      `Obstacle mask/world size mismatch: mask ${mask.worldWidth} x ${mask.worldHeight}, world ${worldWidth} x ${worldHeight}`
    );
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

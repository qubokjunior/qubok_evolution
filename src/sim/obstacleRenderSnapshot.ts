import type { ObstacleMask } from "./obstacleMask";

export const OBSTACLE_RENDER_SNAPSHOT_VERSION = "qubok_evolve.obstacle_render_snapshot.v1" as const;

export type ObstacleMaskRenderSnapshot = {
  readonly version: typeof OBSTACLE_RENDER_SNAPSHOT_VERSION;
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly cellSize: number;
  readonly columns: number;
  readonly rows: number;
  readonly cellCount: number;
  readonly occupiedCellCount: number;
  readonly occupiedCellIds: Uint32Array;
};

export function makeObstacleMaskRenderSnapshot(mask: ObstacleMask): ObstacleMaskRenderSnapshot {
  let occupiedCellCount = 0;

  for (let cellId = 0; cellId < mask.cellCount; cellId += 1) {
    occupiedCellCount += mask.occupied[cellId] === 1 ? 1 : 0;
  }

  const occupiedCellIds = new Uint32Array(occupiedCellCount);
  let writeIndex = 0;

  for (let cellId = 0; cellId < mask.cellCount; cellId += 1) {
    if (mask.occupied[cellId] !== 1) {
      continue;
    }

    occupiedCellIds[writeIndex] = cellId;
    writeIndex += 1;
  }

  return {
    version: OBSTACLE_RENDER_SNAPSHOT_VERSION,
    worldWidth: mask.worldWidth,
    worldHeight: mask.worldHeight,
    cellSize: mask.cellSize,
    columns: mask.columns,
    rows: mask.rows,
    cellCount: mask.cellCount,
    occupiedCellCount,
    occupiedCellIds
  };
}

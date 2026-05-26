import type { TerrainLayer } from "./terrain";

export const TERRAIN_RENDER_SNAPSHOT_VERSION = "qubok_evolve.terrain_render_snapshot.v1" as const;

export type TerrainRenderSnapshotConfig = {
  readonly maxCells?: number;
  readonly includeScalars?: boolean;
};

export type TerrainRenderSnapshot = {
  readonly version: typeof TERRAIN_RENDER_SNAPSHOT_VERSION;
  readonly terrainVersion: TerrainLayer["version"];
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly cellSize: number;
  readonly columns: number;
  readonly rows: number;
  readonly cellCount: number;
  readonly sampleCellCount: number;
  readonly truncated: boolean;
  readonly cellIds: Uint32Array;
  readonly materialIds: Uint16Array;
  readonly friction: Float32Array;
  readonly drag: Float32Array;
  readonly resourceAffinity: Float32Array;
  readonly movementCost: Float32Array;
};

export function makeTerrainRenderSnapshot(
  terrain: TerrainLayer,
  config: TerrainRenderSnapshotConfig = {}
): TerrainRenderSnapshot {
  const maxCells = Math.max(0, Math.min(terrain.cellCount, Math.trunc(config.maxCells ?? terrain.cellCount)));
  const includeScalars = config.includeScalars ?? true;
  const cellIds = new Uint32Array(maxCells);
  const materialIds = new Uint16Array(maxCells);
  const friction = new Float32Array(maxCells);
  const drag = new Float32Array(maxCells);
  const resourceAffinity = new Float32Array(maxCells);
  const movementCost = new Float32Array(maxCells);

  for (let index = 0; index < maxCells; index += 1) {
    cellIds[index] = index;
    materialIds[index] = terrain.materialId[index];

    if (includeScalars) {
      friction[index] = terrain.friction[index];
      drag[index] = terrain.drag[index];
      resourceAffinity[index] = terrain.resourceAffinity[index];
      movementCost[index] = terrain.movementCost[index];
    }
  }

  return {
    version: TERRAIN_RENDER_SNAPSHOT_VERSION,
    terrainVersion: terrain.version,
    worldWidth: terrain.worldWidth,
    worldHeight: terrain.worldHeight,
    cellSize: terrain.cellSize,
    columns: terrain.columns,
    rows: terrain.rows,
    cellCount: terrain.cellCount,
    sampleCellCount: maxCells,
    truncated: maxCells < terrain.cellCount,
    cellIds,
    materialIds,
    friction,
    drag,
    resourceAffinity,
    movementCost
  };
}

export function analyzeTerrainRenderSnapshot(snapshot: TerrainRenderSnapshot): {
  readonly uniqueMaterialCount: number;
  readonly minMaterialId: number;
  readonly maxMaterialId: number;
  readonly averageMovementCost: number;
} {
  const materials = new Set<number>();
  let minMaterialId = Number.POSITIVE_INFINITY;
  let maxMaterialId = Number.NEGATIVE_INFINITY;
  let movementCostSum = 0;

  for (let index = 0; index < snapshot.sampleCellCount; index += 1) {
    const materialId = snapshot.materialIds[index];
    materials.add(materialId);
    minMaterialId = Math.min(minMaterialId, materialId);
    maxMaterialId = Math.max(maxMaterialId, materialId);
    movementCostSum += snapshot.movementCost[index];
  }

  return {
    uniqueMaterialCount: materials.size,
    minMaterialId: snapshot.sampleCellCount > 0 ? minMaterialId : 0,
    maxMaterialId: snapshot.sampleCellCount > 0 ? maxMaterialId : 0,
    averageMovementCost: snapshot.sampleCellCount > 0 ? movementCostSum / snapshot.sampleCellCount : 0
  };
}

import { assertFiniteNumber, assertNonNegativeInteger } from "./arrays";
import type { EnvironmentalFieldLayer } from "./field";
import { getFieldCellIdForPosition } from "./field";
import type { ObstacleMask } from "./obstacleMask";
import { getObstacleCellCenterX, getObstacleCellCenterY } from "./obstacleMask";
import type { TerrainLayer } from "./terrain";

export const FIELD_DAMPING_VERSION = "qubok_evolve.field_damping.m45" as const;

export type FieldDampingConfig = {
  readonly enableObstacleDamping?: boolean;
  readonly enableTerrainDamping?: boolean;
  readonly obstacleDamping01?: number;
  readonly terrainDampingScale01?: number;
  readonly terrainMaterialDamping01?: readonly number[];
  readonly maxObstacleCells?: number;
  readonly maxTerrainCells?: number;
};

export type FieldDampingStepMetrics = {
  readonly obstacleSampleCount: number;
  readonly obstacleDampedCellCount: number;
  readonly terrainSampleCount: number;
  readonly terrainDampedCellCount: number;
  readonly totalMagnitudeBefore: number;
  readonly totalMagnitudeAfter: number;
  readonly totalMagnitudeDamped: number;
};

const DEFAULT_OBSTACLE_DAMPING_01 = 0.18;
const DEFAULT_TERRAIN_DAMPING_SCALE_01 = 1;
export const DEFAULT_TERRAIN_FIELD_DAMPING_BY_MATERIAL: readonly number[] = [0, 0.04, 0.08, 0.015] as const;

export function applyFieldDamping(
  field: EnvironmentalFieldLayer,
  config: FieldDampingConfig = {},
  obstacleMask?: ObstacleMask,
  terrain?: TerrainLayer
): FieldDampingStepMetrics {
  const before = measureFieldMagnitude(field);
  let obstacleSampleCount = 0;
  let obstacleDampedCellCount = 0;
  let terrainSampleCount = 0;
  let terrainDampedCellCount = 0;

  if ((config.enableObstacleDamping ?? true) && obstacleMask) {
    const obstacleStats = applyObstacleFieldDamping(field, obstacleMask, config);
    obstacleSampleCount = obstacleStats.sampleCount;
    obstacleDampedCellCount = obstacleStats.dampedCellCount;
  }

  if ((config.enableTerrainDamping ?? true) && terrain) {
    const terrainStats = applyTerrainFieldDamping(field, terrain, config);
    terrainSampleCount = terrainStats.sampleCount;
    terrainDampedCellCount = terrainStats.dampedCellCount;
  }

  const after = measureFieldMagnitude(field);
  return {
    obstacleSampleCount,
    obstacleDampedCellCount,
    terrainSampleCount,
    terrainDampedCellCount,
    totalMagnitudeBefore: before,
    totalMagnitudeAfter: after,
    totalMagnitudeDamped: Math.max(0, before - after)
  };
}

export function applyObstacleFieldDamping(
  field: EnvironmentalFieldLayer,
  obstacleMask: ObstacleMask,
  config: FieldDampingConfig = {}
): { readonly sampleCount: number; readonly dampedCellCount: number } {
  const damping01 = clamp01(config.obstacleDamping01 ?? DEFAULT_OBSTACLE_DAMPING_01);
  const maxCells = normalizeLimit(config.maxObstacleCells ?? obstacleMask.cellCount, "field damping maxObstacleCells");
  if (damping01 <= 0 || maxCells <= 0) return { sampleCount: 0, dampedCellCount: 0 };

  let sampleCount = 0;
  let dampedCellCount = 0;
  for (let obstacleCellId = 0; obstacleCellId < obstacleMask.cellCount && sampleCount < maxCells; obstacleCellId += 1) {
    if (obstacleMask.occupied[obstacleCellId] !== 1) continue;
    const cellX = obstacleCellId % obstacleMask.columns;
    const cellY = Math.floor(obstacleCellId / obstacleMask.columns);
    const fieldCellId = getFieldCellIdForPosition(field, getObstacleCellCenterX(obstacleMask, cellX), getObstacleCellCenterY(obstacleMask, cellY));
    sampleCount += 1;
    if (dampFieldCell(field, fieldCellId, damping01) > 0) dampedCellCount += 1;
  }
  return { sampleCount, dampedCellCount };
}

export function applyTerrainFieldDamping(
  field: EnvironmentalFieldLayer,
  terrain: TerrainLayer,
  config: FieldDampingConfig = {}
): { readonly sampleCount: number; readonly dampedCellCount: number } {
  const scale01 = clamp01(config.terrainDampingScale01 ?? DEFAULT_TERRAIN_DAMPING_SCALE_01);
  const materialDamping = config.terrainMaterialDamping01 ?? DEFAULT_TERRAIN_FIELD_DAMPING_BY_MATERIAL;
  const maxCells = normalizeLimit(config.maxTerrainCells ?? terrain.cellCount, "field damping maxTerrainCells");
  if (scale01 <= 0 || maxCells <= 0) return { sampleCount: 0, dampedCellCount: 0 };

  let sampleCount = 0;
  let dampedCellCount = 0;
  for (let terrainCellId = 0; terrainCellId < terrain.cellCount && sampleCount < maxCells; terrainCellId += 1) {
    const materialId = terrain.materialId[terrainCellId];
    const damping01 = clamp01((materialDamping[materialId] ?? 0) * scale01);
    if (damping01 <= 0) continue;
    const cellX = terrainCellId % terrain.columns;
    const cellY = Math.floor(terrainCellId / terrain.columns);
    const centerX = Math.min(terrain.worldWidth, (cellX + 0.5) * terrain.cellSize);
    const centerY = Math.min(terrain.worldHeight, (cellY + 0.5) * terrain.cellSize);
    const fieldCellId = getFieldCellIdForPosition(field, centerX, centerY);
    sampleCount += 1;
    if (dampFieldCell(field, fieldCellId, damping01) > 0) dampedCellCount += 1;
  }
  return { sampleCount, dampedCellCount };
}

export function dampFieldCell(field: EnvironmentalFieldLayer, fieldCellId: number, damping01: number): number {
  assertFiniteNumber(damping01, "field damping01");
  const clamped = clamp01(damping01);
  if (clamped <= 0) return 0;
  const beforeX = field.flowX[fieldCellId];
  const beforeY = field.flowY[fieldCellId];
  const beforeMagnitude = Math.hypot(beforeX, beforeY);
  if (beforeMagnitude <= 0) return 0;
  const keep = 1 - clamped;
  field.flowX[fieldCellId] = beforeX * keep;
  field.flowY[fieldCellId] = beforeY * keep;
  return beforeMagnitude - Math.hypot(field.flowX[fieldCellId], field.flowY[fieldCellId]);
}

export function measureFieldMagnitude(field: EnvironmentalFieldLayer): number {
  let magnitude = 0;
  for (let index = 0; index < field.cellCount; index += 1) magnitude += Math.hypot(field.flowX[index], field.flowY[index]);
  return magnitude;
}

function normalizeLimit(value: number, label: string): number {
  assertNonNegativeInteger(value, label);
  return Math.max(0, Math.floor(value));
}

function clamp01(value: number): number {
  assertFiniteNumber(value, "field damping scalar");
  return Math.max(0, Math.min(1, value));
}

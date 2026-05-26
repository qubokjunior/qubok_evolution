import type { EnvironmentalFieldLayer } from "./field";

export const FIELD_RENDER_SNAPSHOT_VERSION = "qubok_evolve.field_render_snapshot.v1" as const;

export type FieldRenderSnapshotConfig = {
  readonly maxVectors?: number;
  readonly stride?: number;
  readonly minMagnitude?: number;
};

export type FieldRenderSnapshot = {
  readonly version: typeof FIELD_RENDER_SNAPSHOT_VERSION;
  readonly fieldVersion: EnvironmentalFieldLayer["version"];
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly cellSize: number;
  readonly columns: number;
  readonly rows: number;
  readonly cellCount: number;
  readonly sampleVectorCount: number;
  readonly stride: number;
  readonly minMagnitude: number;
  readonly truncated: boolean;
  readonly cellIds: Uint32Array;
  readonly centerX: Float32Array;
  readonly centerY: Float32Array;
  readonly flowX: Float32Array;
  readonly flowY: Float32Array;
  readonly magnitude: Float32Array;
};

export type FieldRenderSnapshotStats = {
  readonly vectorCount: number;
  readonly averageMagnitude: number;
  readonly maxMagnitude: number;
  readonly flowXSum: number;
  readonly flowYSum: number;
};

export function makeFieldRenderSnapshot(
  field: EnvironmentalFieldLayer,
  config: FieldRenderSnapshotConfig = {}
): FieldRenderSnapshot {
  const stride = Math.max(1, Math.trunc(config.stride ?? 1));
  const minMagnitude = Math.max(0, config.minMagnitude ?? 0);
  const maxVectors = Math.max(0, Math.trunc(config.maxVectors ?? field.cellCount));
  const cellIds = new Uint32Array(maxVectors);
  const centerX = new Float32Array(maxVectors);
  const centerY = new Float32Array(maxVectors);
  const flowX = new Float32Array(maxVectors);
  const flowY = new Float32Array(maxVectors);
  const magnitude = new Float32Array(maxVectors);
  let sampleVectorCount = 0;
  let truncated = false;

  for (let cellY = 0; cellY < field.rows; cellY += stride) {
    for (let cellX = 0; cellX < field.columns; cellX += stride) {
      const cellId = cellY * field.columns + cellX;
      const vectorX = field.flowX[cellId];
      const vectorY = field.flowY[cellId];
      const vectorMagnitude = Math.hypot(vectorX, vectorY);
      if (vectorMagnitude < minMagnitude) continue;
      if (sampleVectorCount >= maxVectors) {
        truncated = true;
        break;
      }
      cellIds[sampleVectorCount] = cellId;
      centerX[sampleVectorCount] = (cellX + 0.5) * field.cellSize;
      centerY[sampleVectorCount] = (cellY + 0.5) * field.cellSize;
      flowX[sampleVectorCount] = vectorX;
      flowY[sampleVectorCount] = vectorY;
      magnitude[sampleVectorCount] = vectorMagnitude;
      sampleVectorCount += 1;
    }
    if (truncated) break;
  }

  return {
    version: FIELD_RENDER_SNAPSHOT_VERSION,
    fieldVersion: field.version,
    worldWidth: field.worldWidth,
    worldHeight: field.worldHeight,
    cellSize: field.cellSize,
    columns: field.columns,
    rows: field.rows,
    cellCount: field.cellCount,
    sampleVectorCount,
    stride,
    minMagnitude,
    truncated,
    cellIds,
    centerX,
    centerY,
    flowX,
    flowY,
    magnitude
  };
}

export function analyzeFieldRenderSnapshot(snapshot: FieldRenderSnapshot): FieldRenderSnapshotStats {
  let magnitudeSum = 0;
  let maxMagnitude = 0;
  let flowXSum = 0;
  let flowYSum = 0;

  for (let index = 0; index < snapshot.sampleVectorCount; index += 1) {
    const vectorMagnitude = snapshot.magnitude[index];
    magnitudeSum += vectorMagnitude;
    maxMagnitude = Math.max(maxMagnitude, vectorMagnitude);
    flowXSum += snapshot.flowX[index];
    flowYSum += snapshot.flowY[index];
  }

  return {
    vectorCount: snapshot.sampleVectorCount,
    averageMagnitude: snapshot.sampleVectorCount > 0 ? magnitudeSum / snapshot.sampleVectorCount : 0,
    maxMagnitude,
    flowXSum,
    flowYSum
  };
}

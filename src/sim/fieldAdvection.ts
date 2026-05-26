import { assertFiniteNumber, createFloat32Array } from "./arrays";
import type { EnvironmentalFieldLayer } from "./field";

export const FIELD_ADVECTION_VERSION = "qubok_evolve.field_advection.m46" as const;

export type FieldAdvectionBoundaryMode = "clamp" | "wrap";

export type FieldAdvectionConfig = {
  readonly enabled: boolean;
  readonly strength: number;
  readonly substeps: number;
  readonly boundaryMode: FieldAdvectionBoundaryMode;
  readonly minActiveMagnitude: number;
};

export type FieldAdvectionConfigPatch = Partial<FieldAdvectionConfig>;

export type FieldAdvectionScratch = {
  readonly flowX: Float32Array;
  readonly flowY: Float32Array;
};

export type FieldAdvectionStepMetrics = {
  readonly deltaSeconds: number;
  readonly enabled: boolean;
  readonly strength: number;
  readonly substeps: number;
  readonly boundaryMode: FieldAdvectionBoundaryMode;
  readonly sampleCount: number;
  readonly advectedCellCount: number;
  readonly maxBacktraceDistanceCells: number;
  readonly totalMagnitudeBefore: number;
  readonly totalMagnitudeAfter: number;
  readonly totalMagnitudeDelta: number;
};

type VectorSample = {
  readonly x: number;
  readonly y: number;
};

export const DEFAULT_FIELD_ADVECTION_CONFIG: FieldAdvectionConfig = Object.freeze({
  enabled: true,
  strength: 1,
  substeps: 1,
  boundaryMode: "clamp",
  minActiveMagnitude: 0.0001
});

export function makeFieldAdvectionConfig(patch: FieldAdvectionConfigPatch = {}): FieldAdvectionConfig {
  return Object.freeze({
    enabled: patch.enabled ?? DEFAULT_FIELD_ADVECTION_CONFIG.enabled,
    strength: clampFinite(patch.strength ?? DEFAULT_FIELD_ADVECTION_CONFIG.strength, 0, 64),
    substeps: clampInteger(patch.substeps ?? DEFAULT_FIELD_ADVECTION_CONFIG.substeps, 1, 16),
    boundaryMode: patch.boundaryMode === "wrap" ? "wrap" : "clamp",
    minActiveMagnitude: clampFinite(patch.minActiveMagnitude ?? DEFAULT_FIELD_ADVECTION_CONFIG.minActiveMagnitude, 0, Number.MAX_SAFE_INTEGER)
  });
}

export function createFieldAdvectionScratch(layer: EnvironmentalFieldLayer): FieldAdvectionScratch {
  return {
    flowX: createFloat32Array(layer.cellCount, "fieldAdvection.scratch.flowX"),
    flowY: createFloat32Array(layer.cellCount, "fieldAdvection.scratch.flowY")
  };
}

export function advectEnvironmentalField(
  layer: EnvironmentalFieldLayer,
  deltaSeconds: number,
  configPatch: FieldAdvectionConfigPatch = {},
  scratch: FieldAdvectionScratch = createFieldAdvectionScratch(layer),
  velocityLayer: EnvironmentalFieldLayer = layer
): FieldAdvectionStepMetrics {
  assertFiniteNumber(deltaSeconds, "field advection deltaSeconds");
  if (deltaSeconds < 0) throw new Error("field advection deltaSeconds must be non-negative.");
  assertScratch(layer, scratch);
  assertVelocityLayer(layer, velocityLayer);

  const config = makeFieldAdvectionConfig(configPatch);
  const totalMagnitudeBefore = measureTotalMagnitude(layer);

  if (!config.enabled || deltaSeconds === 0 || config.strength <= 0) {
    return {
      deltaSeconds,
      enabled: config.enabled,
      strength: config.strength,
      substeps: config.substeps,
      boundaryMode: config.boundaryMode,
      sampleCount: 0,
      advectedCellCount: 0,
      maxBacktraceDistanceCells: 0,
      totalMagnitudeBefore,
      totalMagnitudeAfter: totalMagnitudeBefore,
      totalMagnitudeDelta: 0
    };
  }

  const substepDeltaSeconds = deltaSeconds / config.substeps;
  let sampleCount = 0;
  let advectedCellCount = 0;
  let maxBacktraceDistanceCells = 0;

  for (let substep = 0; substep < config.substeps; substep += 1) {
    scratch.flowX.fill(0);
    scratch.flowY.fill(0);

    for (let cellId = 0; cellId < layer.cellCount; cellId += 1) {
      const cellX = cellId % layer.columns;
      const cellY = Math.floor(cellId / layer.columns);
      const velocity = sampleVectorAtCell(velocityLayer, cellX, cellY, config.boundaryMode);
      const backtraceX = velocity.x * config.strength * substepDeltaSeconds / layer.cellSize;
      const backtraceY = velocity.y * config.strength * substepDeltaSeconds / layer.cellSize;
      const previous = sampleVectorAtCell(layer, cellX - backtraceX, cellY - backtraceY, config.boundaryMode);

      scratch.flowX[cellId] = previous.x;
      scratch.flowY[cellId] = previous.y;
      sampleCount += 1;
      maxBacktraceDistanceCells = Math.max(maxBacktraceDistanceCells, Math.hypot(backtraceX, backtraceY));
    }

    for (let cellId = 0; cellId < layer.cellCount; cellId += 1) {
      const nextX = scratch.flowX[cellId];
      const nextY = scratch.flowY[cellId];
      if (Math.hypot(layer.flowX[cellId] - nextX, layer.flowY[cellId] - nextY) > config.minActiveMagnitude) {
        advectedCellCount += 1;
      }
      layer.flowX[cellId] = nextX;
      layer.flowY[cellId] = nextY;
    }
  }

  const totalMagnitudeAfter = measureTotalMagnitude(layer);
  return {
    deltaSeconds,
    enabled: config.enabled,
    strength: config.strength,
    substeps: config.substeps,
    boundaryMode: config.boundaryMode,
    sampleCount,
    advectedCellCount,
    maxBacktraceDistanceCells,
    totalMagnitudeBefore,
    totalMagnitudeAfter,
    totalMagnitudeDelta: totalMagnitudeAfter - totalMagnitudeBefore
  };
}

function assertScratch(layer: EnvironmentalFieldLayer, scratch: FieldAdvectionScratch): void {
  if (scratch.flowX.length !== layer.cellCount || scratch.flowY.length !== layer.cellCount) {
    throw new Error("field advection scratch arrays must match field cell count.");
  }
}

function assertVelocityLayer(layer: EnvironmentalFieldLayer, velocityLayer: EnvironmentalFieldLayer): void {
  if (velocityLayer.columns !== layer.columns || velocityLayer.rows !== layer.rows || velocityLayer.cellSize !== layer.cellSize) {
    throw new Error("field advection velocity layer must match field grid dimensions.");
  }
}

function sampleVectorAtCell(layer: EnvironmentalFieldLayer, cellX: number, cellY: number, boundaryMode: FieldAdvectionBoundaryMode): VectorSample {
  const boundedX = boundaryMode === "wrap" ? cellX : clamp(cellX, 0, layer.columns - 1);
  const boundedY = boundaryMode === "wrap" ? cellY : clamp(cellY, 0, layer.rows - 1);
  const baseX = Math.floor(boundedX);
  const baseY = Math.floor(boundedY);
  const blendX = boundedX - baseX;
  const blendY = boundedY - baseY;

  const x0 = boundaryMode === "wrap" ? wrapIndex(baseX, layer.columns) : clamp(baseX, 0, layer.columns - 1);
  const y0 = boundaryMode === "wrap" ? wrapIndex(baseY, layer.rows) : clamp(baseY, 0, layer.rows - 1);
  const x1 = boundaryMode === "wrap" ? wrapIndex(baseX + 1, layer.columns) : clamp(baseX + 1, 0, layer.columns - 1);
  const y1 = boundaryMode === "wrap" ? wrapIndex(baseY + 1, layer.rows) : clamp(baseY + 1, 0, layer.rows - 1);

  const id00 = y0 * layer.columns + x0;
  const id10 = y0 * layer.columns + x1;
  const id01 = y1 * layer.columns + x0;
  const id11 = y1 * layer.columns + x1;
  return {
    x: bilerp(layer.flowX[id00], layer.flowX[id10], layer.flowX[id01], layer.flowX[id11], blendX, blendY),
    y: bilerp(layer.flowY[id00], layer.flowY[id10], layer.flowY[id01], layer.flowY[id11], blendX, blendY)
  };
}

function measureTotalMagnitude(layer: EnvironmentalFieldLayer): number {
  let total = 0;
  for (let cellId = 0; cellId < layer.cellCount; cellId += 1) total += Math.hypot(layer.flowX[cellId], layer.flowY[cellId]);
  return total;
}

function bilerp(v00: number, v10: number, v01: number, v11: number, tx: number, ty: number): number {
  const top = v00 * (1 - tx) + v10 * tx;
  const bottom = v01 * (1 - tx) + v11 * tx;
  return top * (1 - ty) + bottom * ty;
}

function wrapIndex(index: number, size: number): number {
  return ((index % size) + size) % size;
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function clampFinite(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

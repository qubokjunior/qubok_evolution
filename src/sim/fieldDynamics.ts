import { assertFiniteNumber, createFloat32Array } from "./arrays";
import type { EnvironmentalFieldLayer } from "./field";

export const FIELD_DYNAMICS_VERSION = "qubok_evolve.field_dynamics.m42" as const;

export type FieldDynamicsConfig = {
  readonly decayPerSecond: number;
  readonly diffusionRatePerSecond: number;
  readonly minActiveMagnitude: number;
};

export type FieldDynamicsConfigPatch = Partial<FieldDynamicsConfig>;

export type FieldDynamicsScratch = {
  readonly flowX: Float32Array;
  readonly flowY: Float32Array;
};

export type FieldDynamicsStepMetrics = {
  readonly deltaSeconds: number;
  readonly activeCellCount: number;
  readonly updatedCellCount: number;
  readonly diffusionTransferCount: number;
  readonly decayFactor: number;
  readonly diffusionAlpha: number;
  readonly totalMagnitudeBefore: number;
  readonly totalMagnitudeAfterDecay: number;
  readonly totalMagnitudeAfter: number;
  readonly decayMagnitudeLoss: number;
  readonly diffusionMagnitudeDelta: number;
};

export const DEFAULT_FIELD_DYNAMICS_CONFIG: FieldDynamicsConfig = Object.freeze({
  decayPerSecond: 0.05,
  diffusionRatePerSecond: 0.15,
  minActiveMagnitude: 0.0001
});

export function makeFieldDynamicsConfig(patch: FieldDynamicsConfigPatch = {}): FieldDynamicsConfig {
  return Object.freeze({
    decayPerSecond: clampFinite(patch.decayPerSecond ?? DEFAULT_FIELD_DYNAMICS_CONFIG.decayPerSecond, 0, 64),
    diffusionRatePerSecond: clampFinite(patch.diffusionRatePerSecond ?? DEFAULT_FIELD_DYNAMICS_CONFIG.diffusionRatePerSecond, 0, 64),
    minActiveMagnitude: clampFinite(patch.minActiveMagnitude ?? DEFAULT_FIELD_DYNAMICS_CONFIG.minActiveMagnitude, 0, Number.MAX_SAFE_INTEGER)
  });
}

export function createFieldDynamicsScratch(layer: EnvironmentalFieldLayer): FieldDynamicsScratch {
  return {
    flowX: createFloat32Array(layer.cellCount, "fieldDynamics.scratch.flowX"),
    flowY: createFloat32Array(layer.cellCount, "fieldDynamics.scratch.flowY")
  };
}

export function stepEnvironmentalFieldDynamics(layer: EnvironmentalFieldLayer, deltaSeconds: number, configPatch: FieldDynamicsConfigPatch = {}, scratch: FieldDynamicsScratch = createFieldDynamicsScratch(layer)): FieldDynamicsStepMetrics {
  assertFiniteNumber(deltaSeconds, "field dynamics deltaSeconds");
  if (deltaSeconds < 0) throw new Error("field dynamics deltaSeconds must be non-negative.");
  assertScratch(layer, scratch);

  const config = makeFieldDynamicsConfig(configPatch);
  const decayFactor = Math.max(0, 1 - config.decayPerSecond * deltaSeconds);
  const diffusionAlpha = Math.max(0, Math.min(1, config.diffusionRatePerSecond * deltaSeconds));

  scratch.flowX.fill(0);
  scratch.flowY.fill(0);

  let activeCellCount = 0;
  let diffusionTransferCount = 0;
  let totalMagnitudeBefore = 0;
  let totalMagnitudeAfterDecay = 0;

  for (let cellId = 0; cellId < layer.cellCount; cellId += 1) {
    const flowX = layer.flowX[cellId];
    const flowY = layer.flowY[cellId];
    const magnitudeBefore = Math.hypot(flowX, flowY);
    totalMagnitudeBefore += magnitudeBefore;
    if (magnitudeBefore > config.minActiveMagnitude) activeCellCount += 1;

    const decayedX = flowX * decayFactor;
    const decayedY = flowY * decayFactor;
    totalMagnitudeAfterDecay += Math.hypot(decayedX, decayedY);

    if (diffusionAlpha <= 0) {
      scratch.flowX[cellId] += decayedX;
      scratch.flowY[cellId] += decayedY;
      continue;
    }

    const neighborCount = countCardinalNeighbors(layer, cellId);
    if (neighborCount <= 0) {
      scratch.flowX[cellId] += decayedX;
      scratch.flowY[cellId] += decayedY;
      continue;
    }

    const retained = 1 - diffusionAlpha;
    scratch.flowX[cellId] += decayedX * retained;
    scratch.flowY[cellId] += decayedY * retained;

    const shareX = decayedX * diffusionAlpha / neighborCount;
    const shareY = decayedY * diffusionAlpha / neighborCount;
    diffusionTransferCount += addToCardinalNeighbors(layer, scratch, cellId, shareX, shareY);
  }

  let updatedCellCount = 0;
  let totalMagnitudeAfter = 0;
  for (let cellId = 0; cellId < layer.cellCount; cellId += 1) {
    const nextX = scratch.flowX[cellId];
    const nextY = scratch.flowY[cellId];
    if (Math.hypot(layer.flowX[cellId] - nextX, layer.flowY[cellId] - nextY) > config.minActiveMagnitude) {
      updatedCellCount += 1;
    }
    layer.flowX[cellId] = nextX;
    layer.flowY[cellId] = nextY;
    totalMagnitudeAfter += Math.hypot(nextX, nextY);
  }

  return {
    deltaSeconds,
    activeCellCount,
    updatedCellCount,
    diffusionTransferCount,
    decayFactor,
    diffusionAlpha,
    totalMagnitudeBefore,
    totalMagnitudeAfterDecay,
    totalMagnitudeAfter,
    decayMagnitudeLoss: Math.max(0, totalMagnitudeBefore - totalMagnitudeAfterDecay),
    diffusionMagnitudeDelta: totalMagnitudeAfter - totalMagnitudeAfterDecay
  };
}

function assertScratch(layer: EnvironmentalFieldLayer, scratch: FieldDynamicsScratch): void {
  if (scratch.flowX.length !== layer.cellCount || scratch.flowY.length !== layer.cellCount) {
    throw new Error("field dynamics scratch arrays must match field cell count.");
  }
}

function countCardinalNeighbors(layer: EnvironmentalFieldLayer, cellId: number): number {
  const cellX = cellId % layer.columns;
  const cellY = Math.floor(cellId / layer.columns);
  let count = 0;
  if (cellX > 0) count += 1;
  if (cellX < layer.columns - 1) count += 1;
  if (cellY > 0) count += 1;
  if (cellY < layer.rows - 1) count += 1;
  return count;
}

function addToCardinalNeighbors(layer: EnvironmentalFieldLayer, scratch: FieldDynamicsScratch, cellId: number, flowX: number, flowY: number): number {
  const cellX = cellId % layer.columns;
  const cellY = Math.floor(cellId / layer.columns);
  let transferCount = 0;
  if (cellX > 0) { addToCell(scratch, cellId - 1, flowX, flowY); transferCount += 1; }
  if (cellX < layer.columns - 1) { addToCell(scratch, cellId + 1, flowX, flowY); transferCount += 1; }
  if (cellY > 0) { addToCell(scratch, cellId - layer.columns, flowX, flowY); transferCount += 1; }
  if (cellY < layer.rows - 1) { addToCell(scratch, cellId + layer.columns, flowX, flowY); transferCount += 1; }
  return transferCount;
}

function addToCell(scratch: FieldDynamicsScratch, cellId: number, flowX: number, flowY: number): void {
  scratch.flowX[cellId] += flowX;
  scratch.flowY[cellId] += flowY;
}

function clampFinite(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

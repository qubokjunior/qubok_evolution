import { assertFiniteNumber } from "./arrays";
import { getFieldCellIdForPosition, type EnvironmentalFieldLayer } from "./field";

export const FIELD_SOURCES_VERSION = "qubok_evolve.field_sources.m43" as const;

export type FieldPointSource = {
  readonly x: number;
  readonly y: number;
  readonly flowX: number;
  readonly flowY: number;
  readonly strength?: number;
};

export type FieldPointSink = {
  readonly x: number;
  readonly y: number;
  readonly absorption01: number;
};

export type FieldSourceStepMetrics = {
  readonly sourceCount: number;
  readonly sinkCount: number;
  readonly emittedCellCount: number;
  readonly absorbedCellCount: number;
  readonly totalFlowXEmitted: number;
  readonly totalFlowYEmitted: number;
  readonly totalMagnitudeEmitted: number;
  readonly totalMagnitudeAbsorbed: number;
  readonly totalMagnitudeAfter: number;
};

const EMPTY_METRICS: FieldSourceStepMetrics = Object.freeze({
  sourceCount: 0,
  sinkCount: 0,
  emittedCellCount: 0,
  absorbedCellCount: 0,
  totalFlowXEmitted: 0,
  totalFlowYEmitted: 0,
  totalMagnitudeEmitted: 0,
  totalMagnitudeAbsorbed: 0,
  totalMagnitudeAfter: 0
});

export function emitFieldPointSource(layer: EnvironmentalFieldLayer, source: FieldPointSource): number {
  assertFiniteNumber(source.x, "field source x");
  assertFiniteNumber(source.y, "field source y");
  assertFiniteNumber(source.flowX, "field source flowX");
  assertFiniteNumber(source.flowY, "field source flowY");
  const strength = source.strength ?? 1;
  assertFiniteNumber(strength, "field source strength");
  const cellId = getFieldCellIdForPosition(layer, source.x, source.y);
  layer.flowX[cellId] += source.flowX * strength;
  layer.flowY[cellId] += source.flowY * strength;
  return cellId;
}

export function absorbFieldPointSink(layer: EnvironmentalFieldLayer, sink: FieldPointSink): number {
  assertFiniteNumber(sink.x, "field sink x");
  assertFiniteNumber(sink.y, "field sink y");
  assertFiniteNumber(sink.absorption01, "field sink absorption01");
  const absorption01 = clamp01(sink.absorption01);
  const cellId = getFieldCellIdForPosition(layer, sink.x, sink.y);
  const keep = 1 - absorption01;
  layer.flowX[cellId] *= keep;
  layer.flowY[cellId] *= keep;
  return cellId;
}

export function applyFieldSourcesAndSinks(layer: EnvironmentalFieldLayer, sources: readonly FieldPointSource[] = [], sinks: readonly FieldPointSink[] = []): FieldSourceStepMetrics {
  if (sources.length === 0 && sinks.length === 0) {
    return { ...EMPTY_METRICS, totalMagnitudeAfter: measureTotalFieldMagnitude(layer) };
  }

  const touchedEmitCells = new Set<number>();
  const touchedSinkCells = new Set<number>();
  let totalFlowXEmitted = 0;
  let totalFlowYEmitted = 0;
  let totalMagnitudeEmitted = 0;
  let totalMagnitudeAbsorbed = 0;

  for (const source of sources) {
    const strength = source.strength ?? 1;
    const emittedX = source.flowX * strength;
    const emittedY = source.flowY * strength;
    const cellId = emitFieldPointSource(layer, source);
    touchedEmitCells.add(cellId);
    totalFlowXEmitted += emittedX;
    totalFlowYEmitted += emittedY;
    totalMagnitudeEmitted += Math.hypot(emittedX, emittedY);
  }

  for (const sink of sinks) {
    const cellId = getFieldCellIdForPosition(layer, sink.x, sink.y);
    const before = Math.hypot(layer.flowX[cellId], layer.flowY[cellId]);
    absorbFieldPointSink(layer, sink);
    const after = Math.hypot(layer.flowX[cellId], layer.flowY[cellId]);
    touchedSinkCells.add(cellId);
    totalMagnitudeAbsorbed += Math.max(0, before - after);
  }

  return {
    sourceCount: sources.length,
    sinkCount: sinks.length,
    emittedCellCount: touchedEmitCells.size,
    absorbedCellCount: touchedSinkCells.size,
    totalFlowXEmitted,
    totalFlowYEmitted,
    totalMagnitudeEmitted,
    totalMagnitudeAbsorbed,
    totalMagnitudeAfter: measureTotalFieldMagnitude(layer)
  };
}

export function measureTotalFieldMagnitude(layer: EnvironmentalFieldLayer): number {
  let total = 0;
  for (let cellId = 0; cellId < layer.cellCount; cellId += 1) {
    total += Math.hypot(layer.flowX[cellId], layer.flowY[cellId]);
  }
  return total;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

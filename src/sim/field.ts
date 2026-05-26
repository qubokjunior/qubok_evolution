import { assertFiniteNumber, assertIndexInRange, createFloat32Array } from "./arrays";

export const FIELD_LAYER_VERSION = "qubok_evolve.environmental_field.v1" as const;

export type EnvironmentalFieldLayerConfig = {
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly cellSize: number;
  readonly defaultFlowX?: number;
  readonly defaultFlowY?: number;
};

export type EnvironmentalFieldLayer = {
  readonly version: typeof FIELD_LAYER_VERSION;
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly cellSize: number;
  readonly columns: number;
  readonly rows: number;
  readonly cellCount: number;
  readonly flowX: Float32Array;
  readonly flowY: Float32Array;
};

export type EnvironmentalFieldSample = {
  readonly cellId: number;
  readonly cellX: number;
  readonly cellY: number;
  readonly flowX: number;
  readonly flowY: number;
  readonly flowMagnitude: number;
};

export function createEnvironmentalFieldLayer(config: EnvironmentalFieldLayerConfig): EnvironmentalFieldLayer {
  assertFiniteNumber(config.worldWidth, "field worldWidth");
  assertFiniteNumber(config.worldHeight, "field worldHeight");
  assertFiniteNumber(config.cellSize, "field cellSize");
  if (config.worldWidth <= 0 || config.worldHeight <= 0 || config.cellSize <= 0) throw new Error("Field dimensions and cell size must be positive.");
  const columns = Math.max(1, Math.ceil(config.worldWidth / config.cellSize));
  const rows = Math.max(1, Math.ceil(config.worldHeight / config.cellSize));
  const cellCount = columns * rows;
  const layer: EnvironmentalFieldLayer = { version: FIELD_LAYER_VERSION, worldWidth: config.worldWidth, worldHeight: config.worldHeight, cellSize: config.cellSize, columns, rows, cellCount, flowX: createFloat32Array(cellCount, "field.flowX"), flowY: createFloat32Array(cellCount, "field.flowY") };
  fillEnvironmentalField(layer, config.defaultFlowX ?? 0, config.defaultFlowY ?? 0);
  return layer;
}

export function fillEnvironmentalField(layer: EnvironmentalFieldLayer, flowX = 0, flowY = 0): void {
  assertFiniteNumber(flowX, "field fill flowX");
  assertFiniteNumber(flowY, "field fill flowY");
  layer.flowX.fill(flowX);
  layer.flowY.fill(flowY);
}

export function setFieldCell(layer: EnvironmentalFieldLayer, cellX: number, cellY: number, flowX: number, flowY: number): number {
  assertFiniteNumber(flowX, "field cell flowX");
  assertFiniteNumber(flowY, "field cell flowY");
  const cellId = getFieldCellId(layer, cellX, cellY);
  layer.flowX[cellId] = flowX;
  layer.flowY[cellId] = flowY;
  return cellId;
}

export function addFieldCellFlow(layer: EnvironmentalFieldLayer, cellX: number, cellY: number, flowX: number, flowY: number): number {
  assertFiniteNumber(flowX, "field add flowX");
  assertFiniteNumber(flowY, "field add flowY");
  const cellId = getFieldCellId(layer, cellX, cellY);
  layer.flowX[cellId] += flowX;
  layer.flowY[cellId] += flowY;
  return cellId;
}

export function sampleFieldAtPosition(layer: EnvironmentalFieldLayer, x: number, y: number): EnvironmentalFieldSample {
  const cellX = getFieldCellXForPosition(layer, x);
  const cellY = getFieldCellYForPosition(layer, y);
  const cellId = getFieldCellId(layer, cellX, cellY);
  const flowX = layer.flowX[cellId];
  const flowY = layer.flowY[cellId];
  return { cellId, cellX, cellY, flowX, flowY, flowMagnitude: Math.hypot(flowX, flowY) };
}

export function getFieldCellIdForPosition(layer: EnvironmentalFieldLayer, x: number, y: number): number {
  return getFieldCellId(layer, getFieldCellXForPosition(layer, x), getFieldCellYForPosition(layer, y));
}

export function getFieldCellId(layer: EnvironmentalFieldLayer, cellX: number, cellY: number): number {
  assertIndexInRange(cellX, layer.columns, "field cellX");
  assertIndexInRange(cellY, layer.rows, "field cellY");
  return cellY * layer.columns + cellX;
}

export function getFieldCellXForPosition(layer: EnvironmentalFieldLayer, x: number): number {
  assertFiniteNumber(x, "field x");
  return clamp(Math.floor(x / layer.cellSize), 0, layer.columns - 1);
}

export function getFieldCellYForPosition(layer: EnvironmentalFieldLayer, y: number): number {
  assertFiniteNumber(y, "field y");
  return clamp(Math.floor(y / layer.cellSize), 0, layer.rows - 1);
}

export function getEnvironmentalFieldMemoryBytes(layer: EnvironmentalFieldLayer): number {
  return layer.flowX.byteLength + layer.flowY.byteLength;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

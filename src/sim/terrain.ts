import {
  assertFiniteNumber,
  assertIndexInRange,
  assertNonNegativeInteger,
  createFloat32Array,
  createUint16Array
} from "./arrays";

export const TERRAIN_LAYER_VERSION = "qubok_evolve.terrain_layer.v1" as const;

export type TerrainMaterialDefinition = {
  readonly id: number;
  readonly name: string;
  readonly friction: number;
  readonly drag: number;
  readonly resourceAffinity: number;
  readonly movementCost: number;
};

export type TerrainLayerConfig = {
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly cellSize: number;
  readonly defaultMaterialId?: number;
  readonly materialDefinitions?: readonly TerrainMaterialDefinition[];
};

export type TerrainLayer = {
  readonly version: typeof TERRAIN_LAYER_VERSION;
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly cellSize: number;
  readonly columns: number;
  readonly rows: number;
  readonly cellCount: number;
  readonly materialDefinitions: readonly TerrainMaterialDefinition[];
  readonly materialId: Uint16Array;
  readonly friction: Float32Array;
  readonly drag: Float32Array;
  readonly resourceAffinity: Float32Array;
  readonly movementCost: Float32Array;
};

export type TerrainSample = {
  readonly cellId: number;
  readonly cellX: number;
  readonly cellY: number;
  readonly materialId: number;
  readonly friction: number;
  readonly drag: number;
  readonly resourceAffinity: number;
  readonly movementCost: number;
};

export type TerrainRectFillStats = {
  readonly changedCellCount: number;
  readonly updatedCellCount: number;
};

export const DEFAULT_TERRAIN_MATERIALS: readonly TerrainMaterialDefinition[] = [
  { id: 0, name: "soil", friction: 1, drag: 0.02, resourceAffinity: 1, movementCost: 1 },
  { id: 1, name: "mud", friction: 0.72, drag: 0.12, resourceAffinity: 1.25, movementCost: 1.35 },
  { id: 2, name: "shallow_water", friction: 0.55, drag: 0.25, resourceAffinity: 0.85, movementCost: 1.75 },
  { id: 3, name: "stone", friction: 1.18, drag: 0.01, resourceAffinity: 0.35, movementCost: 1.1 }
];

export function createTerrainLayer(config: TerrainLayerConfig): TerrainLayer {
  assertFiniteNumber(config.worldWidth, "terrain worldWidth");
  assertFiniteNumber(config.worldHeight, "terrain worldHeight");
  assertFiniteNumber(config.cellSize, "terrain cellSize");

  if (config.worldWidth <= 0 || config.worldHeight <= 0 || config.cellSize <= 0) {
    throw new Error("Terrain dimensions and cell size must be positive.");
  }

  const columns = Math.max(1, Math.ceil(config.worldWidth / config.cellSize));
  const rows = Math.max(1, Math.ceil(config.worldHeight / config.cellSize));
  const cellCount = columns * rows;
  const materialDefinitions = resolveMaterialDefinitions(config.materialDefinitions ?? DEFAULT_TERRAIN_MATERIALS);
  const defaultMaterialId = config.defaultMaterialId ?? 0;

  const layer: TerrainLayer = {
    version: TERRAIN_LAYER_VERSION,
    worldWidth: config.worldWidth,
    worldHeight: config.worldHeight,
    cellSize: config.cellSize,
    columns,
    rows,
    cellCount,
    materialDefinitions,
    materialId: createUint16Array(cellCount, "terrain.materialId"),
    friction: createFloat32Array(cellCount, "terrain.friction"),
    drag: createFloat32Array(cellCount, "terrain.drag"),
    resourceAffinity: createFloat32Array(cellCount, "terrain.resourceAffinity"),
    movementCost: createFloat32Array(cellCount, "terrain.movementCost")
  };

  fillTerrainMaterial(layer, defaultMaterialId);
  return layer;
}

export function fillTerrainMaterial(layer: TerrainLayer, materialId: number): void {
  const material = getTerrainMaterialDefinition(layer, materialId);
  layer.materialId.fill(material.id);
  layer.friction.fill(material.friction);
  layer.drag.fill(material.drag);
  layer.resourceAffinity.fill(material.resourceAffinity);
  layer.movementCost.fill(material.movementCost);
}

export function setTerrainCellMaterial(layer: TerrainLayer, cellX: number, cellY: number, materialId: number): number {
  const cellId = getTerrainCellId(layer, cellX, cellY);
  writeMaterialToCell(layer, cellId, getTerrainMaterialDefinition(layer, materialId));
  return cellId;
}

export function setTerrainRectMaterial(layer: TerrainLayer, minX: number, minY: number, maxX: number, maxY: number, materialId: number): TerrainRectFillStats {
  assertFiniteNumber(minX, "terrain rect minX");
  assertFiniteNumber(minY, "terrain rect minY");
  assertFiniteNumber(maxX, "terrain rect maxX");
  assertFiniteNumber(maxY, "terrain rect maxY");
  const material = getTerrainMaterialDefinition(layer, materialId);
  const left = Math.min(minX, maxX);
  const right = Math.max(minX, maxX);
  const top = Math.min(minY, maxY);
  const bottom = Math.max(minY, maxY);
  const minCellX = clamp(Math.floor(left / layer.cellSize), 0, layer.columns - 1);
  const maxCellX = clamp(Math.floor(right / layer.cellSize), 0, layer.columns - 1);
  const minCellY = clamp(Math.floor(top / layer.cellSize), 0, layer.rows - 1);
  const maxCellY = clamp(Math.floor(bottom / layer.cellSize), 0, layer.rows - 1);
  let changedCellCount = 0;
  let updatedCellCount = 0;
  for (let y = minCellY; y <= maxCellY; y += 1) {
    for (let x = minCellX; x <= maxCellX; x += 1) {
      const cellId = getTerrainCellId(layer, x, y);
      if (layer.materialId[cellId] !== material.id) changedCellCount += 1;
      writeMaterialToCell(layer, cellId, material);
      updatedCellCount += 1;
    }
  }
  return { changedCellCount, updatedCellCount };
}

export function sampleTerrainAtPosition(layer: TerrainLayer, x: number, y: number): TerrainSample {
  const cellX = getTerrainCellXForPosition(layer, x);
  const cellY = getTerrainCellYForPosition(layer, y);
  const cellId = getTerrainCellId(layer, cellX, cellY);
  return {
    cellId,
    cellX,
    cellY,
    materialId: layer.materialId[cellId],
    friction: layer.friction[cellId],
    drag: layer.drag[cellId],
    resourceAffinity: layer.resourceAffinity[cellId],
    movementCost: layer.movementCost[cellId]
  };
}

export function getTerrainCellIdForPosition(layer: TerrainLayer, x: number, y: number): number {
  return getTerrainCellId(layer, getTerrainCellXForPosition(layer, x), getTerrainCellYForPosition(layer, y));
}

export function getTerrainCellId(layer: TerrainLayer, cellX: number, cellY: number): number {
  assertIndexInRange(cellX, layer.columns, "terrain cellX");
  assertIndexInRange(cellY, layer.rows, "terrain cellY");
  return cellY * layer.columns + cellX;
}

export function getTerrainCellXForPosition(layer: TerrainLayer, x: number): number {
  assertFiniteNumber(x, "terrain x");
  return clamp(Math.floor(x / layer.cellSize), 0, layer.columns - 1);
}

export function getTerrainCellYForPosition(layer: TerrainLayer, y: number): number {
  assertFiniteNumber(y, "terrain y");
  return clamp(Math.floor(y / layer.cellSize), 0, layer.rows - 1);
}

export function getTerrainMaterialDefinition(layer: TerrainLayer, materialId: number): TerrainMaterialDefinition {
  assertMaterialId(materialId);
  const material = layer.materialDefinitions.find((definition) => definition.id === materialId);
  if (!material) throw new Error("Unknown terrain material id: " + materialId);
  return material;
}

export function getTerrainMemoryBytes(layer: TerrainLayer): number {
  return layer.materialId.byteLength + layer.friction.byteLength + layer.drag.byteLength + layer.resourceAffinity.byteLength + layer.movementCost.byteLength;
}

function writeMaterialToCell(layer: TerrainLayer, cellId: number, material: TerrainMaterialDefinition): void {
  layer.materialId[cellId] = material.id;
  layer.friction[cellId] = material.friction;
  layer.drag[cellId] = material.drag;
  layer.resourceAffinity[cellId] = material.resourceAffinity;
  layer.movementCost[cellId] = material.movementCost;
}

function resolveMaterialDefinitions(definitions: readonly TerrainMaterialDefinition[]): readonly TerrainMaterialDefinition[] {
  if (definitions.length === 0) throw new Error("Terrain must define at least one material.");
  const seen = new Set<number>();
  return definitions.map((definition) => {
    assertMaterialId(definition.id);
    if (seen.has(definition.id)) throw new Error("Duplicate terrain material id: " + definition.id);
    seen.add(definition.id);
    assertFiniteNumber(definition.friction, "terrain material friction");
    assertFiniteNumber(definition.drag, "terrain material drag");
    assertFiniteNumber(definition.resourceAffinity, "terrain material resourceAffinity");
    assertFiniteNumber(definition.movementCost, "terrain material movementCost");
    if (definition.friction < 0 || definition.drag < 0 || definition.resourceAffinity < 0 || definition.movementCost < 0) {
      throw new Error("Terrain material scalar values must be non-negative.");
    }
    return { ...definition };
  });
}

function assertMaterialId(materialId: number): void {
  assertNonNegativeInteger(materialId, "terrain materialId");
  if (materialId > 0xffff) throw new Error("terrain materialId must fit Uint16. Received: " + materialId);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

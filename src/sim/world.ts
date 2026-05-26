import {
  assertFiniteNumber,
  assertIndexInRange,
  assertPositiveInteger,
  clearArrays,
  createFloat32Array,
  createUint8Array,
  createUint16Array,
  createUint32Array,
  getArraysByteLength,
  type RuntimeArraySet
} from "./arrays";

export const WORLD_STATE_VERSION = "qubok_evolve.world_state.v1" as const;

export type RngLike = {
  range: (min: number, max: number) => number;
  int: (minInclusive: number, maxExclusive: number) => number;
  nextFloat01: () => number;
};

export type WorldConfig = {
  readonly capacity: number;
  readonly worldWidth?: number;
  readonly worldHeight?: number;
  readonly sectorCount?: number;
};

export type SpawnAgentInput = {
  readonly x?: number;
  readonly y?: number;
  readonly vx?: number;
  readonly vy?: number;
  readonly headingX?: number;
  readonly headingY?: number;
  readonly radius?: number;
  readonly mass?: number;
  readonly drag?: number;
  readonly maxSpeed?: number;
  readonly turnRate?: number;
  readonly energy?: number;
  readonly stamina?: number;
  readonly health?: number;
  readonly metabolism?: number;
  readonly maxEnergy?: number;
  readonly maxStamina?: number;
  readonly dietMask?: number;
  readonly armor?: number;
  readonly mouthPower?: number;
  readonly landThrust?: number;
  readonly waterThrust?: number;
  readonly flowAffinity?: number;
  readonly terrainAffinity?: number;
  readonly visionRadius?: number;
  readonly visionCosHalfCone?: number;
  readonly componentFlags?: number;
  readonly archetypeId?: number;
  readonly speciesId?: number;
  readonly colorRGBA?: number;
  readonly genomeId?: number;
  readonly generationId?: number;
  readonly parentGenomeId?: number;
};

export type WorldState = {
  readonly version: typeof WORLD_STATE_VERSION;
  readonly capacity: number;
  readonly sectorCount: number;
  readonly worldWidth: number;
  readonly worldHeight: number;
  count: number;
  tick: number;
  timeSeconds: number;

  reusableSlotCount: number;
  spawnReusedSlotCount: number;
  spawnAppendedSlotCount: number;
  readonly reusableSlots: Uint32Array;
  readonly reusableSlotFlags: Uint8Array;

  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly vx: Float32Array;
  readonly vy: Float32Array;
  readonly fx: Float32Array;
  readonly fy: Float32Array;
  readonly headingX: Float32Array;
  readonly headingY: Float32Array;
  readonly energy: Float32Array;
  readonly stamina: Float32Array;
  readonly health: Float32Array;
  readonly alive: Uint8Array;

  readonly radius: Float32Array;
  readonly mass: Float32Array;
  readonly drag: Float32Array;
  readonly maxSpeed: Float32Array;
  readonly turnRate: Float32Array;
  readonly metabolism: Float32Array;
  readonly maxEnergy: Float32Array;
  readonly maxStamina: Float32Array;
  readonly dietMask: Uint32Array;
  readonly armor: Float32Array;
  readonly mouthPower: Float32Array;
  readonly landThrust: Float32Array;
  readonly waterThrust: Float32Array;
  readonly flowAffinity: Float32Array;
  readonly terrainAffinity: Float32Array;
  readonly visionRadius: Float32Array;
  readonly visionCosHalfCone: Float32Array;
  readonly sensorSectorBase: Uint32Array;
  readonly brainWeightOffset: Uint32Array;
  readonly brainWeightCount: Uint16Array;
  readonly componentFlags: Uint32Array;
  readonly archetypeId: Uint16Array;
  readonly speciesId: Uint16Array;
  readonly colorRGBA: Uint32Array;
  readonly genomeId: Uint32Array;

  readonly terrainCellId: Uint16Array;
  readonly flowSampleX: Float32Array;
  readonly flowSampleY: Float32Array;
  readonly sectorFood: Float32Array;
  readonly sectorThreat: Float32Array;
  readonly sectorAlly: Float32Array;
  readonly sectorObstacle: Float32Array;
  readonly averageNeighborHeadingX: Float32Array;
  readonly averageNeighborHeadingY: Float32Array;
  readonly localCentroidX: Float32Array;
  readonly localCentroidY: Float32Array;
  readonly separationX: Float32Array;
  readonly separationY: Float32Array;

  readonly fitnessAccum: Float32Array;
  readonly offspringCount: Uint16Array;
  readonly damageTaken: Float32Array;
  readonly foodEaten: Float32Array;
  readonly kills: Uint16Array;
  readonly distanceExplored: Float32Array;
  readonly age: Float32Array;
  readonly generationId: Uint32Array;
  readonly parentGenomeId: Uint32Array;
};

export type WorldSnapshot = {
  readonly version: typeof WORLD_STATE_VERSION;
  readonly capacity: number;
  readonly count: number;
  readonly tick: number;
  readonly timeSeconds: number;
  readonly reusableSlotCount: number;
  readonly spawnReusedSlotCount: number;
  readonly spawnAppendedSlotCount: number;
  readonly sampleCount: number;
  readonly x: readonly number[];
  readonly y: readonly number[];
  readonly energy: readonly number[];
  readonly speciesId: readonly number[];
  readonly genomeId: readonly number[];
};

export function createWorldState(config: WorldConfig): WorldState {
  assertPositiveInteger(config.capacity, "capacity");

  const capacity = config.capacity;
  const sectorCount = config.sectorCount ?? 8;
  const worldWidth = config.worldWidth ?? 2048;
  const worldHeight = config.worldHeight ?? 2048;

  assertPositiveInteger(sectorCount, "sectorCount");
  assertFiniteNumber(worldWidth, "worldWidth");
  assertFiniteNumber(worldHeight, "worldHeight");

  if (worldWidth <= 0 || worldHeight <= 0) {
    throw new Error(`World dimensions must be positive. Received ${worldWidth} x ${worldHeight}`);
  }

  const sectorPoolLength = capacity * sectorCount;

  return {
    version: WORLD_STATE_VERSION,
    capacity,
    sectorCount,
    worldWidth,
    worldHeight,
    count: 0,
    tick: 0,
    timeSeconds: 0,

    reusableSlotCount: 0,
    spawnReusedSlotCount: 0,
    spawnAppendedSlotCount: 0,
    reusableSlots: createUint32Array(capacity, "reusableSlots"),
    reusableSlotFlags: createUint8Array(capacity, "reusableSlotFlags"),

    x: createFloat32Array(capacity, "x"),
    y: createFloat32Array(capacity, "y"),
    vx: createFloat32Array(capacity, "vx"),
    vy: createFloat32Array(capacity, "vy"),
    fx: createFloat32Array(capacity, "fx"),
    fy: createFloat32Array(capacity, "fy"),
    headingX: createFloat32Array(capacity, "headingX"),
    headingY: createFloat32Array(capacity, "headingY"),
    energy: createFloat32Array(capacity, "energy"),
    stamina: createFloat32Array(capacity, "stamina"),
    health: createFloat32Array(capacity, "health"),
    alive: createUint8Array(capacity, "alive"),

    radius: createFloat32Array(capacity, "radius"),
    mass: createFloat32Array(capacity, "mass"),
    drag: createFloat32Array(capacity, "drag"),
    maxSpeed: createFloat32Array(capacity, "maxSpeed"),
    turnRate: createFloat32Array(capacity, "turnRate"),
    metabolism: createFloat32Array(capacity, "metabolism"),
    maxEnergy: createFloat32Array(capacity, "maxEnergy"),
    maxStamina: createFloat32Array(capacity, "maxStamina"),
    dietMask: createUint32Array(capacity, "dietMask"),
    armor: createFloat32Array(capacity, "armor"),
    mouthPower: createFloat32Array(capacity, "mouthPower"),
    landThrust: createFloat32Array(capacity, "landThrust"),
    waterThrust: createFloat32Array(capacity, "waterThrust"),
    flowAffinity: createFloat32Array(capacity, "flowAffinity"),
    terrainAffinity: createFloat32Array(capacity, "terrainAffinity"),
    visionRadius: createFloat32Array(capacity, "visionRadius"),
    visionCosHalfCone: createFloat32Array(capacity, "visionCosHalfCone"),
    sensorSectorBase: createUint32Array(capacity, "sensorSectorBase"),
    brainWeightOffset: createUint32Array(capacity, "brainWeightOffset"),
    brainWeightCount: createUint16Array(capacity, "brainWeightCount"),
    componentFlags: createUint32Array(capacity, "componentFlags"),
    archetypeId: createUint16Array(capacity, "archetypeId"),
    speciesId: createUint16Array(capacity, "speciesId"),
    colorRGBA: createUint32Array(capacity, "colorRGBA"),
    genomeId: createUint32Array(capacity, "genomeId"),

    terrainCellId: createUint16Array(capacity, "terrainCellId"),
    flowSampleX: createFloat32Array(capacity, "flowSampleX"),
    flowSampleY: createFloat32Array(capacity, "flowSampleY"),
    sectorFood: createFloat32Array(sectorPoolLength, "sectorFood"),
    sectorThreat: createFloat32Array(sectorPoolLength, "sectorThreat"),
    sectorAlly: createFloat32Array(sectorPoolLength, "sectorAlly"),
    sectorObstacle: createFloat32Array(sectorPoolLength, "sectorObstacle"),
    averageNeighborHeadingX: createFloat32Array(capacity, "averageNeighborHeadingX"),
    averageNeighborHeadingY: createFloat32Array(capacity, "averageNeighborHeadingY"),
    localCentroidX: createFloat32Array(capacity, "localCentroidX"),
    localCentroidY: createFloat32Array(capacity, "localCentroidY"),
    separationX: createFloat32Array(capacity, "separationX"),
    separationY: createFloat32Array(capacity, "separationY"),

    fitnessAccum: createFloat32Array(capacity, "fitnessAccum"),
    offspringCount: createUint16Array(capacity, "offspringCount"),
    damageTaken: createFloat32Array(capacity, "damageTaken"),
    foodEaten: createFloat32Array(capacity, "foodEaten"),
    kills: createUint16Array(capacity, "kills"),
    distanceExplored: createFloat32Array(capacity, "distanceExplored"),
    age: createFloat32Array(capacity, "age"),
    generationId: createUint32Array(capacity, "generationId"),
    parentGenomeId: createUint32Array(capacity, "parentGenomeId")
  };
}

export function getWorldRuntimeArrays(world: WorldState): RuntimeArraySet {
  return [
    world.reusableSlots,
    world.reusableSlotFlags,
    world.x,
    world.y,
    world.vx,
    world.vy,
    world.fx,
    world.fy,
    world.headingX,
    world.headingY,
    world.energy,
    world.stamina,
    world.health,
    world.alive,
    world.radius,
    world.mass,
    world.drag,
    world.maxSpeed,
    world.turnRate,
    world.metabolism,
    world.maxEnergy,
    world.maxStamina,
    world.dietMask,
    world.armor,
    world.mouthPower,
    world.landThrust,
    world.waterThrust,
    world.flowAffinity,
    world.terrainAffinity,
    world.visionRadius,
    world.visionCosHalfCone,
    world.sensorSectorBase,
    world.brainWeightOffset,
    world.brainWeightCount,
    world.componentFlags,
    world.archetypeId,
    world.speciesId,
    world.colorRGBA,
    world.genomeId,
    world.terrainCellId,
    world.flowSampleX,
    world.flowSampleY,
    world.sectorFood,
    world.sectorThreat,
    world.sectorAlly,
    world.sectorObstacle,
    world.averageNeighborHeadingX,
    world.averageNeighborHeadingY,
    world.localCentroidX,
    world.localCentroidY,
    world.separationX,
    world.separationY,
    world.fitnessAccum,
    world.offspringCount,
    world.damageTaken,
    world.foodEaten,
    world.kills,
    world.distanceExplored,
    world.age,
    world.generationId,
    world.parentGenomeId
  ];
}

export function resetWorldState(world: WorldState): void {
  world.count = 0;
  world.tick = 0;
  world.timeSeconds = 0;
  world.reusableSlotCount = 0;
  world.spawnReusedSlotCount = 0;
  world.spawnAppendedSlotCount = 0;
  clearArrays(getWorldRuntimeArrays(world));
}

export function canSpawnAgent(world: WorldState): boolean {
  return world.reusableSlotCount > 0 || world.count < world.capacity;
}

export function getReusableSlotCount(world: WorldState): number {
  return world.reusableSlotCount;
}

export function spawnAgent(world: WorldState, input: SpawnAgentInput = {}): number {
  let index: number;

  if (world.reusableSlotCount > 0) {
    world.reusableSlotCount -= 1;
    index = world.reusableSlots[world.reusableSlotCount];
    world.reusableSlots[world.reusableSlotCount] = 0;
    world.reusableSlotFlags[index] = 0;
    world.spawnReusedSlotCount += 1;
  } else {
    if (world.count >= world.capacity) {
      throw new Error(`World capacity exceeded: ${world.count} >= ${world.capacity}`);
    }

    index = world.count;
    world.count += 1;
    world.spawnAppendedSlotCount += 1;
  }

  writeAgentDefaults(world, index, input);
  return index;
}

export function spawnRandomAgents(world: WorldState, count: number, rng: RngLike): void {
  assertPositiveInteger(count, "count");

  for (let localIndex = 0; localIndex < count; localIndex += 1) {
    spawnAgent(world, {
      x: rng.range(0, world.worldWidth),
      y: rng.range(0, world.worldHeight),
      vx: rng.range(-8, 8),
      vy: rng.range(-8, 8),
      headingX: rng.range(-1, 1),
      headingY: rng.range(-1, 1),
      radius: rng.range(2, 6),
      mass: rng.range(0.7, 2.5),
      drag: rng.range(0.01, 0.08),
      maxSpeed: rng.range(20, 90),
      turnRate: rng.range(1, 8),
      energy: rng.range(20, 100),
      stamina: rng.range(10, 60),
      health: rng.range(20, 100),
      metabolism: rng.range(0.01, 0.08),
      maxEnergy: 100,
      maxStamina: 60,
      dietMask: rng.int(1, 4),
      landThrust: rng.range(0, 1),
      waterThrust: rng.range(0, 1),
      flowAffinity: rng.range(0, 1),
      terrainAffinity: rng.range(0, 1),
      visionRadius: rng.range(30, 180),
      visionCosHalfCone: Math.cos(rng.range(0.25, 1.4)),
      componentFlags: rng.int(1, 1 << 12),
      archetypeId: rng.int(0, 64),
      speciesId: rng.int(0, 16),
      genomeId: world.count + 1,
      generationId: 0,
      parentGenomeId: 0,
      colorRGBA: 0x66ccffff
    });
  }
}

export function killAgent(world: WorldState, index: number): void {
  assertIndexInRange(index, world.count, "agent index");

  if (world.alive[index] !== 1) {
    return;
  }

  world.alive[index] = 0;

  if (world.reusableSlotFlags[index] === 0) {
    world.reusableSlotFlags[index] = 1;
    world.reusableSlots[world.reusableSlotCount] = index;
    world.reusableSlotCount += 1;
  }
}

export function getAliveCount(world: WorldState): number {
  let count = 0;

  for (let index = 0; index < world.count; index += 1) {
    count += world.alive[index] === 1 ? 1 : 0;
  }

  return count;
}

export function getSectorOffset(world: WorldState, agentIndex: number, sectorIndex: number): number {
  assertIndexInRange(agentIndex, world.capacity, "agentIndex");
  assertIndexInRange(sectorIndex, world.sectorCount, "sectorIndex");
  return world.sensorSectorBase[agentIndex] + sectorIndex;
}

export function getWorldMemoryBytes(world: WorldState): number {
  return getArraysByteLength(getWorldRuntimeArrays(world));
}

export function makeWorldSnapshot(world: WorldState, sampleCount = Math.min(world.count, 8)): WorldSnapshot {
  const safeSampleCount = Math.max(0, Math.min(world.count, Math.trunc(sampleCount)));

  return {
    version: world.version,
    capacity: world.capacity,
    count: world.count,
    tick: world.tick,
    timeSeconds: world.timeSeconds,
    reusableSlotCount: world.reusableSlotCount,
    spawnReusedSlotCount: world.spawnReusedSlotCount,
    spawnAppendedSlotCount: world.spawnAppendedSlotCount,
    sampleCount: safeSampleCount,
    x: toRoundedArray(world.x, safeSampleCount),
    y: toRoundedArray(world.y, safeSampleCount),
    energy: toRoundedArray(world.energy, safeSampleCount),
    speciesId: toArray(world.speciesId, safeSampleCount),
    genomeId: toArray(world.genomeId, safeSampleCount)
  };
}

function writeAgentDefaults(world: WorldState, index: number, input: SpawnAgentInput): void {
  const heading = normalizeHeading(input.headingX ?? 1, input.headingY ?? 0);

  world.x[index] = input.x ?? 0;
  world.y[index] = input.y ?? 0;
  world.vx[index] = input.vx ?? 0;
  world.vy[index] = input.vy ?? 0;
  world.fx[index] = 0;
  world.fy[index] = 0;
  world.headingX[index] = heading.x;
  world.headingY[index] = heading.y;
  world.energy[index] = input.energy ?? 100;
  world.stamina[index] = input.stamina ?? 50;
  world.health[index] = input.health ?? 100;
  world.alive[index] = 1;

  world.radius[index] = input.radius ?? 3;
  world.mass[index] = input.mass ?? 1;
  world.drag[index] = input.drag ?? 0.02;
  world.maxSpeed[index] = input.maxSpeed ?? 60;
  world.turnRate[index] = input.turnRate ?? 4;
  world.metabolism[index] = input.metabolism ?? 0.02;
  world.maxEnergy[index] = input.maxEnergy ?? 100;
  world.maxStamina[index] = input.maxStamina ?? 50;
  world.dietMask[index] = input.dietMask ?? 1;
  world.armor[index] = input.armor ?? 0;
  world.mouthPower[index] = input.mouthPower ?? 1;
  world.landThrust[index] = input.landThrust ?? 1;
  world.waterThrust[index] = input.waterThrust ?? 0;
  world.flowAffinity[index] = input.flowAffinity ?? 0;
  world.terrainAffinity[index] = input.terrainAffinity ?? 1;
  world.visionRadius[index] = input.visionRadius ?? 80;
  world.visionCosHalfCone[index] = input.visionCosHalfCone ?? Math.cos(Math.PI / 3);
  world.sensorSectorBase[index] = index * world.sectorCount;
  world.brainWeightOffset[index] = 0;
  world.brainWeightCount[index] = 0;
  world.componentFlags[index] = input.componentFlags ?? 0;
  world.archetypeId[index] = input.archetypeId ?? 0;
  world.speciesId[index] = input.speciesId ?? 0;
  world.colorRGBA[index] = input.colorRGBA ?? 0xffffffff;
  world.genomeId[index] = input.genomeId ?? index + 1;

  world.terrainCellId[index] = 0;
  world.flowSampleX[index] = 0;
  world.flowSampleY[index] = 0;
  world.averageNeighborHeadingX[index] = 0;
  world.averageNeighborHeadingY[index] = 0;
  world.localCentroidX[index] = 0;
  world.localCentroidY[index] = 0;
  world.separationX[index] = 0;
  world.separationY[index] = 0;

  world.fitnessAccum[index] = 0;
  world.offspringCount[index] = 0;
  world.damageTaken[index] = 0;
  world.foodEaten[index] = 0;
  world.kills[index] = 0;
  world.distanceExplored[index] = 0;
  world.age[index] = 0;
  world.generationId[index] = input.generationId ?? 0;
  world.parentGenomeId[index] = input.parentGenomeId ?? 0;

  const sectorStart = world.sensorSectorBase[index];
  const sectorEnd = sectorStart + world.sectorCount;
  world.sectorFood.fill(0, sectorStart, sectorEnd);
  world.sectorThreat.fill(0, sectorStart, sectorEnd);
  world.sectorAlly.fill(0, sectorStart, sectorEnd);
  world.sectorObstacle.fill(0, sectorStart, sectorEnd);
}

function normalizeHeading(x: number, y: number): { readonly x: number; readonly y: number } {
  const length = Math.hypot(x, y);

  if (length <= 0.000001) {
    return { x: 1, y: 0 };
  }

  return { x: x / length, y: y / length };
}

function toRoundedArray(array: Float32Array, count: number): number[] {
  const values: number[] = [];

  for (let index = 0; index < count; index += 1) {
    values.push(Math.round(array[index] * 1000) / 1000);
  }

  return values;
}

function toArray(array: Uint16Array | Uint32Array, count: number): number[] {
  const values: number[] = [];

  for (let index = 0; index < count; index += 1) {
    values.push(array[index]);
  }

  return values;
}

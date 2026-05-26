import { assertFiniteNumber } from "./arrays";
import { forEachNeighborInRadius } from "./neighborQuery";
import {
  assertObstacleMaskCompatible,
  getObstacleCellCenterX,
  getObstacleCellCenterY,
  getObstacleCellIdForCoordinates,
  type ObstacleMask
} from "./obstacleMask";
import { getResourceCellIdForCoordinates, type ResourceLayer } from "./resources";
import type { SpatialHashGrid } from "./spatialHash";
import { sampleTerrainAtPosition, type TerrainLayer } from "./terrain";
import { getSectorOffset, type WorldState } from "./world";

export const SENSOR_SYSTEM_VERSION = "qubok_evolve.sensors.v5" as const;

export type SensorPassConfig = {
  readonly radiusScale?: number;
  readonly includeAllies?: boolean;
  readonly includeThreats?: boolean;
  readonly includeFood?: boolean;
  readonly includeObstacles?: boolean;
  readonly resources?: ResourceLayer;
  readonly obstacleMask?: ObstacleMask;
  readonly terrain?: TerrainLayer;
  readonly tick?: number;
  readonly foodTickInterval?: number;
  readonly obstacleTickInterval?: number;
  readonly terrainTickInterval?: number;
  readonly preserveSkippedSectorChannels?: boolean;
  readonly minimumDistance?: number;
  readonly obstacleDetectionRadius?: number;
  readonly allySignalScale?: number;
  readonly threatSignalScale?: number;
  readonly foodSignalScale?: number;
  readonly obstacleSignalScale?: number;
};

export type SensorClearOptions = {
  readonly clearFood?: boolean;
  readonly clearThreat?: boolean;
  readonly clearAlly?: boolean;
  readonly clearObstacle?: boolean;
};

export type SensorPassStats = {
  readonly tick: number;
  readonly checkedCount: number;
  readonly skippedDeadCount: number;
  readonly skippedNoVisionCount: number;
  readonly neighborCandidates: number;
  readonly radiusNeighborCount: number;
  readonly visibleNeighborCount: number;
  readonly foodVisibleCount: number;
  readonly sectorWrites: number;
  readonly foodSectorWrites: number;
  readonly obstacleSectorWrites: number;
  readonly obstacleMaskCellChecks: number;
  readonly obstacleMaskHits: number;
  readonly obstacleMaskSectorWrites: number;
  readonly terrainSensorSampleCount: number;
  readonly terrainSensorMovementCostSum: number;
  readonly terrainSensorFrictionSum: number;
  readonly terrainSensorDragSum: number;
  readonly terrainSensorResourceAffinitySum: number;
  readonly allySignalSum: number;
  readonly threatSignalSum: number;
  readonly foodSignalSum: number;
  readonly obstacleSignalSum: number;
  readonly foodSensorScheduled: boolean;
  readonly obstacleSensorScheduled: boolean;
  readonly terrainSensorScheduled: boolean;
  readonly foodSkippedByCadence: boolean;
  readonly obstacleSkippedByCadence: boolean;
  readonly terrainSkippedByCadence: boolean;
  readonly agentsWithVisibleNeighbors: number;
  readonly maxVisibleNeighborsForAgent: number;
  readonly averageVisibleNeighborsPerCheckedAgent: number;
  readonly averageCandidatesPerCheckedAgent: number;
};

type ResolvedSensorConfig = {
  readonly radiusScale: number;
  readonly includeAllies: boolean;
  readonly includeThreats: boolean;
  readonly includeFood: boolean;
  readonly includeObstacles: boolean;
  readonly resources?: ResourceLayer;
  readonly obstacleMask?: ObstacleMask;
  readonly terrain?: TerrainLayer;
  readonly tick: number;
  readonly foodTickInterval: number;
  readonly obstacleTickInterval: number;
  readonly terrainTickInterval: number;
  readonly preserveSkippedSectorChannels: boolean;
  readonly foodSensorScheduled: boolean;
  readonly obstacleSensorScheduled: boolean;
  readonly terrainSensorScheduled: boolean;
  readonly foodSkippedByCadence: boolean;
  readonly obstacleSkippedByCadence: boolean;
  readonly terrainSkippedByCadence: boolean;
  readonly clearFood: boolean;
  readonly clearObstacle: boolean;
  readonly minimumDistance: number;
  readonly obstacleDetectionRadius: number;
  readonly allySignalScale: number;
  readonly threatSignalScale: number;
  readonly foodSignalScale: number;
  readonly obstacleSignalScale: number;
};

type UnitVector = { readonly x: number; readonly y: number };
type FoodSectorStats = { readonly visibleCount: number; readonly sectorWrites: number; readonly signalSum: number };
type ObstacleSectorStats = { readonly sectorWrites: number; readonly signalSum: number };
type ObstacleMaskSectorStats = { readonly cellChecks: number; readonly hits: number; readonly sectorWrites: number; readonly signalSum: number };

const DEFAULT_RADIUS_SCALE = 1;
const DEFAULT_MINIMUM_DISTANCE = 0.0001;
const DEFAULT_OBSTACLE_DETECTION_RADIUS = 96;
const DEFAULT_SIGNAL_SCALE = 1;
const DEFAULT_WARM_CHANNEL_INTERVAL = 1;

export function applyAgentSensors(world: WorldState, grid: SpatialHashGrid, config: SensorPassConfig = {}): SensorPassStats {
  const resolved = resolveConfig(world, config);
  clearAgentSensorOutputs(world, { clearFood: resolved.clearFood, clearObstacle: resolved.clearObstacle });

  let checkedCount = 0;
  let skippedDeadCount = 0;
  let skippedNoVisionCount = 0;
  let neighborCandidates = 0;
  let radiusNeighborCount = 0;
  let visibleNeighborCount = 0;
  let foodVisibleCount = 0;
  let sectorWrites = 0;
  let foodSectorWrites = 0;
  let obstacleSectorWrites = 0;
  let obstacleMaskCellChecks = 0;
  let obstacleMaskHits = 0;
  let obstacleMaskSectorWrites = 0;
  let terrainSensorSampleCount = 0;
  let terrainSensorMovementCostSum = 0;
  let terrainSensorFrictionSum = 0;
  let terrainSensorDragSum = 0;
  let terrainSensorResourceAffinitySum = 0;
  let allySignalSum = 0;
  let threatSignalSum = 0;
  let foodSignalSum = 0;
  let obstacleSignalSum = 0;
  let agentsWithVisibleNeighbors = 0;
  let maxVisibleNeighborsForAgent = 0;

  for (let agentIndex = 0; agentIndex < world.count; agentIndex += 1) {
    if (world.alive[agentIndex] !== 1) {
      skippedDeadCount += 1;
      continue;
    }

    if (resolved.terrainSensorScheduled && resolved.terrain) {
      const sample = sampleTerrainAtPosition(resolved.terrain, world.x[agentIndex], world.y[agentIndex]);
      world.terrainCellId[agentIndex] = sample.cellId;
      terrainSensorSampleCount += 1;
      terrainSensorMovementCostSum += sample.movementCost;
      terrainSensorFrictionSum += sample.friction;
      terrainSensorDragSum += sample.drag;
      terrainSensorResourceAffinitySum += sample.resourceAffinity;
    }

    const radius = world.visionRadius[agentIndex] * resolved.radiusScale;
    if (radius <= 0) {
      skippedNoVisionCount += 1;
      continue;
    }

    checkedCount += 1;

    const heading = getNormalizedHeading(world.headingX[agentIndex], world.headingY[agentIndex]);
    const cosHalfCone = clamp(world.visionCosHalfCone[agentIndex], -1, 1);
    let visibleForAgent = 0;
    let sumNeighborX = 0;
    let sumNeighborY = 0;
    let sumHeadingX = 0;
    let sumHeadingY = 0;
    let separationX = 0;
    let separationY = 0;

    const radiusStats = forEachNeighborInRadius(grid, world, agentIndex, radius, (visit) => {
      const distance = Math.sqrt(visit.distanceSquared);
      const safeDistance = Math.max(distance, resolved.minimumDistance);
      const direction = getDirectionOrHeading(visit.dx, visit.dy, distance, resolved.minimumDistance, heading);
      const dot = direction.x * heading.x + direction.y * heading.y;
      if (dot < cosHalfCone) return;

      visibleForAgent += 1;
      visibleNeighborCount += 1;

      const neighborIndex = visit.neighborIndex;
      const sectorIndex = getSensorSectorIndex(heading.x, heading.y, direction.x, direction.y, world.sectorCount);
      const sectorOffset = getSectorOffset(world, agentIndex, sectorIndex);
      const proximitySignal = getProximitySignal(safeDistance, radius);
      const sameSpecies = world.speciesId[neighborIndex] === world.speciesId[agentIndex];

      if (sameSpecies) {
        if (resolved.includeAllies) {
          const signal = proximitySignal * getAllyWeight(world, neighborIndex) * resolved.allySignalScale;
          world.sectorAlly[sectorOffset] += signal;
          allySignalSum += signal;
          sectorWrites += 1;
        }
      } else if (resolved.includeThreats) {
        const signal = proximitySignal * getThreatWeight(world, neighborIndex) * resolved.threatSignalScale;
        world.sectorThreat[sectorOffset] += signal;
        threatSignalSum += signal;
        sectorWrites += 1;
      }

      sumNeighborX += world.x[neighborIndex];
      sumNeighborY += world.y[neighborIndex];
      sumHeadingX += world.headingX[neighborIndex];
      sumHeadingY += world.headingY[neighborIndex];
      separationX -= direction.x * proximitySignal;
      separationY -= direction.y * proximitySignal;
    });

    neighborCandidates += radiusStats.candidateCount;
    radiusNeighborCount += radiusStats.neighborCount;

    if (resolved.foodSensorScheduled && resolved.resources) {
      const foodStats = accumulateFoodSectors(world, resolved.resources, agentIndex, heading, cosHalfCone, radius, resolved);
      foodVisibleCount += foodStats.visibleCount;
      foodSectorWrites += foodStats.sectorWrites;
      foodSignalSum += foodStats.signalSum;
      sectorWrites += foodStats.sectorWrites;
    }

    if (resolved.obstacleSensorScheduled) {
      const boundaryStats = accumulateBoundaryObstacleSectors(world, agentIndex, heading, cosHalfCone, radius, resolved);
      obstacleSectorWrites += boundaryStats.sectorWrites;
      obstacleSignalSum += boundaryStats.signalSum;
      sectorWrites += boundaryStats.sectorWrites;

      if (resolved.obstacleMask) {
        const maskStats = accumulateObstacleMaskSectors(world, resolved.obstacleMask, agentIndex, heading, cosHalfCone, radius, resolved);
        obstacleMaskCellChecks += maskStats.cellChecks;
        obstacleMaskHits += maskStats.hits;
        obstacleMaskSectorWrites += maskStats.sectorWrites;
        obstacleSectorWrites += maskStats.sectorWrites;
        obstacleSignalSum += maskStats.signalSum;
        sectorWrites += maskStats.sectorWrites;
      }
    }

    if (visibleForAgent > 0) {
      agentsWithVisibleNeighbors += 1;
      maxVisibleNeighborsForAgent = Math.max(maxVisibleNeighborsForAgent, visibleForAgent);
      world.localCentroidX[agentIndex] = sumNeighborX / visibleForAgent;
      world.localCentroidY[agentIndex] = sumNeighborY / visibleForAgent;
      const averageHeading = getNormalizedHeading(sumHeadingX, sumHeadingY);
      world.averageNeighborHeadingX[agentIndex] = averageHeading.x;
      world.averageNeighborHeadingY[agentIndex] = averageHeading.y;
      world.separationX[agentIndex] = separationX;
      world.separationY[agentIndex] = separationY;
    }
  }

  return {
    tick: world.tick,
    checkedCount,
    skippedDeadCount,
    skippedNoVisionCount,
    neighborCandidates,
    radiusNeighborCount,
    visibleNeighborCount,
    foodVisibleCount,
    sectorWrites,
    foodSectorWrites,
    obstacleSectorWrites,
    obstacleMaskCellChecks,
    obstacleMaskHits,
    obstacleMaskSectorWrites,
    terrainSensorSampleCount,
    terrainSensorMovementCostSum,
    terrainSensorFrictionSum,
    terrainSensorDragSum,
    terrainSensorResourceAffinitySum,
    allySignalSum,
    threatSignalSum,
    foodSignalSum,
    obstacleSignalSum,
    foodSensorScheduled: resolved.foodSensorScheduled,
    obstacleSensorScheduled: resolved.obstacleSensorScheduled,
    terrainSensorScheduled: resolved.terrainSensorScheduled,
    foodSkippedByCadence: resolved.foodSkippedByCadence,
    obstacleSkippedByCadence: resolved.obstacleSkippedByCadence,
    terrainSkippedByCadence: resolved.terrainSkippedByCadence,
    agentsWithVisibleNeighbors,
    maxVisibleNeighborsForAgent,
    averageVisibleNeighborsPerCheckedAgent: checkedCount > 0 ? visibleNeighborCount / checkedCount : 0,
    averageCandidatesPerCheckedAgent: checkedCount > 0 ? neighborCandidates / checkedCount : 0
  };
}

export function clearAgentSensorOutputs(world: WorldState, options: SensorClearOptions = {}): void {
  const sectorEnd = world.count * world.sectorCount;
  if (options.clearFood ?? true) world.sectorFood.fill(0, 0, sectorEnd);
  if (options.clearThreat ?? true) world.sectorThreat.fill(0, 0, sectorEnd);
  if (options.clearAlly ?? true) world.sectorAlly.fill(0, 0, sectorEnd);
  if (options.clearObstacle ?? true) world.sectorObstacle.fill(0, 0, sectorEnd);
  world.averageNeighborHeadingX.fill(0, 0, world.count);
  world.averageNeighborHeadingY.fill(0, 0, world.count);
  world.localCentroidX.fill(0, 0, world.count);
  world.localCentroidY.fill(0, 0, world.count);
  world.separationX.fill(0, 0, world.count);
  world.separationY.fill(0, 0, world.count);
}

export function getSensorSectorIndex(headingX: number, headingY: number, directionX: number, directionY: number, sectorCount: number): number {
  if (!Number.isInteger(sectorCount) || sectorCount <= 0) {
    throw new Error(`sectorCount must be a positive integer. Received: ${sectorCount}`);
  }
  const heading = getNormalizedHeading(headingX, headingY);
  const direction = getNormalizedHeading(directionX, directionY);
  const dot = clamp(heading.x * direction.x + heading.y * direction.y, -1, 1);
  const cross = heading.x * direction.y - heading.y * direction.x;
  const angle = Math.atan2(cross, dot);
  const normalizedTurns = angle >= 0 ? angle / (Math.PI * 2) : 1 + angle / (Math.PI * 2);
  const sectorIndex = Math.floor(normalizedTurns * sectorCount);
  return Math.min(sectorCount - 1, Math.max(0, sectorIndex));
}

function accumulateFoodSectors(world: WorldState, resources: ResourceLayer, agentIndex: number, heading: UnitVector, cosHalfCone: number, radius: number, config: ResolvedSensorConfig): FoodSectorStats {
  let visibleCount = 0;
  let sectorWrites = 0;
  let signalSum = 0;
  const minCellX = Math.max(0, Math.floor((world.x[agentIndex] - radius) / resources.cellSize));
  const maxCellX = Math.min(resources.columns - 1, Math.floor((world.x[agentIndex] + radius) / resources.cellSize));
  const minCellY = Math.max(0, Math.floor((world.y[agentIndex] - radius) / resources.cellSize));
  const maxCellY = Math.min(resources.rows - 1, Math.floor((world.y[agentIndex] + radius) / resources.cellSize));
  const radiusSquared = radius * radius;

  for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
    for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
      let resourceIndex = resources.cellHeads[getResourceCellIdForCoordinates(resources, cellX, cellY)];
      let guard = 0;
      while (resourceIndex !== -1) {
        if (resources.alive[resourceIndex] === 1) {
          const dx = resources.x[resourceIndex] - world.x[agentIndex];
          const dy = resources.y[resourceIndex] - world.y[agentIndex];
          const distanceSquared = dx * dx + dy * dy;
          if (distanceSquared <= radiusSquared) {
            const distance = Math.sqrt(distanceSquared);
            const direction = getDirectionOrHeading(dx, dy, distance, config.minimumDistance, heading);
            const dot = direction.x * heading.x + direction.y * heading.y;
            if (dot >= cosHalfCone) {
              const sectorIndex = getSensorSectorIndex(heading.x, heading.y, direction.x, direction.y, world.sectorCount);
              const sectorOffset = getSectorOffset(world, agentIndex, sectorIndex);
              const signal = getProximitySignal(Math.max(distance, config.minimumDistance), radius) * getFoodWeight(resources, resourceIndex) * config.foodSignalScale;
              world.sectorFood[sectorOffset] += signal;
              signalSum += signal;
              visibleCount += 1;
              sectorWrites += 1;
            }
          }
        }
        resourceIndex = resources.next[resourceIndex];
        guard += 1;
        if (guard > resources.capacity) throw new Error("Resource sensor linked-list cycle detected.");
      }
    }
  }
  return { visibleCount, sectorWrites, signalSum };
}

function accumulateBoundaryObstacleSectors(world: WorldState, agentIndex: number, heading: UnitVector, cosHalfCone: number, visionRadius: number, config: ResolvedSensorConfig): ObstacleSectorStats {
  const radius = Math.min(visionRadius, config.obstacleDetectionRadius);
  if (radius <= 0) return { sectorWrites: 0, signalSum: 0 };
  let sectorWrites = 0;
  let signalSum = 0;
  const tryWrite = (directionX: number, directionY: number, distance: number): void => {
    if (distance < 0 || distance > radius) return;
    const direction = getNormalizedHeading(directionX, directionY);
    const dot = direction.x * heading.x + direction.y * heading.y;
    if (dot < cosHalfCone) return;
    const sectorIndex = getSensorSectorIndex(heading.x, heading.y, direction.x, direction.y, world.sectorCount);
    const sectorOffset = getSectorOffset(world, agentIndex, sectorIndex);
    const signal = getProximitySignal(Math.max(distance, config.minimumDistance), radius) * config.obstacleSignalScale;
    world.sectorObstacle[sectorOffset] += signal;
    signalSum += signal;
    sectorWrites += 1;
  };
  tryWrite(-1, 0, world.x[agentIndex]);
  tryWrite(1, 0, world.worldWidth - world.x[agentIndex]);
  tryWrite(0, -1, world.y[agentIndex]);
  tryWrite(0, 1, world.worldHeight - world.y[agentIndex]);
  return { sectorWrites, signalSum };
}

function accumulateObstacleMaskSectors(world: WorldState, mask: ObstacleMask, agentIndex: number, heading: UnitVector, cosHalfCone: number, visionRadius: number, config: ResolvedSensorConfig): ObstacleMaskSectorStats {
  const radius = Math.min(visionRadius, config.obstacleDetectionRadius);
  if (radius <= 0) return { cellChecks: 0, hits: 0, sectorWrites: 0, signalSum: 0 };
  let cellChecks = 0;
  let hits = 0;
  let sectorWrites = 0;
  let signalSum = 0;
  const minCellX = Math.max(0, Math.floor((world.x[agentIndex] - radius) / mask.cellSize));
  const maxCellX = Math.min(mask.columns - 1, Math.floor((world.x[agentIndex] + radius) / mask.cellSize));
  const minCellY = Math.max(0, Math.floor((world.y[agentIndex] - radius) / mask.cellSize));
  const maxCellY = Math.min(mask.rows - 1, Math.floor((world.y[agentIndex] + radius) / mask.cellSize));
  const radiusSquared = radius * radius;
  for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
    const cellCenterY = getObstacleCellCenterY(mask, cellY);
    for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
      cellChecks += 1;
      const cellId = getObstacleCellIdForCoordinates(mask, cellX, cellY);
      if (mask.occupied[cellId] !== 1) continue;
      hits += 1;
      const cellCenterX = getObstacleCellCenterX(mask, cellX);
      const dx = cellCenterX - world.x[agentIndex];
      const dy = cellCenterY - world.y[agentIndex];
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared > radiusSquared) continue;
      const distance = Math.sqrt(distanceSquared);
      const direction = getDirectionOrHeading(dx, dy, distance, config.minimumDistance, heading);
      const dot = direction.x * heading.x + direction.y * heading.y;
      if (dot < cosHalfCone) continue;
      const sectorIndex = getSensorSectorIndex(heading.x, heading.y, direction.x, direction.y, world.sectorCount);
      const sectorOffset = getSectorOffset(world, agentIndex, sectorIndex);
      const signal = getProximitySignal(Math.max(distance, config.minimumDistance), radius) * config.obstacleSignalScale;
      world.sectorObstacle[sectorOffset] += signal;
      signalSum += signal;
      sectorWrites += 1;
    }
  }
  return { cellChecks, hits, sectorWrites, signalSum };
}

function resolveConfig(world: WorldState, config: SensorPassConfig): ResolvedSensorConfig {
  const radiusScale = config.radiusScale ?? DEFAULT_RADIUS_SCALE;
  const minimumDistance = config.minimumDistance ?? DEFAULT_MINIMUM_DISTANCE;
  const obstacleDetectionRadius = config.obstacleDetectionRadius ?? DEFAULT_OBSTACLE_DETECTION_RADIUS;
  const allySignalScale = config.allySignalScale ?? DEFAULT_SIGNAL_SCALE;
  const threatSignalScale = config.threatSignalScale ?? DEFAULT_SIGNAL_SCALE;
  const foodSignalScale = config.foodSignalScale ?? DEFAULT_SIGNAL_SCALE;
  const obstacleSignalScale = config.obstacleSignalScale ?? DEFAULT_SIGNAL_SCALE;
  const tick = config.tick ?? world.tick;
  const foodTickInterval = config.foodTickInterval ?? DEFAULT_WARM_CHANNEL_INTERVAL;
  const obstacleTickInterval = config.obstacleTickInterval ?? DEFAULT_WARM_CHANNEL_INTERVAL;
  const terrainTickInterval = config.terrainTickInterval ?? DEFAULT_WARM_CHANNEL_INTERVAL;
  const includeFood = config.includeFood ?? true;
  const includeObstacles = config.includeObstacles ?? true;
  const preserveSkippedSectorChannels = config.preserveSkippedSectorChannels ?? true;

  assertFiniteNumber(radiusScale, "radiusScale");
  assertFiniteNumber(minimumDistance, "minimumDistance");
  assertFiniteNumber(obstacleDetectionRadius, "obstacleDetectionRadius");
  assertFiniteNumber(allySignalScale, "allySignalScale");
  assertFiniteNumber(threatSignalScale, "threatSignalScale");
  assertFiniteNumber(foodSignalScale, "foodSignalScale");
  assertFiniteNumber(obstacleSignalScale, "obstacleSignalScale");
  assertFiniteNumber(tick, "tick");
  if (radiusScale <= 0) throw new Error(`sensor radiusScale must be positive. Received: ${radiusScale}`);
  if (minimumDistance <= 0) throw new Error(`sensor minimumDistance must be positive. Received: ${minimumDistance}`);
  if (obstacleDetectionRadius <= 0) throw new Error(`sensor obstacleDetectionRadius must be positive. Received: ${obstacleDetectionRadius}`);
  assertPositiveInteger(foodTickInterval, "foodTickInterval");
  assertPositiveInteger(obstacleTickInterval, "obstacleTickInterval");
  assertPositiveInteger(terrainTickInterval, "terrainTickInterval");
  if (config.obstacleMask) assertObstacleMaskCompatible(config.obstacleMask, world.worldWidth, world.worldHeight);

  const safeTick = Math.max(0, Math.trunc(tick));
  const foodCadenceReady = safeTick % foodTickInterval === 0;
  const obstacleCadenceReady = safeTick % obstacleTickInterval === 0;
  const terrainCadenceReady = safeTick % terrainTickInterval === 0;
  const hasFoodSource = includeFood && Boolean(config.resources);
  const hasTerrainSource = Boolean(config.terrain);
  const foodSensorScheduled = hasFoodSource && foodCadenceReady;
  const obstacleSensorScheduled = includeObstacles && obstacleCadenceReady;
  const terrainSensorScheduled = hasTerrainSource && terrainCadenceReady;
  const foodSkippedByCadence = hasFoodSource && !foodCadenceReady;
  const obstacleSkippedByCadence = includeObstacles && !obstacleCadenceReady;
  const terrainSkippedByCadence = hasTerrainSource && !terrainCadenceReady;
  const clearFood = foodSensorScheduled || !includeFood || !config.resources || !preserveSkippedSectorChannels;
  const clearObstacle = obstacleSensorScheduled || !includeObstacles || !preserveSkippedSectorChannels;

  return {
    radiusScale,
    includeAllies: config.includeAllies ?? true,
    includeThreats: config.includeThreats ?? true,
    includeFood,
    includeObstacles,
    resources: config.resources,
    obstacleMask: config.obstacleMask,
    terrain: config.terrain,
    tick: safeTick,
    foodTickInterval,
    obstacleTickInterval,
    terrainTickInterval,
    preserveSkippedSectorChannels,
    foodSensorScheduled,
    obstacleSensorScheduled,
    terrainSensorScheduled,
    foodSkippedByCadence,
    obstacleSkippedByCadence,
    terrainSkippedByCadence,
    clearFood,
    clearObstacle,
    minimumDistance,
    obstacleDetectionRadius,
    allySignalScale,
    threatSignalScale,
    foodSignalScale,
    obstacleSignalScale
  };
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`sensor ${label} must be a positive integer. Received: ${value}`);
  }
}

function getDirectionOrHeading(dx: number, dy: number, distance: number, minimumDistance: number, fallbackHeading: UnitVector): UnitVector {
  if (distance <= minimumDistance) return fallbackHeading;
  return { x: dx / distance, y: dy / distance };
}

function getNormalizedHeading(x: number, y: number): UnitVector {
  const length = Math.hypot(x, y);
  if (length <= 0.000001) return { x: 1, y: 0 };
  return { x: x / length, y: y / length };
}

function getProximitySignal(distance: number, radius: number): number {
  if (radius <= 0) return 0;
  const proximity = clamp(1 - distance / radius, 0, 1);
  return proximity * proximity;
}

function getAllyWeight(world: WorldState, index: number): number {
  const maxEnergy = Math.max(world.maxEnergy[index], 0.000001);
  return 0.75 + clamp(world.energy[index] / maxEnergy, 0, 1) * 0.5;
}

function getThreatWeight(world: WorldState, index: number): number {
  const mouth = clamp(world.mouthPower[index] / 12, 0, 4);
  const speed = clamp(world.maxSpeed[index] / 120, 0, 3);
  const armor = clamp(world.armor[index], 0, 2);
  return 0.75 + mouth + speed * 0.35 + armor * 0.25;
}

function getFoodWeight(resources: ResourceLayer, index: number): number {
  return clamp(resources.energy[index] / 18, 0.1, 6) * clamp(resources.radius[index] / 4, 0.25, 3);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

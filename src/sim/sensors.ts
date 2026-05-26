import { assertFiniteNumber } from "./arrays";
import { forEachNeighborInRadius } from "./neighborQuery";
import type { SpatialHashGrid } from "./spatialHash";
import { getSectorOffset, type WorldState } from "./world";

export const SENSOR_SYSTEM_VERSION = "qubok_evolve.sensors.v1" as const;

export type SensorPassConfig = {
  /** Multiplier applied to each agent visionRadius. Useful for benchmarks and later LOD. */
  readonly radiusScale?: number;

  /** When false, sectorAlly is cleared but not filled. */
  readonly includeAllies?: boolean;

  /** When false, sectorThreat is cleared but not filled. */
  readonly includeThreats?: boolean;

  /** Distance below which separation avoids division by almost-zero. */
  readonly minimumDistance?: number;
};

export type SensorPassStats = {
  readonly tick: number;
  readonly checkedCount: number;
  readonly skippedDeadCount: number;
  readonly skippedNoVisionCount: number;
  readonly neighborCandidates: number;
  readonly radiusNeighborCount: number;
  readonly visibleNeighborCount: number;
  readonly sectorWrites: number;
  readonly allySignalSum: number;
  readonly threatSignalSum: number;
  readonly agentsWithVisibleNeighbors: number;
  readonly maxVisibleNeighborsForAgent: number;
  readonly averageVisibleNeighborsPerCheckedAgent: number;
  readonly averageCandidatesPerCheckedAgent: number;
};

type ResolvedSensorConfig = {
  readonly radiusScale: number;
  readonly includeAllies: boolean;
  readonly includeThreats: boolean;
  readonly minimumDistance: number;
};

const DEFAULT_RADIUS_SCALE = 1;
const DEFAULT_MINIMUM_DISTANCE = 0.0001;

export function applyAgentSensors(
  world: WorldState,
  grid: SpatialHashGrid,
  config: SensorPassConfig = {}
): SensorPassStats {
  const resolved = resolveConfig(config);
  clearAgentSensorOutputs(world);

  let checkedCount = 0;
  let skippedDeadCount = 0;
  let skippedNoVisionCount = 0;
  let neighborCandidates = 0;
  let radiusNeighborCount = 0;
  let visibleNeighborCount = 0;
  let sectorWrites = 0;
  let allySignalSum = 0;
  let threatSignalSum = 0;
  let agentsWithVisibleNeighbors = 0;
  let maxVisibleNeighborsForAgent = 0;

  for (let agentIndex = 0; agentIndex < world.count; agentIndex += 1) {
    if (world.alive[agentIndex] !== 1) {
      skippedDeadCount += 1;
      continue;
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
      const directionX = visit.dx / safeDistance;
      const directionY = visit.dy / safeDistance;
      const dot = directionX * heading.x + directionY * heading.y;

      if (dot < cosHalfCone) {
        return;
      }

      visibleForAgent += 1;
      visibleNeighborCount += 1;

      const neighborIndex = visit.neighborIndex;
      const sectorIndex = getSensorSectorIndex(heading.x, heading.y, directionX, directionY, world.sectorCount);
      const sectorOffset = getSectorOffset(world, agentIndex, sectorIndex);
      const signal = 1 / (1 + safeDistance);
      const sameSpecies = world.speciesId[neighborIndex] === world.speciesId[agentIndex];

      if (sameSpecies) {
        if (resolved.includeAllies) {
          world.sectorAlly[sectorOffset] += signal;
          allySignalSum += signal;
          sectorWrites += 1;
        }
      } else if (resolved.includeThreats) {
        world.sectorThreat[sectorOffset] += signal;
        threatSignalSum += signal;
        sectorWrites += 1;
      }

      sumNeighborX += world.x[neighborIndex];
      sumNeighborY += world.y[neighborIndex];
      sumHeadingX += world.headingX[neighborIndex];
      sumHeadingY += world.headingY[neighborIndex];

      const separationWeight = Math.max(0, 1 - distance / radius);
      separationX -= directionX * separationWeight;
      separationY -= directionY * separationWeight;
    });

    neighborCandidates += radiusStats.candidateCount;
    radiusNeighborCount += radiusStats.neighborCount;

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
    sectorWrites,
    allySignalSum,
    threatSignalSum,
    agentsWithVisibleNeighbors,
    maxVisibleNeighborsForAgent,
    averageVisibleNeighborsPerCheckedAgent: checkedCount > 0 ? visibleNeighborCount / checkedCount : 0,
    averageCandidatesPerCheckedAgent: checkedCount > 0 ? neighborCandidates / checkedCount : 0
  };
}

export function clearAgentSensorOutputs(world: WorldState): void {
  const sectorEnd = world.count * world.sectorCount;
  world.sectorFood.fill(0, 0, sectorEnd);
  world.sectorThreat.fill(0, 0, sectorEnd);
  world.sectorAlly.fill(0, 0, sectorEnd);
  world.sectorObstacle.fill(0, 0, sectorEnd);
  world.averageNeighborHeadingX.fill(0, 0, world.count);
  world.averageNeighborHeadingY.fill(0, 0, world.count);
  world.localCentroidX.fill(0, 0, world.count);
  world.localCentroidY.fill(0, 0, world.count);
  world.separationX.fill(0, 0, world.count);
  world.separationY.fill(0, 0, world.count);
}

export function getSensorSectorIndex(
  headingX: number,
  headingY: number,
  directionX: number,
  directionY: number,
  sectorCount: number
): number {
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

function resolveConfig(config: SensorPassConfig): ResolvedSensorConfig {
  const radiusScale = config.radiusScale ?? DEFAULT_RADIUS_SCALE;
  const minimumDistance = config.minimumDistance ?? DEFAULT_MINIMUM_DISTANCE;
  assertFiniteNumber(radiusScale, "radiusScale");
  assertFiniteNumber(minimumDistance, "minimumDistance");

  if (radiusScale <= 0) {
    throw new Error(`sensor radiusScale must be positive. Received: ${radiusScale}`);
  }

  if (minimumDistance <= 0) {
    throw new Error(`sensor minimumDistance must be positive. Received: ${minimumDistance}`);
  }

  return {
    radiusScale,
    includeAllies: config.includeAllies ?? true,
    includeThreats: config.includeThreats ?? true,
    minimumDistance
  };
}

function getNormalizedHeading(x: number, y: number): { readonly x: number; readonly y: number } {
  const length = Math.hypot(x, y);

  if (length <= 0.000001) {
    return { x: 1, y: 0 };
  }

  return { x: x / length, y: y / length };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
import { applyEnergySurvival, type EnergySurvivalStats } from "./energy";
import { createRng, type DeterministicRng, type RngSeed } from "./rng";
import { addForce, stepMovement, type MovementStepMetrics } from "./movement";
import { sampleLocalNeighborStats, type LocalNeighborSummary } from "./neighborQuery";
import {
  applyPredatorPreyInteraction,
  DIET_MEAT,
  DIET_OMNIVORE,
  DIET_PLANT,
  type PredatorPreyInteractionStats
} from "./predatorPrey";
import { analyzeRenderSnapshot, makeRenderSnapshot, type RenderSnapshot, type RenderSnapshotStats } from "./renderSnapshot";
import { applyReproduction, type ReproductionStepStats } from "./reproduction";
import {
  consumeResourcesForWorld,
  createResourceLayer,
  rebuildResourceGrid,
  respawnResourcesToTarget,
  spawnRandomResources,
  type ResourceBuildStats,
  type ResourceLayer,
  type ResourcePickupStats
} from "./resources";
import {
  createObstacleMask,
  seedDemoObstacleMask,
  type ObstacleMask
} from "./obstacleMask";
import { applyAgentSensors, type SensorPassStats } from "./sensors";
import { buildSpatialHashGrid, createSpatialHashGrid, type SpatialHashBuildStats, type SpatialHashGrid } from "./spatialHash";
import { createWorldState, spawnRandomAgents, type WorldState } from "./world";

export const DEMO_SIMULATION_VERSION = "qubok_evolve.demo_simulation.v10" as const;

export type DemoSimulationConfig = {
  readonly seed?: RngSeed;
  readonly capacity?: number;
  readonly initialAgentCount?: number;
  readonly worldWidth?: number;
  readonly worldHeight?: number;
  readonly spatialCellSize?: number;
  readonly neighborRadius?: number;
  readonly resourceCapacity?: number;
  readonly targetResourceCount?: number;
  readonly resourceCellSize?: number;
  readonly resourcePickupRadius?: number;
  readonly obstacleCellSize?: number;
  readonly sensorRadiusScale?: number;
  readonly sensorFoodTickInterval?: number;
  readonly sensorObstacleTickInterval?: number;
  readonly predatorAttackRadius?: number;
  readonly reproductionEnergyThreshold?: number;
};

export type DemoSimulationStepResult = {
  readonly snapshot: RenderSnapshot;
  readonly snapshotStats: RenderSnapshotStats;
  readonly movementMetrics: MovementStepMetrics;
  readonly energyStats: EnergySurvivalStats;
  readonly spatialBuildStats: SpatialHashBuildStats;
  readonly neighborQueryStats: LocalNeighborSummary;
  readonly sensorStats: SensorPassStats;
  readonly predatorPreyStats: PredatorPreyInteractionStats;
  readonly reproductionStats: ReproductionStepStats;
  readonly resourceBuildStats: ResourceBuildStats;
  readonly resourcePickupStats: ResourcePickupStats;
  readonly resourceAliveCount: number;
  readonly resourceTargetCount: number;
  readonly resourceRespawnedCount: number;
  readonly gridBuildMs: number;
  readonly neighborQueryMs: number;
  readonly sensorMs: number;
  readonly predatorPreyMs: number;
  readonly resourceMs: number;
  readonly energyMs: number;
  readonly reproductionMs: number;
  readonly simMsPerTick: number;
};

export type DemoSimulationHandle = {
  readonly world: WorldState;
  readonly spatialGrid: SpatialHashGrid;
  readonly resources: ResourceLayer;
  readonly obstacleMask: ObstacleMask;
  readonly step: (deltaSeconds: number) => DemoSimulationStepResult;
  readonly getSnapshot: () => RenderSnapshot;
};

const DEFAULT_CAPACITY = 1536;
const DEFAULT_INITIAL_AGENT_FILL_RATIO = 0.72;
const DEFAULT_WORLD_WIDTH = 2048;
const DEFAULT_WORLD_HEIGHT = 2048;
const DEFAULT_SPATIAL_CELL_SIZE = 64;
const DEFAULT_NEIGHBOR_RADIUS = 96;
const DEFAULT_RESOURCE_CAPACITY = 4096;
const DEFAULT_TARGET_RESOURCE_COUNT = 2400;
const DEFAULT_RESOURCE_PICKUP_RADIUS = 8;
const DEFAULT_OBSTACLE_CELL_SIZE = 64;
const DEFAULT_SENSOR_RADIUS_SCALE = 1;
const DEFAULT_SENSOR_FOOD_TICK_INTERVAL = 4;
const DEFAULT_SENSOR_OBSTACLE_TICK_INTERVAL = 8;
const DEFAULT_PREDATOR_ATTACK_RADIUS = 24;
const DEFAULT_REPRODUCTION_ENERGY_THRESHOLD = 88;
const MAX_DELTA_SECONDS = 1 / 30;

export function createDemoSimulation(config: DemoSimulationConfig = {}): DemoSimulationHandle {
  const capacity = config.capacity ?? DEFAULT_CAPACITY;
  const initialAgentCount = Math.min(
    config.initialAgentCount ?? Math.max(1, Math.floor(capacity * DEFAULT_INITIAL_AGENT_FILL_RATIO)),
    capacity
  );
  const worldWidth = config.worldWidth ?? DEFAULT_WORLD_WIDTH;
  const worldHeight = config.worldHeight ?? DEFAULT_WORLD_HEIGHT;
  const neighborRadius = config.neighborRadius ?? DEFAULT_NEIGHBOR_RADIUS;
  const resourceCapacity = config.resourceCapacity ?? DEFAULT_RESOURCE_CAPACITY;
  const resourceTargetCount = Math.min(config.targetResourceCount ?? DEFAULT_TARGET_RESOURCE_COUNT, resourceCapacity);
  const resourcePickupRadius = config.resourcePickupRadius ?? DEFAULT_RESOURCE_PICKUP_RADIUS;
  const sensorRadiusScale = config.sensorRadiusScale ?? DEFAULT_SENSOR_RADIUS_SCALE;
  const sensorFoodTickInterval = config.sensorFoodTickInterval ?? DEFAULT_SENSOR_FOOD_TICK_INTERVAL;
  const sensorObstacleTickInterval = config.sensorObstacleTickInterval ?? DEFAULT_SENSOR_OBSTACLE_TICK_INTERVAL;
  const predatorAttackRadius = config.predatorAttackRadius ?? DEFAULT_PREDATOR_ATTACK_RADIUS;
  const reproductionEnergyThreshold = config.reproductionEnergyThreshold ?? DEFAULT_REPRODUCTION_ENERGY_THRESHOLD;

  const world = createWorldState({
    capacity,
    worldWidth,
    worldHeight,
    sectorCount: 8
  });

  const spatialGrid = createSpatialHashGrid({
    capacity,
    worldWidth,
    worldHeight,
    cellSize: config.spatialCellSize ?? DEFAULT_SPATIAL_CELL_SIZE
  });

  const resources = createResourceLayer({
    capacity: resourceCapacity,
    worldWidth,
    worldHeight,
    cellSize: config.resourceCellSize ?? config.spatialCellSize ?? DEFAULT_SPATIAL_CELL_SIZE
  });

  const obstacleMask = createObstacleMask({
    worldWidth,
    worldHeight,
    cellSize: config.obstacleCellSize ?? DEFAULT_OBSTACLE_CELL_SIZE
  });

  const rng = createRng(config.seed ?? "qubok_evolve:demo:m19");
  spawnDemoAgents(world, initialAgentCount, rng);
  spawnRandomResources(resources, resourceTargetCount, rng);
  seedDemoObstacleMask(obstacleMask);
  buildSpatialHashGrid(spatialGrid, world);
  rebuildResourceGrid(resources);

  const step = (deltaSeconds: number): DemoSimulationStepResult => {
    const safeDeltaSeconds = Math.min(Math.max(deltaSeconds, 1 / 240), MAX_DELTA_SECONDS);
    const start = performance.now();

    applyDemoForces(world);
    const movementMetrics = stepMovement(world, {
      deltaSeconds: safeDeltaSeconds,
      boundsMode: "wrap",
      clearForces: true,
      minimumEnergy: -1_000_000
    });

    const gridStart = performance.now();
    const spatialBuildStats = buildSpatialHashGrid(spatialGrid, world);
    const gridBuildMs = performance.now() - gridStart;

    const neighborStart = performance.now();
    const neighborQueryStats = sampleLocalNeighborStats(spatialGrid, world, {
      radius: neighborRadius,
      maxSampleCount: Math.min(world.count, 256),
      stride: 5
    });
    const neighborQueryMs = performance.now() - neighborStart;

    const resourceGridStart = performance.now();
    const resourceBuildStats = rebuildResourceGrid(resources);
    const resourceGridMs = performance.now() - resourceGridStart;

    const sensorStart = performance.now();
    const sensorStats = applyAgentSensors(world, spatialGrid, {
      radiusScale: sensorRadiusScale,
      includeAllies: true,
      includeThreats: true,
      includeFood: true,
      includeObstacles: true,
      resources,
      obstacleMask,
      tick: world.tick,
      foodTickInterval: sensorFoodTickInterval,
      obstacleTickInterval: sensorObstacleTickInterval,
      preserveSkippedSectorChannels: true,
      obstacleDetectionRadius: 128,
      allySignalScale: 1,
      threatSignalScale: 1,
      foodSignalScale: 1,
      obstacleSignalScale: 0.75
    });
    const sensorMs = performance.now() - sensorStart;

    const predatorPreyStart = performance.now();
    const predatorPreyStats = applyPredatorPreyInteraction(world, spatialGrid, {
      attackRadius: predatorAttackRadius,
      maxAttacksPerPredator: 1,
      sameSpeciesProtection: true,
      damageScale: 0.85,
      actionEnergyCost: 0.2,
      energyGainPerDamage: 0.35,
      preyEnergyHarvestRatio: 0.25
    });
    const predatorPreyMs = performance.now() - predatorPreyStart;

    const resourceStart = performance.now();
    const resourcePickupStats = consumeResourcesForWorld(resources, world, {
      pickupRadius: resourcePickupRadius,
      maxPickupsPerAgent: 1
    });
    const resourceRespawnedCount = respawnResourcesToTarget(resources, resourceTargetCount, rng);
    const resourceMs = resourceGridMs + performance.now() - resourceStart;

    const energyStart = performance.now();
    const energyStats = applyEnergySurvival(world, {
      deltaSeconds: safeDeltaSeconds,
      basalMetabolismScale: 0,
      starvationEnergyThreshold: 0,
      starvationDamagePerSecond: 18,
      energyDebtDamageScale: 0.35,
      killOnZeroHealth: true
    });
    const energyMs = performance.now() - energyStart;

    const reproductionStart = performance.now();
    const reproductionStats = applyReproduction(world, rng, {
      energyThreshold: reproductionEnergyThreshold,
      energyCost: 44,
      childEnergy: 32,
      minAgeSeconds: 2.5,
      maxBirthsPerStep: 8,
      spawnRadius: 14,
      inheritVelocityScale: 0.35,
      mutationChance: 0.35,
      mutationStandardDeviationScale: 0.4
    });
    const reproductionMs = performance.now() - reproductionStart;

    const snapshot = makeRenderSnapshot(world);
    const snapshotStats = analyzeRenderSnapshot(snapshot);
    const simMsPerTick = performance.now() - start;

    return {
      snapshot,
      snapshotStats,
      movementMetrics,
      energyStats,
      spatialBuildStats,
      neighborQueryStats,
      sensorStats,
      predatorPreyStats,
      reproductionStats,
      resourceBuildStats,
      resourcePickupStats,
      resourceAliveCount: resources.aliveCount,
      resourceTargetCount,
      resourceRespawnedCount,
      gridBuildMs,
      neighborQueryMs,
      sensorMs,
      predatorPreyMs,
      resourceMs,
      energyMs,
      reproductionMs,
      simMsPerTick
    };
  };

  return {
    world,
    spatialGrid,
    resources,
    obstacleMask,
    step,
    getSnapshot: () => makeRenderSnapshot(world)
  };
}

function spawnDemoAgents(world: WorldState, count: number, rng: DeterministicRng): void {
  spawnRandomAgents(world, count, rng);

  for (let index = 0; index < world.count; index += 1) {
    const species = index % 6;
    const angle = rng.range(0, Math.PI * 2);
    const speed = rng.range(12, 52);
    const isPredatorSpecies = species === 0 || species === 3;
    const isOmnivoreSpecies = species === 5;

    world.speciesId[index] = species;
    world.dietMask[index] = isPredatorSpecies ? DIET_MEAT : isOmnivoreSpecies ? DIET_OMNIVORE : DIET_PLANT;
    world.radius[index] = rng.range(1.4, 3.8);
    world.maxSpeed[index] = rng.range(36, 105);
    world.drag[index] = rng.range(0.012, 0.045);
    world.metabolism[index] = rng.range(0.025, 0.12);
    world.energy[index] = rng.range(28, 96);
    world.maxEnergy[index] = 100;
    world.health[index] = rng.range(65, 100);
    world.armor[index] = isPredatorSpecies ? rng.range(0.15, 0.65) : rng.range(0, 0.35);
    world.mouthPower[index] = isPredatorSpecies
      ? rng.range(7, 14)
      : isOmnivoreSpecies
        ? rng.range(4, 8)
        : rng.range(1, 3);
    world.visionRadius[index] = isPredatorSpecies ? rng.range(92, 180) : rng.range(48, 132);
    world.visionCosHalfCone[index] = Math.cos(rng.range(0.45, 1.45));
    world.vx[index] = Math.cos(angle) * speed;
    world.vy[index] = Math.sin(angle) * speed;
    world.colorRGBA[index] = getSpeciesColorRGBA(species);
  }
}

function applyDemoForces(world: WorldState): void {
  const centerX = world.worldWidth * 0.5;
  const centerY = world.worldHeight * 0.5;
  const time = world.timeSeconds;

  for (let index = 0; index < world.count; index += 1) {
    if (world.alive[index] !== 1) {
      continue;
    }

    const dx = centerX - world.x[index];
    const dy = centerY - world.y[index];
    const distance = Math.max(Math.hypot(dx, dy), 1);
    const nx = dx / distance;
    const ny = dy / distance;
    const tangentX = -ny;
    const tangentY = nx;
    const speciesBias = 0.7 + (world.speciesId[index] % 6) * 0.13;
    const pulse = Math.sin(time * (0.41 + speciesBias * 0.17) + index * 0.013) * 0.5 + 0.5;

    const centerForce = Math.min(distance * 0.045, 58) * speciesBias;
    const swirlForce = (18 + pulse * 34) * (index % 2 === 0 ? 1 : -1);
    const microX = Math.sin(time * 1.7 + index * 12.9898) * 6;
    const microY = Math.cos(time * 1.3 + index * 78.233) * 6;

    addForce(
      world,
      index,
      nx * centerForce + tangentX * swirlForce + microX,
      ny * centerForce + tangentY * swirlForce + microY
    );
  }
}

function getSpeciesColorRGBA(species: number): number {
  switch (species % 6) {
    case 0:
      return 0x7cc7ffff;
    case 1:
      return 0xffb86cff;
    case 2:
      return 0xb7ff8aff;
    case 3:
      return 0xff7a90ff;
    case 4:
      return 0xc8a2ffff;
    default:
      return 0xfff08aff;
  }
}

import { applyEnergySurvival, type EnergySurvivalStats } from "./energy";
import { createEnvironmentalFieldLayer, setFieldCell, type EnvironmentalFieldLayer } from "./field";
import { applyFieldSourcesAndSinks, type FieldPointSink, type FieldPointSource, type FieldSourceStepMetrics } from "./fieldSources";
import { applyFieldDamping, type FieldDampingStepMetrics } from "./fieldDamping";
import { advectEnvironmentalField, createFieldAdvectionScratch, type FieldAdvectionStepMetrics } from "./fieldAdvection";
import { createFieldDynamicsScratch, stepEnvironmentalFieldDynamics, type FieldDynamicsStepMetrics } from "./fieldDynamics";
import { makeFieldRenderSnapshot, type FieldRenderSnapshot } from "./fieldRenderSnapshot";
import { createRng, type DeterministicRng, type RngSeed } from "./rng";
import { addForce, stepMovement, type MovementStepMetrics } from "./movement";
import {
  makeObstacleLifecycleTelemetry,
  type ObstacleLifecycleTelemetry
} from "./lifecycleTelemetry";
import { applyObstacleSoftResponse, type ObstacleSoftResponseStats } from "./obstacleResponse";
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
  type ResourceBuildStats,
  type ResourceLayer,
  type ResourcePickupStats
} from "./resources";
import {
  createObstacleMask,
  seedDemoObstacleMask,
  type ObstacleMask
} from "./obstacleMask";
import {
  makeObstacleMaskRenderSnapshot,
  type ObstacleMaskRenderSnapshot
} from "./obstacleRenderSnapshot";
import { applyAgentSensors, type SensorPassStats } from "./sensors";
import {
  respawnResourcesToTargetAvoidingObstacles,
  spawnRandomAgentsAvoidingObstacles,
  spawnRandomResourcesAvoidingObstacles,
  type SpawnValidationStats
} from "./spawnValidation";
import { buildSpatialHashGrid, createSpatialHashGrid, type SpatialHashBuildStats, type SpatialHashGrid } from "./spatialHash";
import { createWorldState, type WorldState } from "./world";
import { createTerrainLayer, setTerrainRectMaterial, type TerrainLayer } from "./terrain";
import { makeTerrainRenderSnapshot, type TerrainRenderSnapshot } from "./terrainRenderSnapshot";

export const DEMO_SIMULATION_VERSION = "qubok_evolve.demo_simulation.v22" as const;

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
  readonly obstacleResponseRadius?: number;
  readonly obstacleResponseForceScale?: number;
  readonly obstacleResponseMaxForce?: number;
  readonly obstacleResponseCellStride?: number;
  readonly obstacleResponseMaxCellChecksPerAgent?: number;
  readonly obstacleResponseBoundsOnly?: boolean;
  readonly fieldCellSize?: number;
  readonly fieldForceScale?: number;
  readonly fieldRenderStride?: number;
  readonly fieldRenderMaxVectors?: number;
  readonly fieldRenderMinMagnitude?: number;
  readonly fieldDecayPerSecond?: number;
  readonly fieldDiffusionRatePerSecond?: number;
  readonly fieldDynamicsMinActiveMagnitude?: number;
  readonly fieldResourceSourceStrengthPerSecond?: number;
  readonly fieldAgentSinkAbsorptionPerSecond?: number;
  readonly fieldSourceMaxResources?: number;
  readonly fieldSinkMaxAgents?: number;
  readonly enableObstacleFieldDamping?: boolean;
  readonly enableTerrainFieldDamping?: boolean;
  readonly obstacleFieldDampingPerSecond?: number;
  readonly terrainFieldDampingScalePerSecond?: number;
  readonly fieldDampingMaxObstacleCells?: number;
  readonly fieldDampingMaxTerrainCells?: number;
  readonly enableFieldAdvection?: boolean;
  readonly fieldAdvectionStrength?: number;
  readonly fieldAdvectionSubsteps?: number;
  readonly fieldAdvectionMinActiveMagnitude?: number;
  readonly spawnMaxAttempts?: number;
  readonly spawnClearanceRadius?: number;
  readonly sensorRadiusScale?: number;
  readonly sensorFoodTickInterval?: number;
  readonly sensorObstacleTickInterval?: number;
  readonly sensorTerrainTickInterval?: number;
  readonly offspringTerrainMaxAttempts?: number;
  readonly offspringTerrainMinAcceptance?: number;
  readonly predatorAttackRadius?: number;
  readonly reproductionEnergyThreshold?: number;
};

export type DemoSimulationFieldDampingConfig = {
  readonly enableObstacleFieldDamping: boolean;
  readonly enableTerrainFieldDamping: boolean;
  readonly obstacleFieldDampingPerSecond: number;
  readonly terrainFieldDampingScalePerSecond: number;
  readonly fieldDampingMaxObstacleCells: number;
  readonly fieldDampingMaxTerrainCells: number;
};

export type DemoSimulationFieldDampingConfigPatch = Partial<DemoSimulationFieldDampingConfig>;

export type DemoSimulationFieldAdvectionConfig = {
  readonly enableFieldAdvection: boolean;
  readonly fieldAdvectionStrength: number;
  readonly fieldAdvectionSubsteps: number;
  readonly fieldAdvectionMinActiveMagnitude: number;
};

export type DemoSimulationFieldAdvectionConfigPatch = Partial<DemoSimulationFieldAdvectionConfig>;

export type DemoSimulationStepResult = {
  readonly snapshot: RenderSnapshot;
  readonly obstacleMaskSnapshot: ObstacleMaskRenderSnapshot;
  readonly terrainRenderSnapshot: TerrainRenderSnapshot;
  readonly fieldRenderSnapshot: FieldRenderSnapshot;
  readonly fieldDynamicsStats: FieldDynamicsStepMetrics;
  readonly fieldSourceStats: FieldSourceStepMetrics;
  readonly fieldDampingStats: FieldDampingStepMetrics;
  readonly fieldAdvectionStats: FieldAdvectionStepMetrics;
  readonly fieldDampingConfig: DemoSimulationFieldDampingConfig;
  readonly snapshotStats: RenderSnapshotStats;
  readonly movementMetrics: MovementStepMetrics;
  readonly obstacleResponseStats: ObstacleSoftResponseStats;
  readonly obstacleLifecycleTelemetry: ObstacleLifecycleTelemetry;
  readonly energyStats: EnergySurvivalStats;
  readonly spatialBuildStats: SpatialHashBuildStats;
  readonly neighborQueryStats: LocalNeighborSummary;
  readonly sensorStats: SensorPassStats;
  readonly predatorPreyStats: PredatorPreyInteractionStats;
  readonly reproductionStats: ReproductionStepStats;
  readonly resourceBuildStats: ResourceBuildStats;
  readonly resourcePickupStats: ResourcePickupStats;
  readonly resourceRespawnStats: SpawnValidationStats;
  readonly resourceAliveCount: number;
  readonly resourceTargetCount: number;
  readonly resourceRespawnedCount: number;
  readonly gridBuildMs: number;
  readonly neighborQueryMs: number;
  readonly sensorMs: number;
  readonly obstacleResponseMs: number;
  readonly predatorPreyMs: number;
  readonly resourceMs: number;
  readonly energyMs: number;
  readonly reproductionMs: number;
  readonly fieldDynamicsMs: number;
  readonly fieldSourcesMs: number;
  readonly fieldDampingMs: number;
  readonly fieldAdvectionMs: number;
  readonly simMsPerTick: number;
};

export type DemoSimulationHandle = {
  readonly world: WorldState;
  readonly spatialGrid: SpatialHashGrid;
  readonly resources: ResourceLayer;
  readonly obstacleMask: ObstacleMask;
  readonly terrain: TerrainLayer;
  readonly field: EnvironmentalFieldLayer;
  readonly initialAgentSpawnStats: SpawnValidationStats;
  readonly initialResourceSpawnStats: SpawnValidationStats;
  readonly step: (deltaSeconds: number) => DemoSimulationStepResult;
  readonly getSnapshot: () => RenderSnapshot;
  readonly getFieldDampingConfig: () => DemoSimulationFieldDampingConfig;
  readonly updateFieldDampingConfig: (patch: DemoSimulationFieldDampingConfigPatch) => DemoSimulationFieldDampingConfig;
  readonly getFieldAdvectionConfig: () => DemoSimulationFieldAdvectionConfig;
  readonly updateFieldAdvectionConfig: (patch: DemoSimulationFieldAdvectionConfigPatch) => DemoSimulationFieldAdvectionConfig;
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
const DEFAULT_TERRAIN_CELL_SIZE = 64;
const DEFAULT_FIELD_CELL_SIZE = 128;
const DEFAULT_FIELD_FORCE_SCALE = 2.5;
const DEFAULT_FIELD_RENDER_STRIDE = 2;
const DEFAULT_FIELD_RENDER_MAX_VECTORS = 192;
const DEFAULT_FIELD_RENDER_MIN_MAGNITUDE = 0.05;
const DEFAULT_FIELD_DECAY_PER_SECOND = 0.025;
const DEFAULT_FIELD_DIFFUSION_RATE_PER_SECOND = 0.08;
const DEFAULT_FIELD_DYNAMICS_MIN_ACTIVE_MAGNITUDE = 0.0001;
const DEFAULT_FIELD_RESOURCE_SOURCE_STRENGTH_PER_SECOND = 0.35;
const DEFAULT_FIELD_AGENT_SINK_ABSORPTION_PER_SECOND = 0.08;
const DEFAULT_FIELD_SOURCE_MAX_RESOURCES = 512;
const DEFAULT_FIELD_SINK_MAX_AGENTS = 512;
const DEFAULT_OBSTACLE_FIELD_DAMPING_PER_SECOND = 0.32;
const DEFAULT_TERRAIN_FIELD_DAMPING_SCALE_PER_SECOND = 1;
const DEFAULT_FIELD_DAMPING_MAX_OBSTACLE_CELLS = 512;
const DEFAULT_FIELD_DAMPING_MAX_TERRAIN_CELLS = 512;
const DEFAULT_ENABLE_FIELD_ADVECTION = true;
const DEFAULT_FIELD_ADVECTION_STRENGTH = 0.35;
const DEFAULT_FIELD_ADVECTION_SUBSTEPS = 1;
const DEFAULT_FIELD_ADVECTION_MIN_ACTIVE_MAGNITUDE = 0.0001;
const DEFAULT_OBSTACLE_RESPONSE_RADIUS = 42;
const DEFAULT_OBSTACLE_RESPONSE_FORCE_SCALE = 140;
const DEFAULT_OBSTACLE_RESPONSE_MAX_FORCE = 220;
const DEFAULT_OBSTACLE_RESPONSE_CELL_STRIDE = 1;
const DEFAULT_OBSTACLE_RESPONSE_MAX_CELL_CHECKS_PER_AGENT = 64;
const DEFAULT_SPAWN_MAX_ATTEMPTS = 96;
const DEFAULT_SPAWN_CLEARANCE_RADIUS = 4;
const DEFAULT_SENSOR_RADIUS_SCALE = 1;
const DEFAULT_SENSOR_FOOD_TICK_INTERVAL = 4;
const DEFAULT_SENSOR_OBSTACLE_TICK_INTERVAL = 8;
const DEFAULT_SENSOR_TERRAIN_TICK_INTERVAL = 2;
const DEFAULT_OFFSPRING_TERRAIN_MAX_ATTEMPTS = 6;
const DEFAULT_OFFSPRING_TERRAIN_MIN_ACCEPTANCE = 0.05;
const DEFAULT_PREDATOR_ATTACK_RADIUS = 24;
const DEFAULT_REPRODUCTION_ENERGY_THRESHOLD = 88;
const MAX_DELTA_SECONDS = 1 / 30;

export function createDemoSimulation(config: DemoSimulationConfig = {}): DemoSimulationHandle {
  const capacity = config.capacity ?? DEFAULT_CAPACITY;
  const initialAgentCount = Math.min(config.initialAgentCount ?? Math.max(1, Math.floor(capacity * DEFAULT_INITIAL_AGENT_FILL_RATIO)), capacity);
  const worldWidth = config.worldWidth ?? DEFAULT_WORLD_WIDTH;
  const worldHeight = config.worldHeight ?? DEFAULT_WORLD_HEIGHT;
  const neighborRadius = config.neighborRadius ?? DEFAULT_NEIGHBOR_RADIUS;
  const resourceCapacity = config.resourceCapacity ?? DEFAULT_RESOURCE_CAPACITY;
  const resourceTargetCount = Math.min(config.targetResourceCount ?? DEFAULT_TARGET_RESOURCE_COUNT, resourceCapacity);
  const resourcePickupRadius = config.resourcePickupRadius ?? DEFAULT_RESOURCE_PICKUP_RADIUS;
  const fieldForceScale = config.fieldForceScale ?? DEFAULT_FIELD_FORCE_SCALE;
  const fieldRenderStride = config.fieldRenderStride ?? DEFAULT_FIELD_RENDER_STRIDE;
  const fieldRenderMaxVectors = config.fieldRenderMaxVectors ?? DEFAULT_FIELD_RENDER_MAX_VECTORS;
  const fieldRenderMinMagnitude = config.fieldRenderMinMagnitude ?? DEFAULT_FIELD_RENDER_MIN_MAGNITUDE;
  const fieldDecayPerSecond = config.fieldDecayPerSecond ?? DEFAULT_FIELD_DECAY_PER_SECOND;
  const fieldDiffusionRatePerSecond = config.fieldDiffusionRatePerSecond ?? DEFAULT_FIELD_DIFFUSION_RATE_PER_SECOND;
  const fieldDynamicsMinActiveMagnitude = config.fieldDynamicsMinActiveMagnitude ?? DEFAULT_FIELD_DYNAMICS_MIN_ACTIVE_MAGNITUDE;
  const fieldResourceSourceStrengthPerSecond = config.fieldResourceSourceStrengthPerSecond ?? DEFAULT_FIELD_RESOURCE_SOURCE_STRENGTH_PER_SECOND;
  const fieldAgentSinkAbsorptionPerSecond = config.fieldAgentSinkAbsorptionPerSecond ?? DEFAULT_FIELD_AGENT_SINK_ABSORPTION_PER_SECOND;
  const fieldSourceMaxResources = Math.max(0, Math.floor(config.fieldSourceMaxResources ?? DEFAULT_FIELD_SOURCE_MAX_RESOURCES));
  const fieldSinkMaxAgents = Math.max(0, Math.floor(config.fieldSinkMaxAgents ?? DEFAULT_FIELD_SINK_MAX_AGENTS));
  let enableObstacleFieldDamping = config.enableObstacleFieldDamping ?? true;
  let enableTerrainFieldDamping = config.enableTerrainFieldDamping ?? true;
  let obstacleFieldDampingPerSecond = clampFinite(config.obstacleFieldDampingPerSecond ?? DEFAULT_OBSTACLE_FIELD_DAMPING_PER_SECOND, 0, 16);
  let terrainFieldDampingScalePerSecond = clampFinite(config.terrainFieldDampingScalePerSecond ?? DEFAULT_TERRAIN_FIELD_DAMPING_SCALE_PER_SECOND, 0, 16);
  let fieldDampingMaxObstacleCells = clampInteger(config.fieldDampingMaxObstacleCells ?? DEFAULT_FIELD_DAMPING_MAX_OBSTACLE_CELLS, 0, 1_000_000);
  let fieldDampingMaxTerrainCells = clampInteger(config.fieldDampingMaxTerrainCells ?? DEFAULT_FIELD_DAMPING_MAX_TERRAIN_CELLS, 0, 1_000_000);
  let enableFieldAdvection = config.enableFieldAdvection ?? DEFAULT_ENABLE_FIELD_ADVECTION;
  let fieldAdvectionStrength = clampFinite(config.fieldAdvectionStrength ?? DEFAULT_FIELD_ADVECTION_STRENGTH, 0, 16);
  let fieldAdvectionSubsteps = clampInteger(config.fieldAdvectionSubsteps ?? DEFAULT_FIELD_ADVECTION_SUBSTEPS, 1, 16);
  let fieldAdvectionMinActiveMagnitude = clampFinite(config.fieldAdvectionMinActiveMagnitude ?? DEFAULT_FIELD_ADVECTION_MIN_ACTIVE_MAGNITUDE, 0, Number.MAX_SAFE_INTEGER);
  const obstacleResponseRadius = config.obstacleResponseRadius ?? DEFAULT_OBSTACLE_RESPONSE_RADIUS;
  const obstacleResponseForceScale = config.obstacleResponseForceScale ?? DEFAULT_OBSTACLE_RESPONSE_FORCE_SCALE;
  const obstacleResponseMaxForce = config.obstacleResponseMaxForce ?? DEFAULT_OBSTACLE_RESPONSE_MAX_FORCE;
  const obstacleResponseCellStride = config.obstacleResponseCellStride ?? DEFAULT_OBSTACLE_RESPONSE_CELL_STRIDE;
  const obstacleResponseMaxCellChecksPerAgent = config.obstacleResponseMaxCellChecksPerAgent ?? DEFAULT_OBSTACLE_RESPONSE_MAX_CELL_CHECKS_PER_AGENT;
  const obstacleResponseBoundsOnly = config.obstacleResponseBoundsOnly ?? false;
  const spawnMaxAttempts = config.spawnMaxAttempts ?? DEFAULT_SPAWN_MAX_ATTEMPTS;
  const spawnClearanceRadius = config.spawnClearanceRadius ?? DEFAULT_SPAWN_CLEARANCE_RADIUS;
  const sensorRadiusScale = config.sensorRadiusScale ?? DEFAULT_SENSOR_RADIUS_SCALE;
  const sensorFoodTickInterval = config.sensorFoodTickInterval ?? DEFAULT_SENSOR_FOOD_TICK_INTERVAL;
  const sensorObstacleTickInterval = config.sensorObstacleTickInterval ?? DEFAULT_SENSOR_OBSTACLE_TICK_INTERVAL;
  const sensorTerrainTickInterval = config.sensorTerrainTickInterval ?? DEFAULT_SENSOR_TERRAIN_TICK_INTERVAL;
  const offspringTerrainMaxAttempts = config.offspringTerrainMaxAttempts ?? DEFAULT_OFFSPRING_TERRAIN_MAX_ATTEMPTS;
  const offspringTerrainMinAcceptance = config.offspringTerrainMinAcceptance ?? DEFAULT_OFFSPRING_TERRAIN_MIN_ACCEPTANCE;
  const predatorAttackRadius = config.predatorAttackRadius ?? DEFAULT_PREDATOR_ATTACK_RADIUS;
  const reproductionEnergyThreshold = config.reproductionEnergyThreshold ?? DEFAULT_REPRODUCTION_ENERGY_THRESHOLD;

  const world = createWorldState({ capacity, worldWidth, worldHeight, sectorCount: 8 });
  const spatialGrid = createSpatialHashGrid({ capacity, worldWidth, worldHeight, cellSize: config.spatialCellSize ?? DEFAULT_SPATIAL_CELL_SIZE });
  const resources = createResourceLayer({ capacity: resourceCapacity, worldWidth, worldHeight, cellSize: config.resourceCellSize ?? config.spatialCellSize ?? DEFAULT_SPATIAL_CELL_SIZE });
  const obstacleMask = createObstacleMask({ worldWidth, worldHeight, cellSize: config.obstacleCellSize ?? DEFAULT_OBSTACLE_CELL_SIZE });
  const terrain = createTerrainLayer({ worldWidth, worldHeight, cellSize: DEFAULT_TERRAIN_CELL_SIZE });
  const field = createEnvironmentalFieldLayer({ worldWidth, worldHeight, cellSize: config.fieldCellSize ?? DEFAULT_FIELD_CELL_SIZE });
  const fieldDynamicsScratch = createFieldDynamicsScratch(field);
  const fieldAdvectionScratch = createFieldAdvectionScratch(field);
  const fieldSourceBuffer: FieldPointSource[] = [];
  const fieldSinkBuffer: FieldPointSink[] = [];

  const rng = createRng(config.seed ?? "qubok_evolve:demo:m40");
  seedDemoObstacleMask(obstacleMask);
  seedDemoTerrain(terrain);
  seedDemoField(field);
  const obstacleMaskSnapshot = makeObstacleMaskRenderSnapshot(obstacleMask);
  const spawnConfig = { maxAttempts: spawnMaxAttempts, clearanceRadius: spawnClearanceRadius };
  const initialAgentSpawnStats = spawnRandomAgentsAvoidingObstacles(world, initialAgentCount, rng, obstacleMask, spawnConfig);
  tuneDemoAgents(world, rng);
  const initialResourceSpawnStats = resourceTargetCount > 0
    ? spawnRandomResourcesAvoidingObstacles(resources, resourceTargetCount, rng, obstacleMask, { ...spawnConfig, terrain })
    : { requestedCount: 0, spawnedCount: 0, blockedAttemptCount: 0, fallbackUsedCount: 0, failedCount: 0, terrainResourceSampleCount: 0, terrainResourceAffinitySum: 0, terrainResourceRejectedCount: 0 };
  buildSpatialHashGrid(spatialGrid, world);
  rebuildResourceGrid(resources);

  const getFieldDampingConfig = (): DemoSimulationFieldDampingConfig => Object.freeze({
    enableObstacleFieldDamping,
    enableTerrainFieldDamping,
    obstacleFieldDampingPerSecond,
    terrainFieldDampingScalePerSecond,
    fieldDampingMaxObstacleCells,
    fieldDampingMaxTerrainCells
  });

  const updateFieldDampingConfig = (patch: DemoSimulationFieldDampingConfigPatch): DemoSimulationFieldDampingConfig => {
    if (typeof patch.enableObstacleFieldDamping === "boolean") enableObstacleFieldDamping = patch.enableObstacleFieldDamping;
    if (typeof patch.enableTerrainFieldDamping === "boolean") enableTerrainFieldDamping = patch.enableTerrainFieldDamping;
    if (patch.obstacleFieldDampingPerSecond !== undefined) obstacleFieldDampingPerSecond = clampFinite(patch.obstacleFieldDampingPerSecond, 0, 16);
    if (patch.terrainFieldDampingScalePerSecond !== undefined) terrainFieldDampingScalePerSecond = clampFinite(patch.terrainFieldDampingScalePerSecond, 0, 16);
    if (patch.fieldDampingMaxObstacleCells !== undefined) fieldDampingMaxObstacleCells = clampInteger(patch.fieldDampingMaxObstacleCells, 0, 1_000_000);
    if (patch.fieldDampingMaxTerrainCells !== undefined) fieldDampingMaxTerrainCells = clampInteger(patch.fieldDampingMaxTerrainCells, 0, 1_000_000);
    return getFieldDampingConfig();
  };

  const getFieldAdvectionConfig = (): DemoSimulationFieldAdvectionConfig => Object.freeze({
    enableFieldAdvection,
    fieldAdvectionStrength,
    fieldAdvectionSubsteps,
    fieldAdvectionMinActiveMagnitude
  });

  const updateFieldAdvectionConfig = (patch: DemoSimulationFieldAdvectionConfigPatch): DemoSimulationFieldAdvectionConfig => {
    if (typeof patch.enableFieldAdvection === "boolean") enableFieldAdvection = patch.enableFieldAdvection;
    if (patch.fieldAdvectionStrength !== undefined) fieldAdvectionStrength = clampFinite(patch.fieldAdvectionStrength, 0, 16);
    if (patch.fieldAdvectionSubsteps !== undefined) fieldAdvectionSubsteps = clampInteger(patch.fieldAdvectionSubsteps, 1, 16);
    if (patch.fieldAdvectionMinActiveMagnitude !== undefined) fieldAdvectionMinActiveMagnitude = clampFinite(patch.fieldAdvectionMinActiveMagnitude, 0, Number.MAX_SAFE_INTEGER);
    return getFieldAdvectionConfig();
  };

  const step = (deltaSeconds: number): DemoSimulationStepResult => {
    const safeDeltaSeconds = Math.min(Math.max(deltaSeconds, 1 / 240), MAX_DELTA_SECONDS);
    const start = performance.now();
    applyDemoForces(world);

    const obstacleResponseStart = performance.now();
    const obstacleResponseStats = applyObstacleSoftResponse(world, obstacleMask, { responseRadius: obstacleResponseRadius, forceScale: obstacleResponseForceScale, maxForcePerAgent: obstacleResponseMaxForce, includeWorldBounds: true, boundsOnly: obstacleResponseBoundsOnly, cellStride: obstacleResponseCellStride, maxObstacleCellChecksPerAgent: obstacleResponseMaxCellChecksPerAgent });
    const obstacleResponseMs = performance.now() - obstacleResponseStart;

    const fieldSourcesStart = performance.now();
    fillResourceFieldSources(resources, fieldSourceBuffer, fieldSourceMaxResources, fieldResourceSourceStrengthPerSecond * safeDeltaSeconds);
    fillAgentFieldSinks(world, fieldSinkBuffer, fieldSinkMaxAgents, fieldAgentSinkAbsorptionPerSecond * safeDeltaSeconds);
    const fieldSourceStats = applyFieldSourcesAndSinks(field, fieldSourceBuffer, fieldSinkBuffer);
    const fieldSourcesMs = performance.now() - fieldSourcesStart;

    const fieldDampingStart = performance.now();
    const fieldDampingStats = applyFieldDamping(field, { enableObstacleDamping: enableObstacleFieldDamping, enableTerrainDamping: enableTerrainFieldDamping, obstacleDamping01: clamp01(obstacleFieldDampingPerSecond * safeDeltaSeconds), terrainDampingScale01: clamp01(terrainFieldDampingScalePerSecond * safeDeltaSeconds), maxObstacleCells: fieldDampingMaxObstacleCells, maxTerrainCells: fieldDampingMaxTerrainCells }, obstacleMask, terrain);
    const fieldDampingMs = performance.now() - fieldDampingStart;

    const fieldAdvectionStart = performance.now();
    const fieldAdvectionStats = advectEnvironmentalField(field, safeDeltaSeconds, { enabled: enableFieldAdvection, strength: fieldAdvectionStrength, substeps: fieldAdvectionSubsteps, boundaryMode: "clamp", minActiveMagnitude: fieldAdvectionMinActiveMagnitude }, fieldAdvectionScratch);
    const fieldAdvectionMs = performance.now() - fieldAdvectionStart;

    const fieldDynamicsStart = performance.now();
    const fieldDynamicsStats = stepEnvironmentalFieldDynamics(field, safeDeltaSeconds, { decayPerSecond: fieldDecayPerSecond, diffusionRatePerSecond: fieldDiffusionRatePerSecond, minActiveMagnitude: fieldDynamicsMinActiveMagnitude }, fieldDynamicsScratch);
    const fieldDynamicsMs = performance.now() - fieldDynamicsStart;

    const movementMetrics = stepMovement(world, { deltaSeconds: safeDeltaSeconds, boundsMode: "wrap", clearForces: true, minimumEnergy: -1_000_000, terrain, field, fieldForceScale });

    const gridStart = performance.now();
    const spatialBuildStats = buildSpatialHashGrid(spatialGrid, world);
    const gridBuildMs = performance.now() - gridStart;

    const neighborStart = performance.now();
    const neighborQueryStats = sampleLocalNeighborStats(spatialGrid, world, { radius: neighborRadius, maxSampleCount: Math.min(world.count, 256), stride: 5 });
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
      terrain,
      tick: world.tick,
      foodTickInterval: sensorFoodTickInterval,
      obstacleTickInterval: sensorObstacleTickInterval,
      terrainTickInterval: sensorTerrainTickInterval,
      preserveSkippedSectorChannels: true,
      obstacleDetectionRadius: 128,
      allySignalScale: 1,
      threatSignalScale: 1,
      foodSignalScale: 1,
      obstacleSignalScale: 0.75
    });
    const sensorMs = performance.now() - sensorStart;

    const predatorPreyStart = performance.now();
    const predatorPreyStats = applyPredatorPreyInteraction(world, spatialGrid, { attackRadius: predatorAttackRadius, maxAttacksPerPredator: 1, sameSpeciesProtection: true, damageScale: 0.85, actionEnergyCost: 0.2, energyGainPerDamage: 0.35, preyEnergyHarvestRatio: 0.25 });
    const predatorPreyMs = performance.now() - predatorPreyStart;

    const resourceStart = performance.now();
    const resourcePickupStats = consumeResourcesForWorld(resources, world, { pickupRadius: resourcePickupRadius, maxPickupsPerAgent: 1 });
    const resourceRespawnStats = respawnResourcesToTargetAvoidingObstacles(resources, resourceTargetCount, rng, obstacleMask, { ...spawnConfig, terrain });
    const resourceRespawnedCount = resourceRespawnStats.spawnedCount;
    const resourceMs = resourceGridMs + performance.now() - resourceStart;

    const energyStart = performance.now();
    const energyStats = applyEnergySurvival(world, { deltaSeconds: safeDeltaSeconds, basalMetabolismScale: 0, starvationEnergyThreshold: 0, starvationDamagePerSecond: 18, energyDebtDamageScale: 0.35, killOnZeroHealth: true });
    const energyMs = performance.now() - energyStart;

    const reproductionStart = performance.now();
    const reproductionStats = applyReproduction(world, rng, { energyThreshold: reproductionEnergyThreshold, energyCost: 44, childEnergy: 32, minAgeSeconds: 2.5, maxBirthsPerStep: 8, spawnRadius: 14, inheritVelocityScale: 0.35, mutationChance: 0.35, mutationStandardDeviationScale: 0.4, obstacleMask, terrain, offspringSpawnMaxAttempts: spawnMaxAttempts, offspringClearanceRadius: spawnClearanceRadius, offspringTerrainMaxAttempts, offspringTerrainMinAcceptance });
    const reproductionMs = performance.now() - reproductionStart;

    const obstacleLifecycleTelemetry = makeObstacleLifecycleTelemetry({ sensorStats, obstacleResponseStats, resourceRespawnStats, reproductionStats });
    const snapshot = makeRenderSnapshot(world);
    const terrainRenderSnapshot = makeTerrainRenderSnapshot(terrain);
    const fieldRenderSnapshot = makeFieldRenderSnapshot(field, { maxVectors: fieldRenderMaxVectors, stride: fieldRenderStride, minMagnitude: fieldRenderMinMagnitude });
    const snapshotStats = analyzeRenderSnapshot(snapshot);
    const simMsPerTick = performance.now() - start;

    return { snapshot, obstacleMaskSnapshot, terrainRenderSnapshot, fieldRenderSnapshot, fieldDynamicsStats, fieldSourceStats, fieldDampingStats, fieldAdvectionStats, fieldDampingConfig: getFieldDampingConfig(), snapshotStats, movementMetrics, obstacleResponseStats, obstacleLifecycleTelemetry, energyStats, spatialBuildStats, neighborQueryStats, sensorStats, predatorPreyStats, reproductionStats, resourceBuildStats, resourcePickupStats, resourceRespawnStats, resourceAliveCount: resources.aliveCount, resourceTargetCount, resourceRespawnedCount, gridBuildMs, neighborQueryMs, sensorMs, obstacleResponseMs, predatorPreyMs, resourceMs, energyMs, reproductionMs, fieldDynamicsMs, fieldSourcesMs, fieldDampingMs, fieldAdvectionMs, simMsPerTick };
  };

  return { world, spatialGrid, resources, obstacleMask, terrain, field, initialAgentSpawnStats, initialResourceSpawnStats, step, getSnapshot: () => makeRenderSnapshot(world), getFieldDampingConfig, updateFieldDampingConfig, getFieldAdvectionConfig, updateFieldAdvectionConfig };
}


function fillResourceFieldSources(resources: ResourceLayer, target: FieldPointSource[], maxResources: number, strength: number): void {
  target.length = 0;
  if (maxResources <= 0 || strength <= 0) return;
  const centerX = resources.worldWidth * 0.5;
  const centerY = resources.worldHeight * 0.5;
  for (let index = 0; index < resources.count && target.length < maxResources; index += 1) {
    if (resources.alive[index] !== 1) continue;
    const x = resources.x[index];
    const y = resources.y[index];
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.max(Math.hypot(dx, dy), 1);
    const energy01 = clamp01(resources.energy[index] / 28);
    const radius01 = clamp01(resources.radius[index] / 5);
    const resourceSignal = 0.5 + energy01 * 0.35 + radius01 * 0.15;
    target.push({ x, y, flowX: -dy / distance, flowY: dx / distance, strength: strength * resourceSignal });
  }
}


function fillAgentFieldSinks(world: WorldState, target: FieldPointSink[], maxAgents: number, absorption: number): void {
  target.length = 0;
  const absorption01 = clamp01(absorption);
  if (maxAgents <= 0 || absorption01 <= 0) return;
  for (let index = 0; index < world.count && target.length < maxAgents; index += 1) {
    if (world.alive[index] !== 1) continue;
    const radius01 = clamp01(world.radius[index] / 4);
    const maxEnergy = Math.max(world.maxEnergy[index], 0.000001);
    const energy01 = clamp01(world.energy[index] / maxEnergy);
    const lowEnergyPressure01 = 1 - energy01;
    const agentPresenceAbsorption01 = clamp01(absorption01 * (0.65 + radius01 * 0.25 + lowEnergyPressure01 * 0.1));
    target.push({ x: world.x[index], y: world.y[index], absorption01: agentPresenceAbsorption01 });
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}


function clampFinite(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min;
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(Number.isFinite(value) ? value : min)));
}

function tuneDemoAgents(world: WorldState, rng: DeterministicRng): void {
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
    world.mouthPower[index] = isPredatorSpecies ? rng.range(7, 14) : isOmnivoreSpecies ? rng.range(4, 8) : rng.range(1, 3);
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
    if (world.alive[index] !== 1) continue;
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
    addForce(world, index, nx * centerForce + tangentX * swirlForce + microX, ny * centerForce + tangentY * swirlForce + microY);
  }
}

function getSpeciesColorRGBA(species: number): number {
  switch (species % 6) {
    case 0: return 0x7cc7ffff;
    case 1: return 0xffb86cff;
    case 2: return 0xb7ff8aff;
    case 3: return 0xff7a90ff;
    case 4: return 0xc8a2ffff;
    default: return 0xfff08aff;
  }
}

function seedDemoTerrain(terrain: TerrainLayer): void {
  setTerrainRectMaterial(terrain, 0, 0, terrain.worldWidth * 0.32, terrain.worldHeight, 1);
  setTerrainRectMaterial(terrain, terrain.worldWidth * 0.35, terrain.worldHeight * 0.18, terrain.worldWidth * 0.66, terrain.worldHeight * 0.46, 2);
  setTerrainRectMaterial(terrain, terrain.worldWidth * 0.58, terrain.worldHeight * 0.58, terrain.worldWidth, terrain.worldHeight, 3);
}

function seedDemoField(field: EnvironmentalFieldLayer): void {
  const centerX = (field.columns - 1) * 0.5;
  const centerY = (field.rows - 1) * 0.5;
  for (let cellY = 0; cellY < field.rows; cellY += 1) {
    for (let cellX = 0; cellX < field.columns; cellX += 1) {
      const dx = cellX - centerX;
      const dy = cellY - centerY;
      const distance = Math.max(Math.hypot(dx, dy), 1);
      const swirlX = -dy / distance;
      const swirlY = dx / distance;
      const wave = Math.sin(cellX * 0.73) * 0.5 + Math.cos(cellY * 0.61) * 0.5;
      setFieldCell(field, cellX, cellY, swirlX * 4 + wave * 1.5, swirlY * 4 - wave * 1.5);
    }
  }
}

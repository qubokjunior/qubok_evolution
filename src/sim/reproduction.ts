import { assertFiniteNumber, assertNonNegativeInteger } from "./arrays";
import {
  DEFAULT_MUTATION_RULES,
  mutateParameterBlock,
  scaleMutationRule,
  type MutablePhenotypeParameter,
  type MutationRule,
  type MutationStats
} from "./mutation";
import type { ObstacleMask } from "./obstacleMask";
import type { DeterministicRng } from "./rng";
import { findFreePositionNearOrRandom } from "./spawnValidation";
import { sampleTerrainAtPosition, type TerrainLayer } from "./terrain";
import { canSpawnAgent, spawnAgent, type WorldState } from "./world";

export const REPRODUCTION_SYSTEM_VERSION = "qubok_evolve.reproduction.v4" as const;

export type ReproductionConfig = {
  readonly energyThreshold?: number;
  readonly energyCost?: number;
  readonly childEnergy?: number;
  readonly minAgeSeconds?: number;
  readonly maxBirthsPerStep?: number;
  readonly spawnRadius?: number;
  readonly inheritVelocityScale?: number;

  /** Optional obstacle mask used to avoid placing offspring inside occupied cells. */
  readonly obstacleMask?: ObstacleMask;

  /** Optional terrain layer used to bias offspring placement toward lower-cost / higher-affinity cells. */
  readonly terrain?: TerrainLayer;

  /** Attempts used for obstacle-aware offspring placement. */
  readonly offspringSpawnMaxAttempts?: number;

  /** Extra radius used when checking whether an offspring position overlaps an obstacle cell. */
  readonly offspringClearanceRadius?: number;

  /** Terrain-biased candidate samples before accepting the last free fallback position. */
  readonly offspringTerrainMaxAttempts?: number;

  /** Minimum terrain acceptance probability, preventing hard rejection dead-zones. */
  readonly offspringTerrainMinAcceptance?: number;

  /**
   * Global per-parameter mutation probability override.
   * 0 disables phenotype mutation; 1 attempts every currently mutable reproduction parameter.
   */
  readonly mutationChance?: number;

  /**
   * Scales standardDeviation from DEFAULT_MUTATION_RULES.
   * 0 makes mutation attempts produce no parameter delta.
   */
  readonly mutationStandardDeviationScale?: number;

  /**
   * Backward-compatible alias for mutationStandardDeviationScale from milestone 11.
   */
  readonly mutationSigma?: number;
};

export type ReproductionStepStats = {
  readonly tick: number;
  readonly checkedCount: number;
  readonly eligibleCount: number;
  readonly birthsThisStep: number;
  readonly blockedByCapacity: number;
  readonly blockedByObstacle: number;
  readonly obstacleFallbackUsedCount: number;
  readonly obstaclePlacementFailedCount: number;
  readonly obstacleBlockedAttemptCount: number;
  readonly terrainOffspringSampleCount: number;
  readonly terrainOffspringAffinitySum: number;
  readonly terrainOffspringRejectedCount: number;
  readonly parentEnergySpent: number;
  readonly childEnergyCreated: number;
  readonly averageChildMutationAbs: number;
  readonly mutationAttempts: number;
  readonly mutationChangedCount: number;
  readonly mutationClampedCount: number;
  readonly mutationAbsoluteDeltaSum: number;
};

const DEFAULT_ENERGY_THRESHOLD = 85;
const DEFAULT_ENERGY_COST = 42;
const DEFAULT_CHILD_ENERGY = 32;
const DEFAULT_MIN_AGE_SECONDS = 4;
const DEFAULT_SPAWN_RADIUS = 10;
const DEFAULT_MUTATION_CHANCE = 0.75;
const DEFAULT_MUTATION_STANDARD_DEVIATION_SCALE = 1;
const DEFAULT_INHERIT_VELOCITY_SCALE = 0.35;
const DEFAULT_OFFSPRING_SPAWN_MAX_ATTEMPTS = 24;
const DEFAULT_OFFSPRING_CLEARANCE_RADIUS = 0;
const DEFAULT_OFFSPRING_TERRAIN_MAX_ATTEMPTS = 8;
const DEFAULT_OFFSPRING_TERRAIN_MIN_ACCEPTANCE = 0.05;
const MAX_BIRTHS_PER_STEP = 4096;

const REPRODUCTION_MUTATION_PARAMETERS = [
  "radius",
  "mass",
  "drag",
  "maxSpeed",
  "turnRate",
  "metabolism",
  "maxEnergy",
  "maxStamina",
  "health",
  "armor",
  "mouthPower",
  "landThrust",
  "waterThrust",
  "flowAffinity",
  "terrainAffinity",
  "visionRadius",
  "visionCosHalfCone"
] as const satisfies readonly MutablePhenotypeParameter[];

type ReproductionMutableParameter = (typeof REPRODUCTION_MUTATION_PARAMETERS)[number];

export function applyReproduction(
  world: WorldState,
  rng: DeterministicRng,
  config: ReproductionConfig = {}
): ReproductionStepStats {
  const energyThreshold = finiteOrDefault(config.energyThreshold, DEFAULT_ENERGY_THRESHOLD, "energyThreshold");
  const energyCost = finiteOrDefault(config.energyCost, DEFAULT_ENERGY_COST, "energyCost");
  const childEnergy = finiteOrDefault(config.childEnergy, DEFAULT_CHILD_ENERGY, "childEnergy");
  const minAgeSeconds = finiteOrDefault(config.minAgeSeconds, DEFAULT_MIN_AGE_SECONDS, "minAgeSeconds");
  const spawnRadius = finiteOrDefault(config.spawnRadius, DEFAULT_SPAWN_RADIUS, "spawnRadius");
  const mutationChance = finiteOrDefault(config.mutationChance, DEFAULT_MUTATION_CHANCE, "mutationChance");
  const mutationStandardDeviationScale = finiteOrDefault(
    config.mutationStandardDeviationScale ?? config.mutationSigma,
    DEFAULT_MUTATION_STANDARD_DEVIATION_SCALE,
    "mutationStandardDeviationScale"
  );
  const inheritVelocityScale = finiteOrDefault(
    config.inheritVelocityScale,
    DEFAULT_INHERIT_VELOCITY_SCALE,
    "inheritVelocityScale"
  );
  const offspringClearanceRadius = finiteOrDefault(
    config.offspringClearanceRadius,
    DEFAULT_OFFSPRING_CLEARANCE_RADIUS,
    "offspringClearanceRadius"
  );
  const offspringTerrainMinAcceptance = finiteOrDefault(
    config.offspringTerrainMinAcceptance,
    DEFAULT_OFFSPRING_TERRAIN_MIN_ACCEPTANCE,
    "offspringTerrainMinAcceptance"
  );
  const offspringSpawnMaxAttempts = config.offspringSpawnMaxAttempts ?? DEFAULT_OFFSPRING_SPAWN_MAX_ATTEMPTS;
  const offspringTerrainMaxAttempts = config.offspringTerrainMaxAttempts ?? DEFAULT_OFFSPRING_TERRAIN_MAX_ATTEMPTS;
  const maxBirthsPerStep = config.maxBirthsPerStep ?? MAX_BIRTHS_PER_STEP;

  assertNonNegativeInteger(maxBirthsPerStep, "maxBirthsPerStep");

  if (energyThreshold < 0 || energyCost < 0 || childEnergy < 0 || minAgeSeconds < 0 || spawnRadius < 0) {
    throw new Error("Reproduction energy, age and spawn-radius values must be non-negative.");
  }

  if (offspringClearanceRadius < 0) {
    throw new Error(`offspringClearanceRadius must be non-negative. Received: ${offspringClearanceRadius}`);
  }

  if (!Number.isInteger(offspringSpawnMaxAttempts) || offspringSpawnMaxAttempts <= 0) {
    throw new Error(`offspringSpawnMaxAttempts must be a positive integer. Received: ${offspringSpawnMaxAttempts}`);
  }

  if (!Number.isInteger(offspringTerrainMaxAttempts) || offspringTerrainMaxAttempts <= 0) {
    throw new Error(`offspringTerrainMaxAttempts must be a positive integer. Received: ${offspringTerrainMaxAttempts}`);
  }

  if (offspringTerrainMinAcceptance < 0 || offspringTerrainMinAcceptance > 1) {
    throw new Error(`offspringTerrainMinAcceptance must be between 0 and 1. Received: ${offspringTerrainMinAcceptance}`);
  }

  if (mutationChance < 0 || mutationChance > 1) {
    throw new Error(`mutationChance must be in 0..1. Received: ${mutationChance}`);
  }

  if (mutationStandardDeviationScale < 0) {
    throw new Error(
      `mutationStandardDeviationScale must be non-negative. Received: ${mutationStandardDeviationScale}`
    );
  }

  if (inheritVelocityScale < 0 || inheritVelocityScale > 1) {
    throw new Error(`inheritVelocityScale must be in 0..1. Received: ${inheritVelocityScale}`);
  }

  const mutationRules = createReproductionMutationRules(mutationChance, mutationStandardDeviationScale);
  const originalCount = world.count;
  let checkedCount = 0;
  let eligibleCount = 0;
  let birthsThisStep = 0;
  let blockedByCapacity = 0;
  let blockedByObstacle = 0;
  let obstacleFallbackUsedCount = 0;
  let obstaclePlacementFailedCount = 0;
  let obstacleBlockedAttemptCount = 0;
  let terrainOffspringSampleCount = 0;
  let terrainOffspringAffinitySum = 0;
  let terrainOffspringRejectedCount = 0;
  let parentEnergySpent = 0;
  let childEnergyCreated = 0;
  let mutationAttempts = 0;
  let mutationChangedCount = 0;
  let mutationClampedCount = 0;
  let mutationAbsoluteDeltaSum = 0;
  let nextGenomeId = getNextGenomeId(world);

  for (let parentIndex = 0; parentIndex < originalCount; parentIndex += 1) {
    if (world.alive[parentIndex] !== 1) {
      continue;
    }

    checkedCount += 1;

    if (world.energy[parentIndex] < energyThreshold || world.age[parentIndex] < minAgeSeconds) {
      continue;
    }

    eligibleCount += 1;

    if (birthsThisStep >= maxBirthsPerStep) {
      continue;
    }

    if (!canSpawnAgent(world)) {
      blockedByCapacity += 1;
      continue;
    }

    const childPosition = resolveChildPosition(world, parentIndex, rng, {
      obstacleMask: config.obstacleMask,
      terrain: config.terrain,
      spawnRadius,
      offspringSpawnMaxAttempts,
      offspringClearanceRadius,
      offspringTerrainMaxAttempts,
      offspringTerrainMinAcceptance
    });

    obstacleBlockedAttemptCount += Math.max(0, childPosition.attempts - 1);
    obstacleFallbackUsedCount += childPosition.fallbackUsed ? 1 : 0;
    terrainOffspringSampleCount += childPosition.terrainSampleCount;
    terrainOffspringAffinitySum += childPosition.terrainAffinitySum;
    terrainOffspringRejectedCount += childPosition.terrainRejectedCount;

    if (!childPosition.found) {
      blockedByObstacle += 1;
      obstaclePlacementFailedCount += 1;
      continue;
    }

    const childGenomeId = nextGenomeId;
    nextGenomeId += 1;

    const child = spawnChild(world, parentIndex, childGenomeId, rng, {
      energyCost,
      childEnergy,
      childX: childPosition.x,
      childY: childPosition.y,
      inheritVelocityScale,
      mutationRules
    });

    birthsThisStep += 1;
    parentEnergySpent += energyCost;
    childEnergyCreated += world.energy[child.index];
    mutationAttempts += child.mutationStats.attempts;
    mutationChangedCount += child.mutationStats.changed;
    mutationClampedCount += child.mutationStats.clamped;
    mutationAbsoluteDeltaSum += child.mutationStats.absoluteDeltaSum;
  }

  return {
    tick: world.tick,
    checkedCount,
    eligibleCount,
    birthsThisStep,
    blockedByCapacity,
    blockedByObstacle,
    obstacleFallbackUsedCount,
    obstaclePlacementFailedCount,
    obstacleBlockedAttemptCount,
    terrainOffspringSampleCount,
    terrainOffspringAffinitySum,
    terrainOffspringRejectedCount,
    parentEnergySpent,
    childEnergyCreated,
    averageChildMutationAbs: mutationAttempts > 0 ? mutationAbsoluteDeltaSum / mutationAttempts : 0,
    mutationAttempts,
    mutationChangedCount,
    mutationClampedCount,
    mutationAbsoluteDeltaSum
  };
}

export function createReproductionMutationRules(
  mutationChance = DEFAULT_MUTATION_CHANCE,
  standardDeviationScale = DEFAULT_MUTATION_STANDARD_DEVIATION_SCALE
): Readonly<Record<ReproductionMutableParameter, MutationRule>> {
  if (!Number.isFinite(mutationChance) || mutationChance < 0 || mutationChance > 1) {
    throw new Error(`mutationChance must be in 0..1. Received: ${mutationChance}`);
  }

  if (!Number.isFinite(standardDeviationScale) || standardDeviationScale < 0) {
    throw new Error(`standardDeviationScale must be >= 0. Received: ${standardDeviationScale}`);
  }

  const rules = {} as Record<ReproductionMutableParameter, MutationRule>;

  for (const parameter of REPRODUCTION_MUTATION_PARAMETERS) {
    const scaledRule = scaleMutationRule(DEFAULT_MUTATION_RULES[parameter], standardDeviationScale);
    rules[parameter] = {
      ...scaledRule,
      probability: mutationChance
    };
  }

  return rules;
}

type ChildPositionConfig = {
  readonly obstacleMask?: ObstacleMask;
  readonly terrain?: TerrainLayer;
  readonly spawnRadius: number;
  readonly offspringSpawnMaxAttempts: number;
  readonly offspringClearanceRadius: number;
  readonly offspringTerrainMaxAttempts: number;
  readonly offspringTerrainMinAcceptance: number;
};

type ChildPositionResult = {
  readonly x: number;
  readonly y: number;
  readonly found: boolean;
  readonly attempts: number;
  readonly fallbackUsed: boolean;
  readonly terrainSampleCount: number;
  readonly terrainAffinitySum: number;
  readonly terrainRejectedCount: number;
};

type SpawnChildConfig = {
  readonly energyCost: number;
  readonly childEnergy: number;
  readonly childX: number;
  readonly childY: number;
  readonly inheritVelocityScale: number;
  readonly mutationRules: Readonly<Record<ReproductionMutableParameter, MutationRule>>;
};

type SpawnChildResult = {
  readonly index: number;
  readonly mutationStats: MutationStats;
};

function resolveChildPosition(
  world: WorldState,
  parentIndex: number,
  rng: DeterministicRng,
  config: ChildPositionConfig
): ChildPositionResult {
  if (!config.terrain) {
    return makePlainChildPosition(world, parentIndex, rng, config);
  }

  let lastFound: ChildPositionResult | undefined;
  let totalAttempts = 0;
  let fallbackUsed = false;
  let terrainSampleCount = 0;
  let terrainAffinitySum = 0;
  let terrainRejectedCount = 0;

  for (let attempt = 0; attempt < config.offspringTerrainMaxAttempts; attempt += 1) {
    const position = makePlainChildPosition(world, parentIndex, rng, config);
    totalAttempts += position.attempts;
    fallbackUsed = fallbackUsed || position.fallbackUsed;

    if (!position.found) {
      return {
        ...position,
        attempts: totalAttempts,
        fallbackUsed,
        terrainSampleCount,
        terrainAffinitySum,
        terrainRejectedCount
      };
    }

    const acceptance = sampleOffspringTerrainAcceptance(
      config.terrain,
      position.x,
      position.y,
      world.terrainAffinity[parentIndex],
      config.offspringTerrainMinAcceptance
    );
    terrainSampleCount += 1;
    terrainAffinitySum += acceptance;

    const enrichedPosition = {
      ...position,
      attempts: totalAttempts,
      fallbackUsed,
      terrainSampleCount,
      terrainAffinitySum,
      terrainRejectedCount
    };
    lastFound = enrichedPosition;

    if (rng.nextFloat01() <= acceptance) {
      return enrichedPosition;
    }

    terrainRejectedCount += 1;
  }

  if (lastFound) {
    return {
      ...lastFound,
      terrainRejectedCount
    };
  }

  return makePlainChildPosition(world, parentIndex, rng, config);
}

function makePlainChildPosition(
  world: WorldState,
  parentIndex: number,
  rng: DeterministicRng,
  config: ChildPositionConfig
): ChildPositionResult {
  if (config.obstacleMask) {
    const searchRadius = Math.max(
      config.spawnRadius,
      config.offspringClearanceRadius + config.obstacleMask.cellSize,
      0.0001
    );
    const position = findFreePositionNearOrRandom(
      config.obstacleMask,
      rng,
      world.x[parentIndex],
      world.y[parentIndex],
      searchRadius,
      {
        maxAttempts: config.offspringSpawnMaxAttempts,
        clearanceRadius: config.offspringClearanceRadius
      }
    );
    return { ...position, terrainSampleCount: 0, terrainAffinitySum: 0, terrainRejectedCount: 0 };
  }

  const angle = rng.range(0, Math.PI * 2);
  const distance = config.spawnRadius > 0 ? rng.range(0, config.spawnRadius) : 0;
  const offsetX = Math.cos(angle) * distance;
  const offsetY = Math.sin(angle) * distance;

  return {
    x: wrap(world.x[parentIndex] + offsetX, world.worldWidth),
    y: wrap(world.y[parentIndex] + offsetY, world.worldHeight),
    found: true,
    attempts: 1,
    fallbackUsed: false,
    terrainSampleCount: 0,
    terrainAffinitySum: 0,
    terrainRejectedCount: 0
  };
}

function sampleOffspringTerrainAcceptance(
  terrain: TerrainLayer,
  x: number,
  y: number,
  parentTerrainAffinity: number,
  minAcceptance: number
): number {
  const sample = sampleTerrainAtPosition(terrain, x, y);
  const movementScore = 1 / Math.max(sample.movementCost, 0.000001);
  const resourceScore = clamp(sample.resourceAffinity, 0, 1.5) / 1.5;
  const frictionScore = clamp(sample.friction, 0, 1.5) / 1.5;
  const habitatScore = movementScore * 0.5 + resourceScore * 0.35 + frictionScore * 0.15;
  const parentSelectivity = clamp(0.75 + parentTerrainAffinity * 0.125, 0.25, 1.25);
  return clamp(habitatScore * parentSelectivity, minAcceptance, 1);
}

function spawnChild(
  world: WorldState,
  parentIndex: number,
  genomeId: number,
  rng: DeterministicRng,
  config: SpawnChildConfig
): SpawnChildResult {
  const basePhenotype: Record<ReproductionMutableParameter, number> = {
    radius: world.radius[parentIndex],
    mass: world.mass[parentIndex],
    drag: world.drag[parentIndex],
    maxSpeed: world.maxSpeed[parentIndex],
    turnRate: world.turnRate[parentIndex],
    metabolism: world.metabolism[parentIndex],
    maxEnergy: world.maxEnergy[parentIndex],
    maxStamina: world.maxStamina[parentIndex],
    health: world.health[parentIndex],
    armor: world.armor[parentIndex],
    mouthPower: world.mouthPower[parentIndex],
    landThrust: world.landThrust[parentIndex],
    waterThrust: world.waterThrust[parentIndex],
    flowAffinity: world.flowAffinity[parentIndex],
    terrainAffinity: world.terrainAffinity[parentIndex],
    visionRadius: world.visionRadius[parentIndex],
    visionCosHalfCone: world.visionCosHalfCone[parentIndex]
  };

  const phenotype = mutateParameterBlock(basePhenotype, config.mutationRules, rng);
  const childEnergy = Math.min(Math.max(0, config.childEnergy), phenotype.value.maxEnergy);
  const parentEnergyAfterCost = Math.max(0, world.energy[parentIndex] - config.energyCost);
  world.energy[parentIndex] = parentEnergyAfterCost;

  const childIndex = spawnAgent(world, {
    x: wrap(config.childX, world.worldWidth),
    y: wrap(config.childY, world.worldHeight),
    vx: world.vx[parentIndex] * config.inheritVelocityScale + rng.range(-2, 2),
    vy: world.vy[parentIndex] * config.inheritVelocityScale + rng.range(-2, 2),
    headingX: world.headingX[parentIndex],
    headingY: world.headingY[parentIndex],
    radius: phenotype.value.radius,
    mass: phenotype.value.mass,
    drag: phenotype.value.drag,
    maxSpeed: phenotype.value.maxSpeed,
    turnRate: phenotype.value.turnRate,
    energy: childEnergy,
    stamina: Math.min(world.stamina[parentIndex], phenotype.value.maxStamina),
    health: Math.max(1, phenotype.value.health),
    metabolism: phenotype.value.metabolism,
    maxEnergy: phenotype.value.maxEnergy,
    maxStamina: phenotype.value.maxStamina,
    dietMask: world.dietMask[parentIndex],
    armor: phenotype.value.armor,
    mouthPower: phenotype.value.mouthPower,
    landThrust: phenotype.value.landThrust,
    waterThrust: phenotype.value.waterThrust,
    flowAffinity: phenotype.value.flowAffinity,
    terrainAffinity: phenotype.value.terrainAffinity,
    visionRadius: phenotype.value.visionRadius,
    visionCosHalfCone: phenotype.value.visionCosHalfCone,
    componentFlags: world.componentFlags[parentIndex],
    archetypeId: world.archetypeId[parentIndex],
    speciesId: world.speciesId[parentIndex],
    colorRGBA: world.colorRGBA[parentIndex],
    genomeId,
    generationId: world.generationId[parentIndex] + 1,
    parentGenomeId: world.genomeId[parentIndex]
  });

  world.offspringCount[parentIndex] = Math.min(65535, world.offspringCount[parentIndex] + 1);
  return { index: childIndex, mutationStats: phenotype.stats };
}

function getNextGenomeId(world: WorldState): number {
  let maxGenomeId = 0;

  for (let index = 0; index < world.count; index += 1) {
    maxGenomeId = Math.max(maxGenomeId, world.genomeId[index]);
  }

  return (maxGenomeId + 1) >>> 0;
}

function finiteOrDefault(value: number | undefined, fallback: number, name: string): number {
  const resolved = value ?? fallback;
  assertFiniteNumber(resolved, name);
  return resolved;
}

function wrap(value: number, size: number): number {
  if (size <= 0) {
    return value;
  }

  return ((value % size) + size) % size;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

import { assertFiniteNumber, assertNonNegativeInteger } from "./arrays";
import { forEachNeighborInRadius, type RadiusNeighborQueryStats } from "./neighborQuery";
import type { SpatialHashGrid } from "./spatialHash";
import { killAgent, type WorldState } from "./world";

export const PREDATOR_PREY_SYSTEM_VERSION = "qubok_evolve.predator_prey.v1" as const;

export const DIET_PLANT = 1 << 0;
export const DIET_MEAT = 1 << 1;
export const DIET_OMNIVORE = DIET_PLANT | DIET_MEAT;

export type PredatorPreyInteractionConfig = {
  /** Radius used for local attack lookup. Uses spatial hash, not global scan. */
  readonly attackRadius?: number;

  /** Maximum attacks per predator per simulation step. 0 disables attacks. */
  readonly maxAttacksPerPredator?: number;

  /** Predators must have at least one of these diet bits. */
  readonly predatorDietMask?: number;

  /** Targets must have at least one of these diet bits. */
  readonly preyDietMask?: number;

  /** When true, agents with the same speciesId cannot attack each other. */
  readonly sameSpeciesProtection?: boolean;

  /** Damage multiplier applied to mouthPower. */
  readonly damageScale?: number;

  /** Flat damage reduction per armor point. */
  readonly armorAbsorptionScale?: number;

  /** Minimum damage after armor when raw mouthPower is positive. */
  readonly minimumDamage?: number;

  /** Energy spent by predator for every attack event. */
  readonly actionEnergyCost?: number;

  /** Predator energy gained from damage dealt. */
  readonly energyGainPerDamage?: number;

  /** Predator energy gained from prey remaining energy when prey dies. */
  readonly preyEnergyHarvestRatio?: number;

  /** Fitness reward per damage point. */
  readonly predatorFitnessPerDamage?: number;

  /** Additional fitness reward per kill. */
  readonly predatorFitnessPerKill?: number;
};

export type PredatorPreyInteractionStats = {
  readonly tick: number;
  readonly checkedCount: number;
  readonly eligiblePredatorCount: number;
  readonly neighborCandidates: number;
  readonly neighborCount: number;
  readonly rejectedSameSpeciesCount: number;
  readonly rejectedDietCount: number;
  readonly attacksThisStep: number;
  readonly killsThisStep: number;
  readonly damageDealt: number;
  readonly energySpent: number;
  readonly energyGained: number;
  readonly preyEnergyHarvested: number;
  readonly maxAttacksPerPredator: number;
};

type AttackTargetSearchResult = {
  readonly targetIndex: number;
  readonly distanceSquared: number;
  readonly stats: RadiusNeighborQueryStats;
  readonly rejectedSameSpeciesCount: number;
  readonly rejectedDietCount: number;
};

type ResolvedPredatorPreyConfig = {
  readonly attackRadius: number;
  readonly maxAttacksPerPredator: number;
  readonly predatorDietMask: number;
  readonly preyDietMask: number;
  readonly sameSpeciesProtection: boolean;
  readonly damageScale: number;
  readonly armorAbsorptionScale: number;
  readonly minimumDamage: number;
  readonly actionEnergyCost: number;
  readonly energyGainPerDamage: number;
  readonly preyEnergyHarvestRatio: number;
  readonly predatorFitnessPerDamage: number;
  readonly predatorFitnessPerKill: number;
};

const DEFAULT_ATTACK_RADIUS = 10;
const DEFAULT_MAX_ATTACKS_PER_PREDATOR = 1;
const DEFAULT_DAMAGE_SCALE = 1;
const DEFAULT_ARMOR_ABSORPTION_SCALE = 0.75;
const DEFAULT_MINIMUM_DAMAGE = 0.25;
const DEFAULT_ACTION_ENERGY_COST = 0.25;
const DEFAULT_ENERGY_GAIN_PER_DAMAGE = 0.35;
const DEFAULT_PREY_ENERGY_HARVEST_RATIO = 0.45;
const DEFAULT_PREDATOR_FITNESS_PER_DAMAGE = 0.15;
const DEFAULT_PREDATOR_FITNESS_PER_KILL = 12;
const UINT16_MAX = 0xffff;

export function applyPredatorPreyInteraction(
  world: WorldState,
  grid: SpatialHashGrid,
  config: PredatorPreyInteractionConfig = {}
): PredatorPreyInteractionStats {
  const resolved = resolveConfig(config);

  let checkedCount = 0;
  let eligiblePredatorCount = 0;
  let neighborCandidates = 0;
  let neighborCount = 0;
  let rejectedSameSpeciesCount = 0;
  let rejectedDietCount = 0;
  let attacksThisStep = 0;
  let killsThisStep = 0;
  let damageDealt = 0;
  let energySpent = 0;
  let energyGained = 0;
  let preyEnergyHarvested = 0;

  if (resolved.maxAttacksPerPredator === 0) {
    return {
      tick: world.tick,
      checkedCount: 0,
      eligiblePredatorCount: 0,
      neighborCandidates: 0,
      neighborCount: 0,
      rejectedSameSpeciesCount: 0,
      rejectedDietCount: 0,
      attacksThisStep: 0,
      killsThisStep: 0,
      damageDealt: 0,
      energySpent: 0,
      energyGained: 0,
      preyEnergyHarvested: 0,
      maxAttacksPerPredator: resolved.maxAttacksPerPredator
    };
  }

  for (let predatorIndex = 0; predatorIndex < world.count; predatorIndex += 1) {
    if (world.alive[predatorIndex] !== 1) {
      continue;
    }

    checkedCount += 1;

    if (!isPredator(world, predatorIndex, resolved)) {
      continue;
    }

    if (world.mouthPower[predatorIndex] <= 0) {
      continue;
    }

    if (resolved.actionEnergyCost > 0 && world.energy[predatorIndex] <= 0) {
      continue;
    }

    eligiblePredatorCount += 1;

    for (let attackIndex = 0; attackIndex < resolved.maxAttacksPerPredator; attackIndex += 1) {
      const target = findNearestPrey(world, grid, predatorIndex, resolved);
      neighborCandidates += target.stats.candidateCount;
      neighborCount += target.stats.neighborCount;
      rejectedSameSpeciesCount += target.rejectedSameSpeciesCount;
      rejectedDietCount += target.rejectedDietCount;

      if (target.targetIndex < 0) {
        break;
      }

      const attack = applyAttack(world, predatorIndex, target.targetIndex, resolved);
      attacksThisStep += 1;
      killsThisStep += attack.killed ? 1 : 0;
      damageDealt += attack.damage;
      energySpent += attack.energySpent;
      energyGained += attack.energyGained;
      preyEnergyHarvested += attack.preyEnergyHarvested;

      if (resolved.actionEnergyCost > 0 && world.energy[predatorIndex] <= 0) {
        break;
      }
    }
  }

  return {
    tick: world.tick,
    checkedCount,
    eligiblePredatorCount,
    neighborCandidates,
    neighborCount,
    rejectedSameSpeciesCount,
    rejectedDietCount,
    attacksThisStep,
    killsThisStep,
    damageDealt,
    energySpent,
    energyGained,
    preyEnergyHarvested,
    maxAttacksPerPredator: resolved.maxAttacksPerPredator
  };
}

function findNearestPrey(
  world: WorldState,
  grid: SpatialHashGrid,
  predatorIndex: number,
  config: ResolvedPredatorPreyConfig
): AttackTargetSearchResult {
  let targetIndex = -1;
  let targetDistanceSquared = Number.POSITIVE_INFINITY;
  let rejectedSameSpeciesCount = 0;
  let rejectedDietCount = 0;

  const stats = forEachNeighborInRadius(grid, world, predatorIndex, config.attackRadius, (visit) => {
    const candidateIndex = visit.neighborIndex;

    if (world.alive[candidateIndex] !== 1) {
      return;
    }

    if (config.sameSpeciesProtection && world.speciesId[candidateIndex] === world.speciesId[predatorIndex]) {
      rejectedSameSpeciesCount += 1;
      return;
    }

    if (!isPrey(world, candidateIndex, config)) {
      rejectedDietCount += 1;
      return;
    }

    if (visit.distanceSquared < targetDistanceSquared) {
      targetIndex = candidateIndex;
      targetDistanceSquared = visit.distanceSquared;
    }
  });

  return {
    targetIndex,
    distanceSquared: targetDistanceSquared,
    stats,
    rejectedSameSpeciesCount,
    rejectedDietCount
  };
}

function applyAttack(
  world: WorldState,
  predatorIndex: number,
  preyIndex: number,
  config: ResolvedPredatorPreyConfig
): {
  readonly damage: number;
  readonly killed: boolean;
  readonly energySpent: number;
  readonly energyGained: number;
  readonly preyEnergyHarvested: number;
} {
  const rawDamage = Math.max(0, world.mouthPower[predatorIndex]) * config.damageScale;
  const armorReduction = Math.max(0, world.armor[preyIndex]) * config.armorAbsorptionScale;
  const damage = rawDamage > 0 ? Math.max(config.minimumDamage, rawDamage - armorReduction) : 0;

  const energyBeforeSpend = world.energy[predatorIndex];
  const energySpent = Math.min(Math.max(0, energyBeforeSpend), config.actionEnergyCost);
  world.energy[predatorIndex] = Math.max(0, energyBeforeSpend - config.actionEnergyCost);

  world.health[preyIndex] = Math.max(0, world.health[preyIndex] - damage);
  world.damageTaken[preyIndex] += damage;
  world.fitnessAccum[predatorIndex] += damage * config.predatorFitnessPerDamage;
  world.fitnessAccum[preyIndex] -= damage;

  let killed = false;
  let preyEnergyHarvested = 0;

  if (world.health[preyIndex] <= 0 && world.alive[preyIndex] === 1) {
    killed = true;
    preyEnergyHarvested = Math.max(0, world.energy[preyIndex]) * config.preyEnergyHarvestRatio;
    killAgent(world, preyIndex);
    world.health[preyIndex] = 0;
    world.energy[preyIndex] = 0;
    world.kills[predatorIndex] = Math.min(UINT16_MAX, world.kills[predatorIndex] + 1);
    world.fitnessAccum[predatorIndex] += config.predatorFitnessPerKill;
  }

  const energyGainCandidate = damage * config.energyGainPerDamage + preyEnergyHarvested;
  const maxEnergy = Math.max(0, world.maxEnergy[predatorIndex]);
  const availableEnergyCapacity = Math.max(0, maxEnergy - world.energy[predatorIndex]);
  const energyGained = Math.min(availableEnergyCapacity, Math.max(0, energyGainCandidate));
  world.energy[predatorIndex] += energyGained;

  return {
    damage,
    killed,
    energySpent,
    energyGained,
    preyEnergyHarvested
  };
}

function isPredator(world: WorldState, index: number, config: ResolvedPredatorPreyConfig): boolean {
  return (world.dietMask[index] & config.predatorDietMask) !== 0;
}

function isPrey(world: WorldState, index: number, config: ResolvedPredatorPreyConfig): boolean {
  return (world.dietMask[index] & config.preyDietMask) !== 0;
}

function resolveConfig(config: PredatorPreyInteractionConfig): ResolvedPredatorPreyConfig {
  const resolved = {
    attackRadius: config.attackRadius ?? DEFAULT_ATTACK_RADIUS,
    maxAttacksPerPredator: config.maxAttacksPerPredator ?? DEFAULT_MAX_ATTACKS_PER_PREDATOR,
    predatorDietMask: config.predatorDietMask ?? DIET_MEAT,
    preyDietMask: config.preyDietMask ?? DIET_PLANT,
    sameSpeciesProtection: config.sameSpeciesProtection ?? true,
    damageScale: config.damageScale ?? DEFAULT_DAMAGE_SCALE,
    armorAbsorptionScale: config.armorAbsorptionScale ?? DEFAULT_ARMOR_ABSORPTION_SCALE,
    minimumDamage: config.minimumDamage ?? DEFAULT_MINIMUM_DAMAGE,
    actionEnergyCost: config.actionEnergyCost ?? DEFAULT_ACTION_ENERGY_COST,
    energyGainPerDamage: config.energyGainPerDamage ?? DEFAULT_ENERGY_GAIN_PER_DAMAGE,
    preyEnergyHarvestRatio: config.preyEnergyHarvestRatio ?? DEFAULT_PREY_ENERGY_HARVEST_RATIO,
    predatorFitnessPerDamage: config.predatorFitnessPerDamage ?? DEFAULT_PREDATOR_FITNESS_PER_DAMAGE,
    predatorFitnessPerKill: config.predatorFitnessPerKill ?? DEFAULT_PREDATOR_FITNESS_PER_KILL
  };

  assertFiniteNumber(resolved.attackRadius, "attackRadius");
  assertNonNegativeInteger(resolved.maxAttacksPerPredator, "maxAttacksPerPredator");
  assertNonNegativeInteger(resolved.predatorDietMask, "predatorDietMask");
  assertNonNegativeInteger(resolved.preyDietMask, "preyDietMask");
  assertFiniteNumber(resolved.damageScale, "damageScale");
  assertFiniteNumber(resolved.armorAbsorptionScale, "armorAbsorptionScale");
  assertFiniteNumber(resolved.minimumDamage, "minimumDamage");
  assertFiniteNumber(resolved.actionEnergyCost, "actionEnergyCost");
  assertFiniteNumber(resolved.energyGainPerDamage, "energyGainPerDamage");
  assertFiniteNumber(resolved.preyEnergyHarvestRatio, "preyEnergyHarvestRatio");
  assertFiniteNumber(resolved.predatorFitnessPerDamage, "predatorFitnessPerDamage");
  assertFiniteNumber(resolved.predatorFitnessPerKill, "predatorFitnessPerKill");

  if (resolved.attackRadius <= 0) {
    throw new Error(`attackRadius must be positive. Received: ${resolved.attackRadius}`);
  }

  if (resolved.predatorDietMask === 0) {
    throw new Error("predatorDietMask must not be 0.");
  }

  if (resolved.preyDietMask === 0) {
    throw new Error("preyDietMask must not be 0.");
  }

  if (
    resolved.damageScale < 0 ||
    resolved.armorAbsorptionScale < 0 ||
    resolved.minimumDamage < 0 ||
    resolved.actionEnergyCost < 0 ||
    resolved.energyGainPerDamage < 0 ||
    resolved.preyEnergyHarvestRatio < 0 ||
    resolved.predatorFitnessPerDamage < 0 ||
    resolved.predatorFitnessPerKill < 0
  ) {
    throw new Error("Predator/prey scalar config values must be non-negative.");
  }

  return resolved;
}
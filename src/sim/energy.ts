import { assertFiniteNumber } from "./arrays";
import type { WorldState } from "./world";

export const ENERGY_SYSTEM_VERSION = "qubok_evolve.energy.v1" as const;

export type EnergySurvivalConfig = {
  readonly deltaSeconds: number;
  readonly basalMetabolismScale?: number;
  readonly starvationEnergyThreshold?: number;
  readonly starvationDamagePerSecond?: number;
  readonly energyDebtDamageScale?: number;
  readonly clampEnergyToMax?: boolean;
  readonly killOnZeroHealth?: boolean;
};

export type EnergySurvivalStats = {
  readonly tick: number;
  readonly deltaSeconds: number;
  readonly checkedCount: number;
  readonly aliveBefore: number;
  readonly aliveAfter: number;
  readonly starvingCount: number;
  readonly deathsThisStep: number;
  readonly basalEnergySpent: number;
  readonly starvationDamage: number;
  readonly averageEnergy01: number;
  readonly averageHealth01: number;
};

export type EnergySummary = {
  readonly aliveCount: number;
  readonly starvingCount: number;
  readonly averageEnergy01: number;
  readonly averageHealth01: number;
};

const MAX_DELTA_SECONDS = 0.25;
const DEFAULT_STARVATION_DAMAGE_PER_SECOND = 18;
const DEFAULT_ENERGY_DEBT_DAMAGE_SCALE = 0.35;
const DEFAULT_STARVATION_THRESHOLD = 0;

export function applyEnergySurvival(world: WorldState, config: EnergySurvivalConfig): EnergySurvivalStats {
  const deltaSeconds = validateDeltaSeconds(config.deltaSeconds);
  const basalMetabolismScale = config.basalMetabolismScale ?? 1;
  const starvationEnergyThreshold = config.starvationEnergyThreshold ?? DEFAULT_STARVATION_THRESHOLD;
  const starvationDamagePerSecond = config.starvationDamagePerSecond ?? DEFAULT_STARVATION_DAMAGE_PER_SECOND;
  const energyDebtDamageScale = config.energyDebtDamageScale ?? DEFAULT_ENERGY_DEBT_DAMAGE_SCALE;
  const clampEnergyToMax = config.clampEnergyToMax ?? true;
  const killOnZeroHealth = config.killOnZeroHealth ?? true;

  assertFiniteNumber(basalMetabolismScale, "basalMetabolismScale");
  assertFiniteNumber(starvationEnergyThreshold, "starvationEnergyThreshold");
  assertFiniteNumber(starvationDamagePerSecond, "starvationDamagePerSecond");
  assertFiniteNumber(energyDebtDamageScale, "energyDebtDamageScale");

  let checkedCount = 0;
  let aliveBefore = 0;
  let aliveAfter = 0;
  let starvingCount = 0;
  let deathsThisStep = 0;
  let basalEnergySpent = 0;
  let starvationDamage = 0;
  let energyRatioSum = 0;
  let healthRatioSum = 0;

  for (let index = 0; index < world.count; index += 1) {
    if (world.alive[index] !== 1) {
      continue;
    }

    checkedCount += 1;
    aliveBefore += 1;

    const maxEnergy = Math.max(world.maxEnergy[index], 0.000001);
    const maxHealth = Math.max(100, world.health[index], 0.000001);
    const basalCost = Math.max(0, world.metabolism[index]) * Math.max(0, basalMetabolismScale) * deltaSeconds;
    let energy = world.energy[index] - basalCost;
    basalEnergySpent += basalCost;

    if (clampEnergyToMax) {
      energy = Math.min(energy, maxEnergy);
    }

    if (energy <= starvationEnergyThreshold) {
      starvingCount += 1;
      const energyDebt = Math.max(0, starvationEnergyThreshold - energy);
      const damage = Math.max(0, starvationDamagePerSecond) * deltaSeconds + energyDebt * Math.max(0, energyDebtDamageScale);

      world.health[index] -= damage;
      world.damageTaken[index] += damage;
      starvationDamage += damage;
      energy = Math.max(0, energy);
    }

    world.energy[index] = energy;

    if (killOnZeroHealth && world.health[index] <= 0) {
      world.health[index] = 0;
      world.energy[index] = 0;
      world.alive[index] = 0;
      deathsThisStep += 1;
      continue;
    }

    aliveAfter += 1;
    energyRatioSum += Math.max(0, Math.min(1, world.energy[index] / maxEnergy));
    healthRatioSum += Math.max(0, Math.min(1, world.health[index] / maxHealth));
  }

  return {
    tick: world.tick,
    deltaSeconds,
    checkedCount,
    aliveBefore,
    aliveAfter,
    starvingCount,
    deathsThisStep,
    basalEnergySpent,
    starvationDamage,
    averageEnergy01: aliveAfter > 0 ? energyRatioSum / aliveAfter : 0,
    averageHealth01: aliveAfter > 0 ? healthRatioSum / aliveAfter : 0
  };
}

export function getEnergySummary(world: WorldState, starvationEnergyThreshold = DEFAULT_STARVATION_THRESHOLD): EnergySummary {
  assertFiniteNumber(starvationEnergyThreshold, "starvationEnergyThreshold");

  let aliveCount = 0;
  let starvingCount = 0;
  let energyRatioSum = 0;
  let healthRatioSum = 0;

  for (let index = 0; index < world.count; index += 1) {
    if (world.alive[index] !== 1) {
      continue;
    }

    aliveCount += 1;

    if (world.energy[index] <= starvationEnergyThreshold) {
      starvingCount += 1;
    }

    energyRatioSum += Math.max(0, Math.min(1, world.energy[index] / Math.max(world.maxEnergy[index], 0.000001)));
    healthRatioSum += Math.max(0, Math.min(1, world.health[index] / Math.max(100, world.health[index], 0.000001)));
  }

  return {
    aliveCount,
    starvingCount,
    averageEnergy01: aliveCount > 0 ? energyRatioSum / aliveCount : 0,
    averageHealth01: aliveCount > 0 ? healthRatioSum / aliveCount : 0
  };
}

function validateDeltaSeconds(deltaSeconds: number): number {
  assertFiniteNumber(deltaSeconds, "deltaSeconds");

  if (deltaSeconds <= 0 || deltaSeconds > MAX_DELTA_SECONDS) {
    throw new Error(`deltaSeconds must be > 0 and <= ${MAX_DELTA_SECONDS}. Received: ${deltaSeconds}`);
  }

  return deltaSeconds;
}
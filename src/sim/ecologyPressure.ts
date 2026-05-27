import type { EnergySurvivalStats } from "./energy";
import type { PredatorPreyInteractionStats } from "./predatorPrey";
import type { ReproductionStepStats } from "./reproduction";
import type { ResourceLayer, ResourcePickupStats } from "./resources";
import type { SpawnValidationStats } from "./spawnValidation";
import type { WorldState } from "./world";

export const ECOLOGY_PRESSURE_VERSION = "qubok_evolve.ecology_pressure.m50" as const;

export const ECOLOGY_PRESSURE_PRESETS = [
  "neutral_lab",
  "scarce_food",
  "predator_pressure",
  "terrain_habitat",
  "field_current_stress"
] as const;

export type EcologyPressurePresetKey = (typeof ECOLOGY_PRESSURE_PRESETS)[number];

export type EcologyPressureConfig = {
  readonly ecologyPreset?: EcologyPressurePresetKey;
  readonly basalMetabolismScale?: number;
  readonly starvationEnergyThreshold?: number;
  readonly starvationDamagePerSecond?: number;
  readonly resourceTargetCount?: number;
  readonly resourceRespawnPerSecond?: number;
  readonly reproductionEnergyThreshold?: number;
  readonly reproductionEnergyCost?: number;
  readonly predatorAttackRadius?: number;
  readonly predatorDamageScale?: number;
};

export type ResolvedEcologyPressureConfig = {
  readonly ecologyPreset: EcologyPressurePresetKey;
  readonly basalMetabolismScale: number;
  readonly starvationEnergyThreshold: number;
  readonly starvationDamagePerSecond: number;
  readonly resourceTargetCount: number;
  readonly resourceRespawnPerSecond: number;
  readonly reproductionEnergyThreshold: number;
  readonly reproductionEnergyCost: number;
  readonly predatorAttackRadius: number;
  readonly predatorDamageScale: number;
};

export type EcologyPressureReadout = {
  readonly version: typeof ECOLOGY_PRESSURE_VERSION;
  readonly ecologyPreset: EcologyPressurePresetKey;
  readonly resourceTargetCount: number;
  readonly resourceAliveCount: number;
  readonly resourceRespawnedCount: number;
  readonly foodPickupCount: number;
  readonly foodEnergyTransferred: number;
  readonly averageEnergy01: number;
  readonly minimumEnergy01: number;
  readonly maximumEnergy01: number;
  readonly starvingCount: number;
  readonly starvationDamage: number;
  readonly deathsThisStep: number;
  readonly birthsThisStep: number;
  readonly blockedBirthsByCapacity: number;
  readonly predatorAttacksThisStep: number;
  readonly predatorKillsThisStep: number;
  readonly aliveCount: number;
  readonly capacity: number;
  readonly reusableSlotCount: number;
  readonly populationPressure01: number;
};

export type EcologyPressureReadoutInput = {
  readonly world: WorldState;
  readonly resources: ResourceLayer;
  readonly config: ResolvedEcologyPressureConfig;
  readonly energyStats: EnergySurvivalStats;
  readonly reproductionStats: ReproductionStepStats;
  readonly predatorPreyStats: PredatorPreyInteractionStats;
  readonly resourcePickupStats: ResourcePickupStats;
  readonly resourceRespawnStats: SpawnValidationStats;
};

export const DEFAULT_ECOLOGY_PRESSURE_CONFIG: ResolvedEcologyPressureConfig = {
  ecologyPreset: "neutral_lab",
  basalMetabolismScale: 0,
  starvationEnergyThreshold: 0,
  starvationDamagePerSecond: 18,
  resourceTargetCount: 2400,
  resourceRespawnPerSecond: 0,
  reproductionEnergyThreshold: 88,
  reproductionEnergyCost: 44,
  predatorAttackRadius: 24,
  predatorDamageScale: 0.85
} as const;

export const ECOLOGY_PRESSURE_PRESET_CONFIGS: Readonly<Record<EcologyPressurePresetKey, EcologyPressureConfig>> = Object.freeze({
  neutral_lab: {},
  scarce_food: {
    resourceTargetCount: 600,
    basalMetabolismScale: 1,
    starvationEnergyThreshold: 4,
    starvationDamagePerSecond: 22,
    reproductionEnergyThreshold: 96,
    reproductionEnergyCost: 52
  },
  predator_pressure: {
    resourceTargetCount: 1800,
    basalMetabolismScale: 0.35,
    predatorAttackRadius: 36,
    predatorDamageScale: 1.35
  },
  terrain_habitat: {
    resourceTargetCount: 1600,
    basalMetabolismScale: 0.5,
    reproductionEnergyThreshold: 92
  },
  field_current_stress: {
    resourceTargetCount: 1800,
    basalMetabolismScale: 0.75,
    reproductionEnergyThreshold: 90,
    reproductionEnergyCost: 48
  }
});

export function makeEcologyPressureConfig(config: EcologyPressureConfig = {}, limits: { readonly resourceCapacity?: number } = {}): ResolvedEcologyPressureConfig {
  const ecologyPreset = isEcologyPressurePreset(config.ecologyPreset) ? config.ecologyPreset : DEFAULT_ECOLOGY_PRESSURE_CONFIG.ecologyPreset;
  const preset = ECOLOGY_PRESSURE_PRESET_CONFIGS[ecologyPreset];
  const maxResourceTarget = Math.max(0, Math.floor(limits.resourceCapacity ?? Number.MAX_SAFE_INTEGER));

  return {
    ecologyPreset,
    basalMetabolismScale: clampFinite(config.basalMetabolismScale ?? preset.basalMetabolismScale ?? DEFAULT_ECOLOGY_PRESSURE_CONFIG.basalMetabolismScale, 0, 16),
    starvationEnergyThreshold: clampFinite(config.starvationEnergyThreshold ?? preset.starvationEnergyThreshold ?? DEFAULT_ECOLOGY_PRESSURE_CONFIG.starvationEnergyThreshold, 0, 100000),
    starvationDamagePerSecond: clampFinite(config.starvationDamagePerSecond ?? preset.starvationDamagePerSecond ?? DEFAULT_ECOLOGY_PRESSURE_CONFIG.starvationDamagePerSecond, 0, 10000),
    resourceTargetCount: clampInteger(config.resourceTargetCount ?? preset.resourceTargetCount ?? DEFAULT_ECOLOGY_PRESSURE_CONFIG.resourceTargetCount, 0, maxResourceTarget),
    resourceRespawnPerSecond: clampFinite(config.resourceRespawnPerSecond ?? preset.resourceRespawnPerSecond ?? DEFAULT_ECOLOGY_PRESSURE_CONFIG.resourceRespawnPerSecond, 0, 100000),
    reproductionEnergyThreshold: clampFinite(config.reproductionEnergyThreshold ?? preset.reproductionEnergyThreshold ?? DEFAULT_ECOLOGY_PRESSURE_CONFIG.reproductionEnergyThreshold, 0, 100000),
    reproductionEnergyCost: clampFinite(config.reproductionEnergyCost ?? preset.reproductionEnergyCost ?? DEFAULT_ECOLOGY_PRESSURE_CONFIG.reproductionEnergyCost, 0, 100000),
    predatorAttackRadius: clampFinite(config.predatorAttackRadius ?? preset.predatorAttackRadius ?? DEFAULT_ECOLOGY_PRESSURE_CONFIG.predatorAttackRadius, 0, 100000),
    predatorDamageScale: clampFinite(config.predatorDamageScale ?? preset.predatorDamageScale ?? DEFAULT_ECOLOGY_PRESSURE_CONFIG.predatorDamageScale, 0, 1000)
  };
}

export function makeEcologyPressureReadout(input: EcologyPressureReadoutInput): EcologyPressureReadout {
  const energyRange = measureEnergyRange(input.world);
  const aliveCount = input.energyStats.aliveAfter;

  return {
    version: ECOLOGY_PRESSURE_VERSION,
    ecologyPreset: input.config.ecologyPreset,
    resourceTargetCount: input.config.resourceTargetCount,
    resourceAliveCount: input.resources.aliveCount,
    resourceRespawnedCount: input.resourceRespawnStats.spawnedCount,
    foodPickupCount: input.resourcePickupStats.consumedCount,
    foodEnergyTransferred: input.resourcePickupStats.energyTransferred,
    averageEnergy01: input.energyStats.averageEnergy01,
    minimumEnergy01: energyRange.minimumEnergy01,
    maximumEnergy01: energyRange.maximumEnergy01,
    starvingCount: input.energyStats.starvingCount,
    starvationDamage: input.energyStats.starvationDamage,
    deathsThisStep: input.energyStats.deathsThisStep,
    birthsThisStep: input.reproductionStats.birthsThisStep,
    blockedBirthsByCapacity: input.reproductionStats.blockedByCapacity,
    predatorAttacksThisStep: input.predatorPreyStats.attacksThisStep,
    predatorKillsThisStep: input.predatorPreyStats.killsThisStep,
    aliveCount,
    capacity: input.world.capacity,
    reusableSlotCount: input.world.reusableSlotCount,
    populationPressure01: input.world.capacity > 0 ? clamp01(aliveCount / input.world.capacity) : 0
  };
}

export function isEcologyPressurePreset(value: unknown): value is EcologyPressurePresetKey {
  return typeof value === "string" && (ECOLOGY_PRESSURE_PRESETS as readonly string[]).includes(value);
}

function measureEnergyRange(world: WorldState): { readonly minimumEnergy01: number; readonly maximumEnergy01: number } {
  let minimumEnergy01 = 1;
  let maximumEnergy01 = 0;
  let aliveCount = 0;

  for (let index = 0; index < world.count; index += 1) {
    if (world.alive[index] !== 1) continue;
    aliveCount += 1;
    const energy01 = clamp01(world.energy[index] / Math.max(world.maxEnergy[index], 0.000001));
    minimumEnergy01 = Math.min(minimumEnergy01, energy01);
    maximumEnergy01 = Math.max(maximumEnergy01, energy01);
  }

  return {
    minimumEnergy01: aliveCount > 0 ? minimumEnergy01 : 0,
    maximumEnergy01: aliveCount > 0 ? maximumEnergy01 : 0
  };
}

function clampFinite(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min;
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(Number.isFinite(value) ? value : min)));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

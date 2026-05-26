import type { DeterministicRng } from "./rng";

export type MutablePhenotypeParameter =
  | "radius"
  | "mass"
  | "drag"
  | "maxSpeed"
  | "turnRate"
  | "metabolism"
  | "maxEnergy"
  | "maxStamina"
  | "staminaRecovery"
  | "health"
  | "armor"
  | "mouthPower"
  | "landThrust"
  | "waterThrust"
  | "flowAffinity"
  | "terrainAffinity"
  | "visionRadius"
  | "visionCosHalfCone";

export type MutationRule = {
  readonly min: number;
  readonly max: number;
  readonly standardDeviation: number;
  readonly probability: number;
  readonly integer?: boolean;
};

export type MutationResult = {
  readonly value: number;
  readonly changed: boolean;
  readonly delta: number;
  readonly clamped: boolean;
};

export type MutationStats = {
  readonly attempts: number;
  readonly changed: number;
  readonly clamped: number;
  readonly absoluteDeltaSum: number;
};

export type ParameterMutationResult<TParameterName extends string> = {
  readonly value: Record<TParameterName, number>;
  readonly stats: MutationStats;
};

export const DEFAULT_MUTATION_RULES: Readonly<Record<MutablePhenotypeParameter, MutationRule>> = Object.freeze({
  radius: { min: 1, max: 16, standardDeviation: 0.18, probability: 0.2 },
  mass: { min: 0.05, max: 64, standardDeviation: 0.35, probability: 0.2 },
  drag: { min: 0, max: 12, standardDeviation: 0.05, probability: 0.16 },
  maxSpeed: { min: 0.5, max: 380, standardDeviation: 4, probability: 0.22 },
  turnRate: { min: 0.05, max: 24, standardDeviation: 0.18, probability: 0.22 },
  metabolism: { min: 0, max: 12, standardDeviation: 0.04, probability: 0.18 },
  maxEnergy: { min: 1, max: 500, standardDeviation: 5, probability: 0.2 },
  maxStamina: { min: 1, max: 500, standardDeviation: 4, probability: 0.18 },
  staminaRecovery: { min: 0, max: 80, standardDeviation: 0.5, probability: 0.16 },
  health: { min: 1, max: 500, standardDeviation: 4, probability: 0.18 },
  armor: { min: 0, max: 64, standardDeviation: 0.15, probability: 0.14 },
  mouthPower: { min: 0, max: 120, standardDeviation: 1.2, probability: 0.16 },
  landThrust: { min: 0, max: 500, standardDeviation: 4, probability: 0.2 },
  waterThrust: { min: 0, max: 500, standardDeviation: 4, probability: 0.2 },
  flowAffinity: { min: -4, max: 4, standardDeviation: 0.04, probability: 0.14 },
  terrainAffinity: { min: -4, max: 4, standardDeviation: 0.04, probability: 0.14 },
  visionRadius: { min: 0, max: 320, standardDeviation: 4, probability: 0.2 },
  visionCosHalfCone: { min: -1, max: 1, standardDeviation: 0.025, probability: 0.16 }
});

export function mutateScalar(
  value: number,
  rule: MutationRule,
  rng: DeterministicRng
): MutationResult {
  validateFiniteNumber("value", value);
  validateMutationRule(rule);

  if (rule.probability <= 0) {
    return {
      value,
      changed: false,
      delta: 0,
      clamped: false
    };
  }

  if (rng.nextFloat01() >= rule.probability) {
    return {
      value,
      changed: false,
      delta: 0,
      clamped: false
    };
  }

  const delta = gaussian01(rng) * rule.standardDeviation;
  const rawValue = value + delta;
  const clampedValue = clamp(rawValue, rule.min, rule.max);
  const finalValue = rule.integer ? clamp(Math.round(clampedValue), rule.min, rule.max) : clampedValue;

  return {
    value: finalValue,
    changed: finalValue !== value,
    delta: finalValue - value,
    clamped: finalValue !== rawValue
  };
}

export function mutateParameterBlock<TParameterName extends string>(
  base: Readonly<Record<TParameterName, number>>,
  rules: Readonly<Partial<Record<TParameterName, MutationRule>>>,
  rng: DeterministicRng
): ParameterMutationResult<TParameterName> {
  const value = { ...base } as Record<TParameterName, number>;
  let attempts = 0;
  let changed = 0;
  let clamped = 0;
  let absoluteDeltaSum = 0;

  for (const key of Object.keys(rules) as TParameterName[]) {
    const rule = rules[key];

    if (rule === undefined) {
      continue;
    }

    const current = base[key];
    validateFiniteNumber(key, current);

    const result = mutateScalar(current, rule, rng);
    attempts += 1;

    if (result.changed) {
      changed += 1;
    }

    if (result.clamped) {
      clamped += 1;
    }

    absoluteDeltaSum += Math.abs(result.delta);
    value[key] = result.value;
  }

  return {
    value,
    stats: {
      attempts,
      changed,
      clamped,
      absoluteDeltaSum
    }
  };
}

export function clampPhenotypeValue(parameter: MutablePhenotypeParameter, value: number): number {
  const rule = DEFAULT_MUTATION_RULES[parameter];
  validateFiniteNumber(parameter, value);
  return clamp(value, rule.min, rule.max);
}

export function scaleMutationRule(rule: MutationRule, standardDeviationScale: number): MutationRule {
  validateMutationRule(rule);
  validateFiniteNumber("standardDeviationScale", standardDeviationScale);

  if (standardDeviationScale < 0) {
    throw new Error(`standardDeviationScale must be >= 0. Received: ${standardDeviationScale}`);
  }

  return {
    ...rule,
    standardDeviation: rule.standardDeviation * standardDeviationScale
  };
}

function gaussian01(rng: DeterministicRng): number {
  const u1 = Math.max(Number.EPSILON, rng.nextFloat01());
  const u2 = rng.nextFloat01();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function validateMutationRule(rule: MutationRule): void {
  validateFiniteNumber("rule.min", rule.min);
  validateFiniteNumber("rule.max", rule.max);
  validateFiniteNumber("rule.standardDeviation", rule.standardDeviation);
  validateFiniteNumber("rule.probability", rule.probability);

  if (rule.max < rule.min) {
    throw new Error(`Mutation rule max must be >= min. min=${rule.min}, max=${rule.max}`);
  }

  if (rule.standardDeviation < 0) {
    throw new Error(`Mutation rule standardDeviation must be >= 0. Received: ${rule.standardDeviation}`);
  }

  if (rule.probability < 0 || rule.probability > 1) {
    throw new Error(`Mutation rule probability must be in 0..1. Received: ${rule.probability}`);
  }
}

function validateFiniteNumber(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be finite. Received: ${value}`);
  }
}
import { assertFiniteNumber } from "./arrays";
import { sampleFieldAtPosition, type EnvironmentalFieldLayer } from "./field";
import type { WorldState } from "./world";

export const FIELD_FORCE_VERSION = "qubok_evolve.field_force.m47" as const;

export type FieldForceConfig = {
  readonly enabled?: boolean;
  readonly strength?: number;
  readonly maxForcePerAgent?: number;
  readonly minActiveMagnitude?: number;
};

export type ResolvedFieldForceConfig = {
  readonly enabled: boolean;
  readonly strength: number;
  readonly maxForcePerAgent: number;
  readonly minActiveMagnitude: number;
};

export type FieldForceStepMetrics = {
  readonly tick: number;
  readonly enabled: boolean;
  readonly agentCount: number;
  readonly sampleCount: number;
  readonly affectedAgentCount: number;
  readonly ignoredDeadCount: number;
  readonly zeroFieldCount: number;
  readonly clampCount: number;
  readonly totalForceX: number;
  readonly totalForceY: number;
  readonly totalForceMagnitude: number;
  readonly maxForceMagnitude: number;
  readonly fieldMagnitudeSum: number;
};

export const DEFAULT_FIELD_FORCE_CONFIG: ResolvedFieldForceConfig = {
  enabled: false,
  strength: 1,
  maxForcePerAgent: 1000,
  minActiveMagnitude: 0
} as const;

const EPSILON = 0.000001;

export function makeFieldForceConfig(config: FieldForceConfig = {}): ResolvedFieldForceConfig {
  const strength = config.strength ?? DEFAULT_FIELD_FORCE_CONFIG.strength;
  const maxForcePerAgent = config.maxForcePerAgent ?? DEFAULT_FIELD_FORCE_CONFIG.maxForcePerAgent;
  const minActiveMagnitude = config.minActiveMagnitude ?? DEFAULT_FIELD_FORCE_CONFIG.minActiveMagnitude;

  assertFiniteNumber(strength, "field force strength");
  assertFiniteNumber(maxForcePerAgent, "field force maxForcePerAgent");
  assertFiniteNumber(minActiveMagnitude, "field force minActiveMagnitude");

  return {
    enabled: config.enabled ?? DEFAULT_FIELD_FORCE_CONFIG.enabled,
    strength: Math.max(0, strength),
    maxForcePerAgent: Math.max(0, maxForcePerAgent),
    minActiveMagnitude: Math.max(0, minActiveMagnitude)
  };
}

export function applyFieldForces(world: WorldState, field: EnvironmentalFieldLayer, config: FieldForceConfig = {}): FieldForceStepMetrics {
  const resolvedConfig = makeFieldForceConfig(config);

  if (!resolvedConfig.enabled || resolvedConfig.strength <= 0 || resolvedConfig.maxForcePerAgent <= 0) {
    return makeEmptyMetrics(world.tick, resolvedConfig.enabled);
  }

  let agentCount = 0;
  let sampleCount = 0;
  let affectedAgentCount = 0;
  let ignoredDeadCount = 0;
  let zeroFieldCount = 0;
  let clampCount = 0;
  let totalForceX = 0;
  let totalForceY = 0;
  let totalForceMagnitude = 0;
  let maxForceMagnitude = 0;
  let fieldMagnitudeSum = 0;

  for (let index = 0; index < world.count; index += 1) {
    if (world.alive[index] !== 1) {
      ignoredDeadCount += 1;
      continue;
    }

    agentCount += 1;

    const sample = sampleFieldAtPosition(field, world.x[index], world.y[index]);
    const fieldMagnitude = sample.flowMagnitude;
    sampleCount += 1;
    fieldMagnitudeSum += fieldMagnitude;

    if (fieldMagnitude <= resolvedConfig.minActiveMagnitude) {
      zeroFieldCount += 1;
      continue;
    }

    const affinity = world.flowAffinity[index];
    if (!Number.isFinite(affinity)) throw new Error(`field force flowAffinity must be finite. Received: ${affinity}`);

    let forceX = sample.flowX * resolvedConfig.strength * affinity;
    let forceY = sample.flowY * resolvedConfig.strength * affinity;
    let forceMagnitude = Math.hypot(forceX, forceY);

    if (!Number.isFinite(forceX) || !Number.isFinite(forceY) || !Number.isFinite(forceMagnitude)) {
      throw new Error("field force produced a non-finite force output.");
    }

    if (forceMagnitude <= EPSILON) {
      zeroFieldCount += 1;
      continue;
    }

    if (forceMagnitude > resolvedConfig.maxForcePerAgent) {
      const scale = resolvedConfig.maxForcePerAgent / forceMagnitude;
      forceX *= scale;
      forceY *= scale;
      forceMagnitude = resolvedConfig.maxForcePerAgent;
      clampCount += 1;
    }

    world.fx[index] += forceX;
    world.fy[index] += forceY;

    affectedAgentCount += 1;
    totalForceX += forceX;
    totalForceY += forceY;
    totalForceMagnitude += forceMagnitude;
    maxForceMagnitude = Math.max(maxForceMagnitude, forceMagnitude);
  }

  return {
    tick: world.tick,
    enabled: resolvedConfig.enabled,
    agentCount,
    sampleCount,
    affectedAgentCount,
    ignoredDeadCount,
    zeroFieldCount,
    clampCount,
    totalForceX,
    totalForceY,
    totalForceMagnitude,
    maxForceMagnitude,
    fieldMagnitudeSum
  };
}

function makeEmptyMetrics(tick: number, enabled: boolean): FieldForceStepMetrics {
  return {
    tick,
    enabled,
    agentCount: 0,
    sampleCount: 0,
    affectedAgentCount: 0,
    ignoredDeadCount: 0,
    zeroFieldCount: 0,
    clampCount: 0,
    totalForceX: 0,
    totalForceY: 0,
    totalForceMagnitude: 0,
    maxForceMagnitude: 0,
    fieldMagnitudeSum: 0
  };
}

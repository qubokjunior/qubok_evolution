import { assertFiniteNumber, assertPositiveInteger } from "./arrays";
import type { WorldState } from "./world";

export const CONTROLLER_VERSION = "qubok_evolve.controller.m48" as const;

export type AgentControllerConfig = {
  readonly enabled?: boolean;
  readonly strength?: number;
  readonly maxIntentPerAgent?: number;
  readonly foodWeight?: number;
  readonly threatWeight?: number;
  readonly flowWeight?: number;
};

export type ResolvedAgentControllerConfig = {
  readonly enabled: boolean;
  readonly strength: number;
  readonly maxIntentPerAgent: number;
  readonly foodWeight: number;
  readonly threatWeight: number;
  readonly flowWeight: number;
};

export type AgentControllerOutput = {
  readonly version: typeof CONTROLLER_VERSION;
  readonly capacity: number;
  readonly intentX: Float32Array;
  readonly intentY: Float32Array;
  readonly intentMagnitude: Float32Array;
};

export type AgentControllerStepMetrics = {
  readonly tick: number;
  readonly enabled: boolean;
  readonly agentCount: number;
  readonly sampleCount: number;
  readonly affectedAgentCount: number;
  readonly ignoredDeadCount: number;
  readonly zeroIntentCount: number;
  readonly clampCount: number;
  readonly totalIntentX: number;
  readonly totalIntentY: number;
  readonly totalIntentMagnitude: number;
  readonly maxIntentMagnitude: number;
};

export const DEFAULT_AGENT_CONTROLLER_CONFIG: ResolvedAgentControllerConfig = {
  enabled: false,
  strength: 1,
  maxIntentPerAgent: 1,
  foodWeight: 1,
  threatWeight: 1,
  flowWeight: 1
} as const;

const EPSILON = 0.000001;

export function createAgentControllerOutput(capacity: number): AgentControllerOutput {
  assertPositiveInteger(capacity, "controller output capacity");

  return {
    version: CONTROLLER_VERSION,
    capacity,
    intentX: new Float32Array(capacity),
    intentY: new Float32Array(capacity),
    intentMagnitude: new Float32Array(capacity)
  };
}

export function clearAgentControllerOutput(output: AgentControllerOutput, count = output.capacity): void {
  if (!Number.isInteger(count) || count < 0 || count > output.capacity) {
    throw new Error(`controller output clear count out of range: ${count}`);
  }

  output.intentX.fill(0, 0, count);
  output.intentY.fill(0, 0, count);
  output.intentMagnitude.fill(0, 0, count);
}

export function makeAgentControllerConfig(config: AgentControllerConfig = {}): ResolvedAgentControllerConfig {
  const strength = config.strength ?? DEFAULT_AGENT_CONTROLLER_CONFIG.strength;
  const maxIntentPerAgent = config.maxIntentPerAgent ?? DEFAULT_AGENT_CONTROLLER_CONFIG.maxIntentPerAgent;
  const foodWeight = config.foodWeight ?? DEFAULT_AGENT_CONTROLLER_CONFIG.foodWeight;
  const threatWeight = config.threatWeight ?? DEFAULT_AGENT_CONTROLLER_CONFIG.threatWeight;
  const flowWeight = config.flowWeight ?? DEFAULT_AGENT_CONTROLLER_CONFIG.flowWeight;

  assertFiniteNumber(strength, "controller strength");
  assertFiniteNumber(maxIntentPerAgent, "controller maxIntentPerAgent");
  assertFiniteNumber(foodWeight, "controller foodWeight");
  assertFiniteNumber(threatWeight, "controller threatWeight");
  assertFiniteNumber(flowWeight, "controller flowWeight");

  return {
    enabled: config.enabled ?? DEFAULT_AGENT_CONTROLLER_CONFIG.enabled,
    strength: Math.max(0, strength),
    maxIntentPerAgent: Math.max(0, maxIntentPerAgent),
    foodWeight,
    threatWeight,
    flowWeight
  };
}

export function stepAgentController(world: WorldState, output: AgentControllerOutput, config: AgentControllerConfig = {}): AgentControllerStepMetrics {
  if (output.capacity < world.count) {
    throw new Error(`controller output capacity ${output.capacity} is smaller than world count ${world.count}`);
  }

  const resolvedConfig = makeAgentControllerConfig(config);

  if (!resolvedConfig.enabled || resolvedConfig.strength <= 0 || resolvedConfig.maxIntentPerAgent <= 0) {
    return makeEmptyMetrics(world.tick, resolvedConfig.enabled);
  }

  let agentCount = 0;
  let sampleCount = 0;
  let affectedAgentCount = 0;
  let ignoredDeadCount = 0;
  let zeroIntentCount = 0;
  let clampCount = 0;
  let totalIntentX = 0;
  let totalIntentY = 0;
  let totalIntentMagnitude = 0;
  let maxIntentMagnitude = 0;

  for (let index = 0; index < world.count; index += 1) {
    output.intentX[index] = 0;
    output.intentY[index] = 0;
    output.intentMagnitude[index] = 0;

    if (world.alive[index] !== 1) {
      ignoredDeadCount += 1;
      continue;
    }

    agentCount += 1;
    sampleCount += 1;

    let intentX = world.flowSampleX[index] * resolvedConfig.flowWeight;
    let intentY = world.flowSampleY[index] * resolvedConfig.flowWeight;

    const sectorBase = world.sensorSectorBase[index];
    for (let sector = 0; sector < world.sectorCount; sector += 1) {
      const sensorIndex = sectorBase + sector;
      const food = world.sectorFood[sensorIndex] * resolvedConfig.foodWeight;
      const threat = world.sectorThreat[sensorIndex] * resolvedConfig.threatWeight;
      const sectorSignal = food - threat;

      if (sectorSignal === 0) continue;

      const angle = (sector / world.sectorCount) * Math.PI * 2;
      intentX += Math.cos(angle) * sectorSignal;
      intentY += Math.sin(angle) * sectorSignal;
    }

    intentX *= resolvedConfig.strength;
    intentY *= resolvedConfig.strength;

    let intentMagnitude = Math.hypot(intentX, intentY);

    if (!Number.isFinite(intentX) || !Number.isFinite(intentY) || !Number.isFinite(intentMagnitude)) {
      throw new Error("controller produced a non-finite intent output.");
    }

    if (intentMagnitude <= EPSILON) {
      zeroIntentCount += 1;
      continue;
    }

    if (intentMagnitude > resolvedConfig.maxIntentPerAgent) {
      const scale = resolvedConfig.maxIntentPerAgent / intentMagnitude;
      intentX *= scale;
      intentY *= scale;
      intentMagnitude = resolvedConfig.maxIntentPerAgent;
      clampCount += 1;
    }

    output.intentX[index] = intentX;
    output.intentY[index] = intentY;
    output.intentMagnitude[index] = intentMagnitude;

    affectedAgentCount += 1;
    totalIntentX += intentX;
    totalIntentY += intentY;
    totalIntentMagnitude += intentMagnitude;
    maxIntentMagnitude = Math.max(maxIntentMagnitude, intentMagnitude);
  }

  return {
    tick: world.tick,
    enabled: resolvedConfig.enabled,
    agentCount,
    sampleCount,
    affectedAgentCount,
    ignoredDeadCount,
    zeroIntentCount,
    clampCount,
    totalIntentX,
    totalIntentY,
    totalIntentMagnitude,
    maxIntentMagnitude
  };
}

function makeEmptyMetrics(tick: number, enabled: boolean): AgentControllerStepMetrics {
  return {
    tick,
    enabled,
    agentCount: 0,
    sampleCount: 0,
    affectedAgentCount: 0,
    ignoredDeadCount: 0,
    zeroIntentCount: 0,
    clampCount: 0,
    totalIntentX: 0,
    totalIntentY: 0,
    totalIntentMagnitude: 0,
    maxIntentMagnitude: 0
  };
}

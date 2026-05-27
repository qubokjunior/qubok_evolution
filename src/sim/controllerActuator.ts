import { assertFiniteNumber } from "./arrays";
import type { AgentControllerOutput } from "./controller";
import type { WorldState } from "./world";

export const CONTROLLER_ACTUATOR_VERSION = "qubok_evolve.controller_actuator.m49" as const;

export type ControllerActuatorConfig = {
  readonly enableControllerMovementInfluence?: boolean;
  readonly controllerForceScale?: number;
  readonly controllerMaxForce?: number;
  readonly minActiveIntentMagnitude?: number;
};

export type ResolvedControllerActuatorConfig = {
  readonly enableControllerMovementInfluence: boolean;
  readonly controllerForceScale: number;
  readonly controllerMaxForce: number;
  readonly minActiveIntentMagnitude: number;
};

export type ControllerActuatorStepMetrics = {
  readonly tick: number;
  readonly enabled: boolean;
  readonly agentCount: number;
  readonly sampleCount: number;
  readonly affectedAgentCount: number;
  readonly ignoredDeadCount: number;
  readonly zeroIntentCount: number;
  readonly clampCount: number;
  readonly totalForceX: number;
  readonly totalForceY: number;
  readonly totalForceMagnitude: number;
  readonly maxForceMagnitude: number;
  readonly totalIntentMagnitude: number;
};

export const DEFAULT_CONTROLLER_ACTUATOR_CONFIG: ResolvedControllerActuatorConfig = {
  enableControllerMovementInfluence: false,
  controllerForceScale: 1,
  controllerMaxForce: 1,
  minActiveIntentMagnitude: 0
} as const;

const EPSILON = 0.000001;

export function makeControllerActuatorConfig(config: ControllerActuatorConfig = {}): ResolvedControllerActuatorConfig {
  const controllerForceScale = config.controllerForceScale ?? DEFAULT_CONTROLLER_ACTUATOR_CONFIG.controllerForceScale;
  const controllerMaxForce = config.controllerMaxForce ?? DEFAULT_CONTROLLER_ACTUATOR_CONFIG.controllerMaxForce;
  const minActiveIntentMagnitude = config.minActiveIntentMagnitude ?? DEFAULT_CONTROLLER_ACTUATOR_CONFIG.minActiveIntentMagnitude;

  assertFiniteNumber(controllerForceScale, "controller actuator force scale");
  assertFiniteNumber(controllerMaxForce, "controller actuator max force");
  assertFiniteNumber(minActiveIntentMagnitude, "controller actuator min active intent magnitude");

  return {
    enableControllerMovementInfluence: config.enableControllerMovementInfluence ?? DEFAULT_CONTROLLER_ACTUATOR_CONFIG.enableControllerMovementInfluence,
    controllerForceScale: Math.max(0, controllerForceScale),
    controllerMaxForce: Math.max(0, controllerMaxForce),
    minActiveIntentMagnitude: Math.max(0, minActiveIntentMagnitude)
  };
}

export function applyControllerActuator(world: WorldState, controllerOutput: AgentControllerOutput, config: ControllerActuatorConfig = {}): ControllerActuatorStepMetrics {
  if (controllerOutput.capacity < world.count) {
    throw new Error(`controller actuator output capacity ${controllerOutput.capacity} is smaller than world count ${world.count}`);
  }

  const resolvedConfig = makeControllerActuatorConfig(config);

  if (!resolvedConfig.enableControllerMovementInfluence || resolvedConfig.controllerForceScale <= 0 || resolvedConfig.controllerMaxForce <= 0) {
    return makeEmptyMetrics(world.tick, resolvedConfig.enableControllerMovementInfluence);
  }

  let agentCount = 0;
  let sampleCount = 0;
  let affectedAgentCount = 0;
  let ignoredDeadCount = 0;
  let zeroIntentCount = 0;
  let clampCount = 0;
  let totalForceX = 0;
  let totalForceY = 0;
  let totalForceMagnitude = 0;
  let maxForceMagnitude = 0;
  let totalIntentMagnitude = 0;

  for (let index = 0; index < world.count; index += 1) {
    if (world.alive[index] !== 1) {
      ignoredDeadCount += 1;
      continue;
    }

    agentCount += 1;
    sampleCount += 1;

    const intentX = controllerOutput.intentX[index];
    const intentY = controllerOutput.intentY[index];
    const intentMagnitude = controllerOutput.intentMagnitude[index];

    if (!Number.isFinite(intentX) || !Number.isFinite(intentY) || !Number.isFinite(intentMagnitude)) {
      throw new Error("controller actuator received a non-finite intent output.");
    }

    totalIntentMagnitude += intentMagnitude;

    if (intentMagnitude <= resolvedConfig.minActiveIntentMagnitude || intentMagnitude <= EPSILON) {
      zeroIntentCount += 1;
      continue;
    }

    let forceX = intentX * resolvedConfig.controllerForceScale;
    let forceY = intentY * resolvedConfig.controllerForceScale;
    let forceMagnitude = Math.hypot(forceX, forceY);

    if (!Number.isFinite(forceX) || !Number.isFinite(forceY) || !Number.isFinite(forceMagnitude)) {
      throw new Error("controller actuator produced a non-finite force output.");
    }

    if (forceMagnitude <= EPSILON) {
      zeroIntentCount += 1;
      continue;
    }

    if (forceMagnitude > resolvedConfig.controllerMaxForce) {
      const scale = resolvedConfig.controllerMaxForce / forceMagnitude;
      forceX *= scale;
      forceY *= scale;
      forceMagnitude = resolvedConfig.controllerMaxForce;
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
    enabled: resolvedConfig.enableControllerMovementInfluence,
    agentCount,
    sampleCount,
    affectedAgentCount,
    ignoredDeadCount,
    zeroIntentCount,
    clampCount,
    totalForceX,
    totalForceY,
    totalForceMagnitude,
    maxForceMagnitude,
    totalIntentMagnitude
  };
}

function makeEmptyMetrics(tick: number, enabled: boolean): ControllerActuatorStepMetrics {
  return {
    tick,
    enabled,
    agentCount: 0,
    sampleCount: 0,
    affectedAgentCount: 0,
    ignoredDeadCount: 0,
    zeroIntentCount: 0,
    clampCount: 0,
    totalForceX: 0,
    totalForceY: 0,
    totalForceMagnitude: 0,
    maxForceMagnitude: 0,
    totalIntentMagnitude: 0
  };
}

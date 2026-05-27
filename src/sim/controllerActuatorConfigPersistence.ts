import type { DemoSimulationControllerActuatorConfig, DemoSimulationControllerActuatorConfigPatch } from "./demoSimulation";

export const CONTROLLER_ACTUATOR_CONFIG_STORAGE_KEY = "qubok_evolve.controller_actuator_config.v1" as const;

export function loadStoredControllerActuatorConfig(): DemoSimulationControllerActuatorConfigPatch {
  try {
    const rawValue = localStorage.getItem(CONTROLLER_ACTUATOR_CONFIG_STORAGE_KEY);
    if (rawValue === null) return {};
    const parsed = JSON.parse(rawValue) as Partial<DemoSimulationControllerActuatorConfig>;
    const patch: DemoSimulationControllerActuatorConfigPatch = {};
    if (typeof parsed.enableControllerMovementInfluence === "boolean") patch.enableControllerMovementInfluence = parsed.enableControllerMovementInfluence;
    if (typeof parsed.controllerForceScale === "number" && Number.isFinite(parsed.controllerForceScale)) patch.controllerForceScale = parsed.controllerForceScale;
    if (typeof parsed.controllerMaxForce === "number" && Number.isFinite(parsed.controllerMaxForce)) patch.controllerMaxForce = parsed.controllerMaxForce;
    if (typeof parsed.controllerMinActiveIntentMagnitude === "number" && Number.isFinite(parsed.controllerMinActiveIntentMagnitude)) patch.controllerMinActiveIntentMagnitude = parsed.controllerMinActiveIntentMagnitude;
    return patch;
  } catch {
    return {};
  }
}

export function saveControllerActuatorConfig(config: DemoSimulationControllerActuatorConfig): void {
  try {
    localStorage.setItem(CONTROLLER_ACTUATOR_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // storage can be unavailable.
  }
}

export function clearStoredControllerActuatorConfig(): void {
  try {
    localStorage.removeItem(CONTROLLER_ACTUATOR_CONFIG_STORAGE_KEY);
  } catch {
    // storage can be unavailable.
  }
}

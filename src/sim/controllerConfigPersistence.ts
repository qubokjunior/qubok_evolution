import type { DemoSimulationControllerConfig, DemoSimulationControllerConfigPatch } from "./demoSimulation";

export const CONTROLLER_CONFIG_STORAGE_KEY = "qubok_evolve.controller_config.v1" as const;

const BOOLEAN_KEYS = Object.freeze([
  "enableController"
] satisfies readonly (keyof DemoSimulationControllerConfig)[]);

const NUMBER_KEYS = Object.freeze([
  "controllerStrength",
  "controllerMaxIntentPerAgent",
  "controllerFoodWeight",
  "controllerThreatWeight",
  "controllerFlowWeight"
] satisfies readonly (keyof DemoSimulationControllerConfig)[]);

export function loadStoredControllerConfig(): DemoSimulationControllerConfigPatch {
  try {
    const rawValue = localStorage.getItem(CONTROLLER_CONFIG_STORAGE_KEY);
    if (rawValue === null) return {};
    const parsed = JSON.parse(rawValue) as Record<string, unknown>;
    const patch: DemoSimulationControllerConfigPatch = {};

    for (const key of BOOLEAN_KEYS) {
      const value = parsed[key];
      if (typeof value === "boolean") (patch as Record<string, boolean>)[key] = value;
    }

    for (const key of NUMBER_KEYS) {
      const value = parsed[key];
      if (typeof value === "number" && Number.isFinite(value)) (patch as Record<string, number>)[key] = value;
    }

    return patch;
  } catch {
    return {};
  }
}

export function saveControllerConfig(config: DemoSimulationControllerConfig): void {
  try {
    localStorage.setItem(CONTROLLER_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // localStorage can be unavailable in restricted contexts.
  }
}

export function clearStoredControllerConfig(): void {
  try {
    localStorage.removeItem(CONTROLLER_CONFIG_STORAGE_KEY);
  } catch {
    // localStorage can be unavailable in restricted contexts.
  }
}

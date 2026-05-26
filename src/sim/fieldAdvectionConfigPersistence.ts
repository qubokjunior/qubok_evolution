import type { DemoSimulationFieldAdvectionConfig, DemoSimulationFieldAdvectionConfigPatch } from "./demoSimulation";

export const FIELD_ADVECTION_CONFIG_STORAGE_KEY = "qubok_evolve.field_advection_config.v1" as const;

const BOOLEAN_KEYS = Object.freeze([
  "enableFieldAdvection"
] satisfies readonly (keyof DemoSimulationFieldAdvectionConfig)[]);

const NUMBER_KEYS = Object.freeze([
  "fieldAdvectionStrength",
  "fieldAdvectionSubsteps",
  "fieldAdvectionMinActiveMagnitude"
] satisfies readonly (keyof DemoSimulationFieldAdvectionConfig)[]);

export function loadStoredFieldAdvectionConfig(): DemoSimulationFieldAdvectionConfigPatch {
  try {
    const rawValue = localStorage.getItem(FIELD_ADVECTION_CONFIG_STORAGE_KEY);
    if (rawValue === null) return {};

    const parsed = JSON.parse(rawValue) as Record<string, unknown>;
    const patch: DemoSimulationFieldAdvectionConfigPatch = {};

    for (const key of BOOLEAN_KEYS) {
      const value = parsed[key];
      if (typeof value === "boolean") {
        (patch as Record<string, boolean>)[key] = value;
      }
    }

    for (const key of NUMBER_KEYS) {
      const value = parsed[key];
      if (typeof value === "number" && Number.isFinite(value)) {
        (patch as Record<string, number>)[key] = value;
      }
    }

    return patch;
  } catch {
    return {};
  }
}

export function saveFieldAdvectionConfig(config: DemoSimulationFieldAdvectionConfig): void {
  try {
    localStorage.setItem(FIELD_ADVECTION_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // localStorage can be unavailable in restricted contexts.
  }
}

export function clearStoredFieldAdvectionConfig(): void {
  try {
    localStorage.removeItem(FIELD_ADVECTION_CONFIG_STORAGE_KEY);
  } catch {
    // localStorage can be unavailable in restricted contexts.
  }
}

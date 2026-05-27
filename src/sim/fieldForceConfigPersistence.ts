import type { DemoSimulationFieldForceConfig, DemoSimulationFieldForceConfigPatch } from "./demoSimulation";

export const FIELD_FORCE_CONFIG_STORAGE_KEY = "qubok_evolve.field_force_config.v1" as const;

const BOOLEAN_KEYS = Object.freeze([
  "enableFieldForce"
] satisfies readonly (keyof DemoSimulationFieldForceConfig)[]);

const NUMBER_KEYS = Object.freeze([
  "fieldForceStrength",
  "fieldForceMaxForcePerAgent",
  "fieldForceMinActiveMagnitude"
] satisfies readonly (keyof DemoSimulationFieldForceConfig)[]);

export function loadStoredFieldForceConfig(): DemoSimulationFieldForceConfigPatch {
  try {
    const rawValue = localStorage.getItem(FIELD_FORCE_CONFIG_STORAGE_KEY);
    if (rawValue === null) return {};
    const parsed = JSON.parse(rawValue) as Record<string, unknown>;
    const patch: DemoSimulationFieldForceConfigPatch = {};

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

export function saveFieldForceConfig(config: DemoSimulationFieldForceConfig): void {
  try {
    localStorage.setItem(FIELD_FORCE_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // localStorage can be unavailable in restricted contexts.
  }
}

export function clearStoredFieldForceConfig(): void {
  try {
    localStorage.removeItem(FIELD_FORCE_CONFIG_STORAGE_KEY);
  } catch {
    // localStorage can be unavailable in restricted contexts.
  }
}

import type { DemoSimulationFieldDampingConfig, DemoSimulationFieldDampingConfigPatch } from "./demoSimulation";

export const FIELD_DAMPING_CONFIG_STORAGE_KEY = "qubok_evolve.field_damping_config.v1" as const;

const BOOLEAN_KEYS = Object.freeze([
  "enableObstacleFieldDamping",
  "enableTerrainFieldDamping"
] satisfies readonly (keyof DemoSimulationFieldDampingConfig)[]);

const NUMBER_KEYS = Object.freeze([
  "obstacleFieldDampingPerSecond",
  "terrainFieldDampingScalePerSecond",
  "fieldDampingMaxObstacleCells",
  "fieldDampingMaxTerrainCells"
] satisfies readonly (keyof DemoSimulationFieldDampingConfig)[]);

export function loadStoredFieldDampingConfig(): DemoSimulationFieldDampingConfigPatch {
  try {
    const rawValue = localStorage.getItem(FIELD_DAMPING_CONFIG_STORAGE_KEY);
    if (rawValue === null) return {};

    const parsed = JSON.parse(rawValue) as Record<string, unknown>;
    const patch: DemoSimulationFieldDampingConfigPatch = {};

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

export function saveFieldDampingConfig(config: DemoSimulationFieldDampingConfig): void {
  try {
    localStorage.setItem(FIELD_DAMPING_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // localStorage can be unavailable in restricted contexts.
  }
}

export function clearStoredFieldDampingConfig(): void {
  try {
    localStorage.removeItem(FIELD_DAMPING_CONFIG_STORAGE_KEY);
  } catch {
    // localStorage can be unavailable in restricted contexts.
  }
}

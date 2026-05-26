import { RENDER_DEBUG_CONFIG_STORAGE_KEY } from "../render/renderDebugConfigPersistence";
import { FIELD_DAMPING_CONFIG_STORAGE_KEY } from "../sim/fieldDampingConfigPersistence";

export const DEBUG_CONFIG_PRESET_VERSION = "qubok_evolve.debug_config_preset.v1" as const;

const LAYOUT_STATE_KEYS = Object.freeze([
  "qubok_evolve.perf_overlay_width"
]);

const LAYOUT_STATE_PREFIXES = Object.freeze([
  "qubok_evolve.control_panel_width.",
  "qubok_evolve.control_panel_collapsed.",
  "qubok_evolve.control_subsection_collapsed."
]);

export type DebugConfigPreset = {
  readonly version: typeof DEBUG_CONFIG_PRESET_VERSION;
  readonly exportedAt: string;
  readonly layout: Record<string, string>;
  readonly renderDebugConfig: string | null;
  readonly fieldDampingConfig: string | null;
};

export function makeDebugConfigPreset(): DebugConfigPreset {
  return {
    version: DEBUG_CONFIG_PRESET_VERSION,
    exportedAt: new Date().toISOString(),
    layout: collectLayoutState(),
    renderDebugConfig: readStoredValue(RENDER_DEBUG_CONFIG_STORAGE_KEY),
    fieldDampingConfig: readStoredValue(FIELD_DAMPING_CONFIG_STORAGE_KEY)
  };
}

export function serializeDebugConfigPreset(preset: DebugConfigPreset = makeDebugConfigPreset()): string {
  return JSON.stringify(preset, null, 2);
}

function collectLayoutState(): Record<string, string> {
  const result: Record<string, string> = {};

  for (const key of LAYOUT_STATE_KEYS) {
    const value = readStoredValue(key);
    if (value !== null) result[key] = value;
  }

  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key) continue;
      if (!LAYOUT_STATE_PREFIXES.some((prefix) => key.startsWith(prefix))) continue;
      const value = localStorage.getItem(key);
      if (value !== null) result[key] = value;
    }
  } catch {
    // localStorage can be unavailable in restricted contexts.
  }

  return result;
}

function readStoredValue(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

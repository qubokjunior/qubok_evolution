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

export type DebugConfigPresetImportResult = {
  readonly layoutKeyCount: number;
  readonly hasRenderDebugConfig: boolean;
  readonly hasFieldDampingConfig: boolean;
};

export type DebugConfigPresetValidation = {
  readonly state: "empty" | "valid" | "invalid";
  readonly message: string;
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

export function validateDebugConfigPresetText(presetText: string): DebugConfigPresetValidation {
  const trimmedText = presetText.trim();
  if (trimmedText.length <= 0) {
    return { state: "empty", message: "empty preset textarea" };
  }

  try {
    const parsed = JSON.parse(trimmedText) as unknown;
    if (!isPreset(parsed)) {
      return { state: "invalid", message: "invalid preset version or shape" };
    }

    return {
      state: "valid",
      message: `valid preset · layout ${Object.keys(parsed.layout).length} · render ${parsed.renderDebugConfig === null ? "no" : "yes"} · damping ${parsed.fieldDampingConfig === null ? "no" : "yes"}`
    };
  } catch {
    return { state: "invalid", message: "invalid JSON" };
  }
}

export function applyDebugConfigPresetText(presetText: string): DebugConfigPresetImportResult {
  const parsed = JSON.parse(presetText) as unknown;
  if (!isPreset(parsed)) {
    throw new Error("Invalid debug config preset.");
  }

  let layoutKeyCount = 0;
  for (const [key, value] of Object.entries(parsed.layout)) {
    if (!isAllowedLayoutKey(key)) continue;
    writeStoredValue(key, value);
    layoutKeyCount += 1;
  }

  const hasRenderDebugConfig = writeOptionalStoredJson(RENDER_DEBUG_CONFIG_STORAGE_KEY, parsed.renderDebugConfig);
  const hasFieldDampingConfig = writeOptionalStoredJson(FIELD_DAMPING_CONFIG_STORAGE_KEY, parsed.fieldDampingConfig);

  return {
    layoutKeyCount,
    hasRenderDebugConfig,
    hasFieldDampingConfig
  };
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
      if (!key || !isAllowedLayoutKey(key)) continue;
      const value = localStorage.getItem(key);
      if (value !== null) result[key] = value;
    }
  } catch {
    // localStorage can be unavailable in restricted contexts.
  }

  return result;
}

function isPreset(value: unknown): value is DebugConfigPreset {
  if (!isRecord(value)) return false;
  if (value.version !== DEBUG_CONFIG_PRESET_VERSION) return false;
  if (typeof value.exportedAt !== "string") return false;
  if (!isStringRecord(value.layout)) return false;
  if (value.renderDebugConfig !== null && typeof value.renderDebugConfig !== "string") return false;
  if (value.fieldDampingConfig !== null && typeof value.fieldDampingConfig !== "string") return false;
  return true;
}

function isAllowedLayoutKey(key: string): boolean {
  return LAYOUT_STATE_KEYS.includes(key) || LAYOUT_STATE_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function writeOptionalStoredJson(key: string, value: string | null): boolean {
  if (value === null) return false;
  JSON.parse(value);
  writeStoredValue(key, value);
  return true;
}

function readStoredValue(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStoredValue(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage can be unavailable in restricted contexts.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!isRecord(value)) return false;
  return Object.values(value).every((entry) => typeof entry === "string");
}

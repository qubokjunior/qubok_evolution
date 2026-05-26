import { DEFAULT_RENDER_DEBUG_CONFIG, makeRenderDebugConfig, type RenderDebugConfig, type RenderDebugConfigPatch } from "./renderDebugConfig";

export const RENDER_DEBUG_CONFIG_STORAGE_KEY = "qubok_evolve.render_debug_config.v1" as const;

const BOOLEAN_KEYS = Object.freeze([
  "showGrid",
  "showTerrainLayer",
  "showObstacleLayer",
  "showFieldVectorLayer",
  "showAgents",
  "showAgentFieldInfluenceLayer"
] satisfies readonly (keyof RenderDebugConfig)[]);

const NUMBER_KEYS = Object.freeze([
  "fieldVectorAlpha",
  "fieldVectorScale",
  "fieldVectorStride",
  "fieldVectorMinMagnitude",
  "agentFieldInfluenceAlpha",
  "agentFieldInfluenceScale",
  "agentFieldInfluenceMaxAgents",
  "agentFieldInfluenceMinMagnitude"
] satisfies readonly (keyof RenderDebugConfig)[]);

export function loadStoredRenderDebugConfig(): RenderDebugConfig {
  try {
    const rawValue = localStorage.getItem(RENDER_DEBUG_CONFIG_STORAGE_KEY);
    if (rawValue === null) return DEFAULT_RENDER_DEBUG_CONFIG;

    const parsed = JSON.parse(rawValue) as Record<string, unknown>;
    const patch: RenderDebugConfigPatch = {};

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

    return makeRenderDebugConfig({ ...DEFAULT_RENDER_DEBUG_CONFIG, ...patch });
  } catch {
    return DEFAULT_RENDER_DEBUG_CONFIG;
  }
}

export function saveRenderDebugConfig(config: RenderDebugConfig): void {
  try {
    localStorage.setItem(RENDER_DEBUG_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // localStorage can be unavailable in restricted contexts.
  }
}

export function clearStoredRenderDebugConfig(): void {
  try {
    localStorage.removeItem(RENDER_DEBUG_CONFIG_STORAGE_KEY);
  } catch {
    // localStorage can be unavailable in restricted contexts.
  }
}

export const RENDER_DEBUG_CONFIG_VERSION = "qubok_evolve.render_debug_config.m41" as const;

export type RenderDebugConfig = {
  readonly showGrid: boolean;
  readonly showTerrainLayer: boolean;
  readonly showObstacleLayer: boolean;
  readonly showFieldVectorLayer: boolean;
  readonly showAgents: boolean;
  readonly showAgentFieldInfluenceLayer: boolean;
  readonly fieldVectorAlpha: number;
  readonly fieldVectorScale: number;
  readonly fieldVectorStride: number;
  readonly fieldVectorMinMagnitude: number;
  readonly agentFieldInfluenceAlpha: number;
  readonly agentFieldInfluenceScale: number;
  readonly agentFieldInfluenceMaxAgents: number;
  readonly agentFieldInfluenceMinMagnitude: number;
};

export type RenderDebugConfigPatch = Partial<RenderDebugConfig>;

export const DEFAULT_RENDER_DEBUG_CONFIG: RenderDebugConfig = Object.freeze({
  showGrid: true,
  showTerrainLayer: true,
  showObstacleLayer: true,
  showFieldVectorLayer: true,
  showAgents: true,
  showAgentFieldInfluenceLayer: true,
  fieldVectorAlpha: 0.34,
  fieldVectorScale: 3.2,
  fieldVectorStride: 2,
  fieldVectorMinMagnitude: 0.05,
  agentFieldInfluenceAlpha: 0.72,
  agentFieldInfluenceScale: 4.5,
  agentFieldInfluenceMaxAgents: 512,
  agentFieldInfluenceMinMagnitude: 0.02
});

export function makeRenderDebugConfig(patch: RenderDebugConfigPatch = {}): RenderDebugConfig {
  return Object.freeze({
    showGrid: patch.showGrid ?? DEFAULT_RENDER_DEBUG_CONFIG.showGrid,
    showTerrainLayer: patch.showTerrainLayer ?? DEFAULT_RENDER_DEBUG_CONFIG.showTerrainLayer,
    showObstacleLayer: patch.showObstacleLayer ?? DEFAULT_RENDER_DEBUG_CONFIG.showObstacleLayer,
    showFieldVectorLayer: patch.showFieldVectorLayer ?? DEFAULT_RENDER_DEBUG_CONFIG.showFieldVectorLayer,
    showAgents: patch.showAgents ?? DEFAULT_RENDER_DEBUG_CONFIG.showAgents,
    showAgentFieldInfluenceLayer: patch.showAgentFieldInfluenceLayer ?? DEFAULT_RENDER_DEBUG_CONFIG.showAgentFieldInfluenceLayer,
    fieldVectorAlpha: clampNumber(patch.fieldVectorAlpha ?? DEFAULT_RENDER_DEBUG_CONFIG.fieldVectorAlpha, 0, 1),
    fieldVectorScale: clampNumber(patch.fieldVectorScale ?? DEFAULT_RENDER_DEBUG_CONFIG.fieldVectorScale, 0, 32),
    fieldVectorStride: Math.max(1, Math.min(64, Math.round(patch.fieldVectorStride ?? DEFAULT_RENDER_DEBUG_CONFIG.fieldVectorStride))),
    fieldVectorMinMagnitude: clampNumber(patch.fieldVectorMinMagnitude ?? DEFAULT_RENDER_DEBUG_CONFIG.fieldVectorMinMagnitude, 0, 64),
    agentFieldInfluenceAlpha: clampNumber(patch.agentFieldInfluenceAlpha ?? DEFAULT_RENDER_DEBUG_CONFIG.agentFieldInfluenceAlpha, 0, 1),
    agentFieldInfluenceScale: clampNumber(patch.agentFieldInfluenceScale ?? DEFAULT_RENDER_DEBUG_CONFIG.agentFieldInfluenceScale, 0, 64),
    agentFieldInfluenceMaxAgents: Math.max(0, Math.min(4096, Math.round(patch.agentFieldInfluenceMaxAgents ?? DEFAULT_RENDER_DEBUG_CONFIG.agentFieldInfluenceMaxAgents))),
    agentFieldInfluenceMinMagnitude: clampNumber(patch.agentFieldInfluenceMinMagnitude ?? DEFAULT_RENDER_DEBUG_CONFIG.agentFieldInfluenceMinMagnitude, 0, 64)
  });
}

export function toggleRenderDebugLayer(config: RenderDebugConfig, key: keyof Pick<RenderDebugConfig, "showGrid" | "showTerrainLayer" | "showObstacleLayer" | "showFieldVectorLayer" | "showAgents" | "showAgentFieldInfluenceLayer">): RenderDebugConfig {
  return makeRenderDebugConfig({ ...config, [key]: !config[key] });
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

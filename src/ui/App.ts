import { createDemoSimulation, type DemoSimulationFieldDampingConfig, type DemoSimulationHandle } from "../sim/demoSimulation";
import { createPerfOverlay } from "../render/debugOverlay";
import { mountPixiRenderer } from "../render/pixiRenderer";
import { createFieldDampingControlPanel } from "./fieldDampingPanel";
import { createFieldAdvectionControlPanel } from "./fieldAdvectionPanel";
import { createFieldForceControlPanel } from "./fieldForcePanel";
import { createFieldVisualDebugPanel } from "./fieldVisualDebugPanel";
import { createDebugLayoutPanel } from "./debugLayoutPanel";
import { createRenderLayersPanel } from "./renderLayersPanel";
import { createFieldVectorDebugPanel } from "./fieldVectorDebugPanel";
import { toggleRenderDebugLayer, type RenderDebugConfig } from "../render/renderDebugConfig";
import { loadStoredRenderDebugConfig, saveRenderDebugConfig } from "../render/renderDebugConfigPersistence";
import { loadStoredFieldDampingConfig, saveFieldDampingConfig } from "../sim/fieldDampingConfigPersistence";
import { loadStoredFieldAdvectionConfig, saveFieldAdvectionConfig } from "../sim/fieldAdvectionConfigPersistence";
import { loadStoredFieldForceConfig, saveFieldForceConfig } from "../sim/fieldForceConfigPersistence";

export type QubokEvolveAppHandle = {
  destroy: () => void;
};

type RenderDebugLayerKey = keyof Pick<RenderDebugConfig, "showGrid" | "showTerrainLayer" | "showObstacleLayer" | "showFieldVectorLayer" | "showAgents" | "showAgentFieldInfluenceLayer">;

type FieldDampingControlAction = "toggleObstacle" | "toggleTerrain" | "obstacleDown" | "obstacleUp" | "terrainDown" | "terrainUp";

const RENDER_DEBUG_LAYER_KEYS: Record<string, RenderDebugLayerKey> = Object.freeze({
  "1": "showGrid",
  "2": "showTerrainLayer",
  "3": "showFieldVectorLayer",
  "4": "showObstacleLayer",
  "5": "showAgents",
  "8": "showAgentFieldInfluenceLayer"
});

const FIELD_DAMPING_CONTROL_KEYS: Record<string, FieldDampingControlAction> = Object.freeze({
  "6": "toggleObstacle",
  "7": "toggleTerrain",
  "[": "obstacleDown",
  "]": "obstacleUp",
  ";": "terrainDown",
  "'": "terrainUp"
});

export async function mountQubokEvolveApp(root: HTMLElement): Promise<QubokEvolveAppHandle> {
  root.replaceChildren();

  const initialFieldDampingConfig = loadStoredFieldDampingConfig();
  const initialFieldAdvectionConfig = loadStoredFieldAdvectionConfig();
  const initialFieldForceConfig = loadStoredFieldForceConfig();

  const shell = document.createElement("div");
  shell.className = "qubok_evolve-shell";

  const canvasHost = document.createElement("div");
  canvasHost.className = "qubok_evolve-canvas-host";

  const overlayHost = document.createElement("div");
  overlayHost.className = "qubok_evolve-overlay-host";

  const controlStack = document.createElement("div");
  controlStack.className = "qubok_evolve-control-stack";

  shell.append(canvasHost, overlayHost, controlStack);
  root.append(shell);

  const simulation = createDemoSimulation({
    seed: "qubok_evolve:demo:m16",
    capacity: 1536,
    worldWidth: 2048,
    worldHeight: 2048,
    ...initialFieldDampingConfig,
    ...initialFieldAdvectionConfig,
    ...initialFieldForceConfig
  });

  const fieldDampingPanel = createFieldDampingControlPanel(controlStack, simulation, { onConfigChange: saveFieldDampingConfig });
  const fieldAdvectionPanel = createFieldAdvectionControlPanel(controlStack, simulation, { onConfigChange: saveFieldAdvectionConfig });
  const fieldForcePanel = createFieldForceControlPanel(controlStack, simulation, { onConfigChange: saveFieldForceConfig });

  const perfOverlay = createPerfOverlay(overlayHost);
  const initialRenderDebugConfig = loadStoredRenderDebugConfig();
  const pixiRenderer = await mountPixiRenderer({
    host: canvasHost,
    perfOverlay,
    renderDebugConfig: initialRenderDebugConfig,
    snapshotSource: (deltaSeconds) => simulation.step(deltaSeconds),
    onRenderDebugConfigChange: saveRenderDebugConfig
  });

  const renderLayersPanel = createRenderLayersPanel(controlStack, pixiRenderer);
  const fieldVectorDebugPanel = createFieldVectorDebugPanel(controlStack, pixiRenderer);
  const fieldVisualDebugPanel = createFieldVisualDebugPanel(controlStack, pixiRenderer);
  const debugLayoutPanel = createDebugLayoutPanel(controlStack);

  const handleRenderDebugShortcut = (event: KeyboardEvent): void => {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || isTextInputEvent(event)) {
      return;
    }

    const dampingAction = FIELD_DAMPING_CONTROL_KEYS[event.key];
    if (dampingAction) {
      event.preventDefault();
      saveFieldDampingConfig(applyFieldDampingControlShortcut(simulation, dampingAction));
      return;
    }

    const layerKey = RENDER_DEBUG_LAYER_KEYS[event.key];
    if (!layerKey) return;

    event.preventDefault();
    const nextConfig = toggleRenderDebugLayer(pixiRenderer.getRenderDebugConfig(), layerKey);
    pixiRenderer.updateRenderDebugConfig(nextConfig);
    window.dispatchEvent(new CustomEvent("qubok-render-debug-config-change"));
  };

  window.addEventListener("keydown", handleRenderDebugShortcut);

  return {
    destroy: () => {
      window.removeEventListener("keydown", handleRenderDebugShortcut);
      pixiRenderer.destroy();
      perfOverlay.destroy();
      fieldDampingPanel.destroy();
      fieldAdvectionPanel.destroy();
      fieldForcePanel.destroy();
      renderLayersPanel.destroy();
      fieldVectorDebugPanel.destroy();
      fieldVisualDebugPanel.destroy();
      debugLayoutPanel.destroy();
      root.replaceChildren();
    }
  };
}

function applyFieldDampingControlShortcut(simulation: DemoSimulationHandle, action: FieldDampingControlAction): DemoSimulationFieldDampingConfig {
  const config = simulation.getFieldDampingConfig();

  switch (action) {
    case "toggleObstacle":
      return simulation.updateFieldDampingConfig({ enableObstacleFieldDamping: !config.enableObstacleFieldDamping });
    case "toggleTerrain":
      return simulation.updateFieldDampingConfig({ enableTerrainFieldDamping: !config.enableTerrainFieldDamping });
    case "obstacleDown":
      return simulation.updateFieldDampingConfig({ obstacleFieldDampingPerSecond: scaleControl(config.obstacleFieldDampingPerSecond, 0.8) });
    case "obstacleUp":
      return simulation.updateFieldDampingConfig({ obstacleFieldDampingPerSecond: scaleControl(config.obstacleFieldDampingPerSecond, 1.25) });
    case "terrainDown":
      return simulation.updateFieldDampingConfig({ terrainFieldDampingScalePerSecond: scaleControl(config.terrainFieldDampingScalePerSecond, 0.8) });
    case "terrainUp":
      return simulation.updateFieldDampingConfig({ terrainFieldDampingScalePerSecond: scaleControl(config.terrainFieldDampingScalePerSecond, 1.25) });
  }
}

function scaleControl(value: number, multiplier: number): number {
  return Math.max(0, Math.min(16, value * multiplier));
}

function isTextInputEvent(event: KeyboardEvent): boolean {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select";
}

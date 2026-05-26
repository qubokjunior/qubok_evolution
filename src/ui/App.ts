import { createDemoSimulation } from "../sim/demoSimulation";
import { createPerfOverlay } from "../render/debugOverlay";
import { mountPixiRenderer } from "../render/pixiRenderer";
import { DEFAULT_RENDER_DEBUG_CONFIG, toggleRenderDebugLayer, type RenderDebugConfig } from "../render/renderDebugConfig";

export type QubokEvolveAppHandle = {
  destroy: () => void;
};

type RenderDebugLayerKey = keyof Pick<RenderDebugConfig, "showGrid" | "showTerrainLayer" | "showObstacleLayer" | "showFieldVectorLayer" | "showAgents">;

const RENDER_DEBUG_LAYER_KEYS: Record<string, RenderDebugLayerKey> = Object.freeze({
  "1": "showGrid",
  "2": "showTerrainLayer",
  "3": "showFieldVectorLayer",
  "4": "showObstacleLayer",
  "5": "showAgents"
});

export async function mountQubokEvolveApp(root: HTMLElement): Promise<QubokEvolveAppHandle> {
  root.replaceChildren();

  const shell = document.createElement("div");
  shell.className = "qubok_evolve-shell";

  const canvasHost = document.createElement("div");
  canvasHost.className = "qubok_evolve-canvas-host";

  const overlayHost = document.createElement("div");
  overlayHost.className = "qubok_evolve-overlay-host";

  shell.append(canvasHost, overlayHost);
  root.append(shell);

  const simulation = createDemoSimulation({
    seed: "qubok_evolve:demo:m16",
    capacity: 1536,
    worldWidth: 2048,
    worldHeight: 2048
  });

  const perfOverlay = createPerfOverlay(overlayHost);
  const pixiRenderer = await mountPixiRenderer({
    host: canvasHost,
    perfOverlay,
    renderDebugConfig: DEFAULT_RENDER_DEBUG_CONFIG,
    snapshotSource: (deltaSeconds) => simulation.step(deltaSeconds)
  });

  const handleRenderDebugShortcut = (event: KeyboardEvent): void => {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || isTextInputEvent(event)) {
      return;
    }
    const layerKey = RENDER_DEBUG_LAYER_KEYS[event.key];
    if (!layerKey) return;
    event.preventDefault();
    const nextConfig = toggleRenderDebugLayer(pixiRenderer.getRenderDebugConfig(), layerKey);
    pixiRenderer.updateRenderDebugConfig(nextConfig);
  };

  window.addEventListener("keydown", handleRenderDebugShortcut);

  return {
    destroy: () => {
      window.removeEventListener("keydown", handleRenderDebugShortcut);
      pixiRenderer.destroy();
      perfOverlay.destroy();
      root.replaceChildren();
    }
  };
}

function isTextInputEvent(event: KeyboardEvent): boolean {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select";
}

import { createDemoSimulation } from "../sim/demoSimulation";
import { createPerfOverlay } from "../render/debugOverlay";
import { mountPixiRenderer } from "../render/pixiRenderer";
import { DEFAULT_RENDER_DEBUG_CONFIG } from "../render/renderDebugConfig";

export type QubokEvolveAppHandle = {
  destroy: () => void;
};

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

  return {
    destroy: () => {
      pixiRenderer.destroy();
      perfOverlay.destroy();
      root.replaceChildren();
    }
  };
}

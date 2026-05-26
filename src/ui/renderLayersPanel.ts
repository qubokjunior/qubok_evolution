import type { PixiRendererHandle } from "../render/pixiRenderer";
import type { RenderDebugConfig, RenderDebugConfigPatch } from "../render/renderDebugConfig";
import { createBooleanControl, createCollapsibleControlPanel, createControlFooter, createControlSubsection } from "./controlPanelPrimitives";

export type RenderLayersPanelHandle = {
  readonly destroy: () => void;
};

type RenderLayerKey = "showGrid" | "showTerrainLayer" | "showObstacleLayer" | "showFieldVectorLayer" | "showAgents" | "showAgentFieldInfluenceLayer";

const RENDER_LAYER_CONTROLS: readonly { readonly key: RenderLayerKey; readonly label: string; readonly shortcut: string }[] = Object.freeze([
  { key: "showGrid", label: "grid", shortcut: "1" },
  { key: "showTerrainLayer", label: "terrain", shortcut: "2" },
  { key: "showFieldVectorLayer", label: "field vectors", shortcut: "3" },
  { key: "showObstacleLayer", label: "obstacles", shortcut: "4" },
  { key: "showAgents", label: "agents", shortcut: "5" },
  { key: "showAgentFieldInfluenceLayer", label: "agent field influence", shortcut: "8" }
]);

export function createRenderLayersPanel(host: HTMLElement, renderer: PixiRendererHandle): RenderLayersPanelHandle {
  const initialConfig = renderer.getRenderDebugConfig();
  const panel = createCollapsibleControlPanel({
    host,
    ariaLabel: "render layer controls",
    title: "render layers",
    hint: "visibility toggles"
  });

  const controls = RENDER_LAYER_CONTROLS.map((spec) => createBooleanControl<RenderDebugConfig>({
    label: `${spec.shortcut} · ${spec.label}`,
    getValue: (config) => config[spec.key],
    setValue: (value) => {
      renderer.updateRenderDebugConfig({ [spec.key]: value } as RenderDebugConfigPatch);
      sync();
      window.dispatchEvent(new CustomEvent("qubok-render-debug-config-change"));
    }
  }));

  const footer = createControlFooter({
    infoText: "keyboard 1–5, 8",
    onReset: () => {
      renderer.updateRenderDebugConfig({
        showGrid: initialConfig.showGrid,
        showTerrainLayer: initialConfig.showTerrainLayer,
        showObstacleLayer: initialConfig.showObstacleLayer,
        showFieldVectorLayer: initialConfig.showFieldVectorLayer,
        showAgents: initialConfig.showAgents,
        showAgentFieldInfluenceLayer: initialConfig.showAgentFieldInfluenceLayer
      });
      sync();
      window.dispatchEvent(new CustomEvent("qubok-render-debug-config-change"));
    }
  });

  panel.body.append(
    createControlSubsection("visibility", ...controls.map((control) => control.row)),
    footer
  );

  const sync = (): void => {
    const config = renderer.getRenderDebugConfig();
    for (const control of controls) control.sync(config);
  };

  const handleExternalConfigChange = (): void => sync();
  window.addEventListener("qubok-render-debug-config-change", handleExternalConfigChange);
  sync();

  return {
    destroy: () => {
      window.removeEventListener("qubok-render-debug-config-change", handleExternalConfigChange);
      panel.destroy();
    }
  };
}

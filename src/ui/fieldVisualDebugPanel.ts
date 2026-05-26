import type { PixiRendererHandle } from "../render/pixiRenderer";
import type { RenderDebugConfig, RenderDebugConfigPatch } from "../render/renderDebugConfig";
import { createBooleanControl, createCollapsibleControlPanel, createControlFooter, createControlSubsection, createNumericControl, type NumericControlSpec } from "./controlPanelPrimitives";

export type FieldVisualDebugPanelHandle = {
  readonly destroy: () => void;
};

type NumericDebugKey = "agentFieldInfluenceAlpha" | "agentFieldInfluenceScale" | "agentFieldInfluenceMaxAgents" | "agentFieldInfluenceMinMagnitude";

const NUMERIC_DEBUG_CONTROLS: readonly NumericControlSpec<NumericDebugKey>[] = Object.freeze([
  { key: "agentFieldInfluenceAlpha", label: "alpha", valueKind: "float", sliderMin: 0, sliderMax: 1, inputMin: 0, inputMax: 1, step: 0.01 },
  { key: "agentFieldInfluenceScale", label: "length scale", valueKind: "float", sliderMin: 0, sliderMax: 16, inputMin: 0, inputMax: 64, step: 0.1 },
  { key: "agentFieldInfluenceMaxAgents", label: "max agents", valueKind: "integer", sliderMin: 0, sliderMax: 2048, inputMin: 0, inputMax: 4096, step: 1 },
  { key: "agentFieldInfluenceMinMagnitude", label: "min magnitude", valueKind: "float", sliderMin: 0, sliderMax: 4, inputMin: 0, inputMax: 64, step: 0.01 }
]);

export function createFieldVisualDebugPanel(host: HTMLElement, renderer: PixiRendererHandle): FieldVisualDebugPanelHandle {
  const initialConfig = renderer.getRenderDebugConfig();
  const panel = createCollapsibleControlPanel({
    host,
    className: "qubok_evolve-control-panel qubok_evolve-control-panel--visual-debug",
    ariaLabel: "agent field visual debug controls",
    title: "agent field debug",
    hint: "entity influence vectors"
  });

  const enabledToggle = createBooleanControl<RenderDebugConfig>({
    label: "show influence",
    getValue: (config) => config.showAgentFieldInfluenceLayer,
    setValue: (value) => renderer.updateRenderDebugConfig({ showAgentFieldInfluenceLayer: value })
  });

  const numericControls = NUMERIC_DEBUG_CONTROLS.map((spec) => createNumericControl<RenderDebugConfig, NumericDebugKey>(spec, {
    getValue: (config) => config[spec.key],
    setValue: (value) => {
      renderer.updateRenderDebugConfig({ [spec.key]: value } as RenderDebugConfigPatch);
      sync();
    }
  }));

  const footer = createControlFooter({
    infoText: "separate from field vectors",
    onReset: () => {
      renderer.updateRenderDebugConfig({
        showAgentFieldInfluenceLayer: initialConfig.showAgentFieldInfluenceLayer,
        agentFieldInfluenceAlpha: initialConfig.agentFieldInfluenceAlpha,
        agentFieldInfluenceScale: initialConfig.agentFieldInfluenceScale,
        agentFieldInfluenceMaxAgents: initialConfig.agentFieldInfluenceMaxAgents,
        agentFieldInfluenceMinMagnitude: initialConfig.agentFieldInfluenceMinMagnitude
      });
      sync();
    }
  });

  const visualShapeControls = numericControls.slice(0, 2);
  const samplingControls = numericControls.slice(2);

  panel.body.append(
    createControlSubsection("visibility", enabledToggle.row),
    createControlSubsection("visual shape", ...visualShapeControls.map((control) => control.row)),
    createControlSubsection("sampling", ...samplingControls.map((control) => control.row)),
    footer
  );

  const sync = (): void => {
    const config = renderer.getRenderDebugConfig();
    enabledToggle.sync(config);
    for (const control of numericControls) control.sync(config);
  };

  sync();

  return {
    destroy: panel.destroy
  };
}

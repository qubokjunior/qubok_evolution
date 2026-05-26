import type { PixiRendererHandle } from "../render/pixiRenderer";
import type { RenderDebugConfig, RenderDebugConfigPatch } from "../render/renderDebugConfig";
import { createCollapsibleControlPanel, createControlFooter, createControlSubsection, createNumericControl, type NumericControlSpec } from "./controlPanelPrimitives";

export type FieldVectorDebugPanelHandle = {
  readonly destroy: () => void;
};

type FieldVectorDebugKey = "fieldVectorAlpha" | "fieldVectorScale" | "fieldVectorStride" | "fieldVectorMinMagnitude";

const FIELD_VECTOR_CONTROLS: readonly NumericControlSpec<FieldVectorDebugKey>[] = Object.freeze([
  { key: "fieldVectorAlpha", label: "alpha", valueKind: "float", sliderMin: 0, sliderMax: 1, inputMin: 0, inputMax: 1, step: 0.01 },
  { key: "fieldVectorScale", label: "length scale", valueKind: "float", sliderMin: 0, sliderMax: 12, inputMin: 0, inputMax: 32, step: 0.1 },
  { key: "fieldVectorStride", label: "stride", valueKind: "integer", sliderMin: 1, sliderMax: 16, inputMin: 1, inputMax: 64, step: 1 },
  { key: "fieldVectorMinMagnitude", label: "min magnitude", valueKind: "float", sliderMin: 0, sliderMax: 4, inputMin: 0, inputMax: 64, step: 0.01 }
]);

export function createFieldVectorDebugPanel(host: HTMLElement, renderer: PixiRendererHandle): FieldVectorDebugPanelHandle {
  const initialConfig = renderer.getRenderDebugConfig();
  const panel = createCollapsibleControlPanel({
    host,
    ariaLabel: "field vector debug controls",
    title: "field vectors",
    hint: "vector render parameters"
  });

  const numericControls = FIELD_VECTOR_CONTROLS.map((spec) => createNumericControl<RenderDebugConfig, FieldVectorDebugKey>(spec, {
    getValue: (config) => config[spec.key],
    setValue: (value) => {
      renderer.updateRenderDebugConfig({ [spec.key]: value } as RenderDebugConfigPatch);
      sync();
      window.dispatchEvent(new CustomEvent("qubok-render-debug-config-change"));
    }
  }));

  const footer = createControlFooter({
    infoText: "layer toggle: 3",
    onReset: () => {
      renderer.updateRenderDebugConfig({
        fieldVectorAlpha: initialConfig.fieldVectorAlpha,
        fieldVectorScale: initialConfig.fieldVectorScale,
        fieldVectorStride: initialConfig.fieldVectorStride,
        fieldVectorMinMagnitude: initialConfig.fieldVectorMinMagnitude
      });
      sync();
      window.dispatchEvent(new CustomEvent("qubok-render-debug-config-change"));
    }
  });

  panel.body.append(
    createControlSubsection("render shape", ...numericControls.slice(0, 2).map((control) => control.row)),
    createControlSubsection("sampling", ...numericControls.slice(2).map((control) => control.row)),
    footer
  );

  const sync = (): void => {
    const config = renderer.getRenderDebugConfig();
    for (const control of numericControls) control.sync(config);
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

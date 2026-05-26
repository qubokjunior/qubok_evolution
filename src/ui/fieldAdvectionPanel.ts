import type { DemoSimulationFieldAdvectionConfig, DemoSimulationFieldAdvectionConfigPatch, DemoSimulationHandle } from "../sim/demoSimulation";
import { createBooleanControl, createCollapsibleControlPanel, createControlFooter, createControlSubsection, createNumericControl, type NumericControlSpec } from "./controlPanelPrimitives";

export type FieldAdvectionControlPanelHandle = {
  readonly destroy: () => void;
};

export type FieldAdvectionControlPanelOptions = {
  readonly onConfigChange?: (config: DemoSimulationFieldAdvectionConfig) => void;
};

type NumericConfigKey = "fieldAdvectionStrength" | "fieldAdvectionSubsteps" | "fieldAdvectionMinActiveMagnitude";

const NUMERIC_CONTROLS: readonly NumericControlSpec<NumericConfigKey>[] = Object.freeze([
  { key: "fieldAdvectionStrength", label: "strength", valueKind: "float", sliderMin: 0, sliderMax: 4, inputMin: 0, inputMax: 16, step: 0.01 },
  { key: "fieldAdvectionSubsteps", label: "substeps", valueKind: "integer", sliderMin: 1, sliderMax: 8, inputMin: 1, inputMax: 16, step: 1 },
  { key: "fieldAdvectionMinActiveMagnitude", label: "min active", valueKind: "float", sliderMin: 0, sliderMax: 0.01, inputMin: 0, inputMax: 1000000, step: 0.0001 }
]);

export function createFieldAdvectionControlPanel(host: HTMLElement, simulation: DemoSimulationHandle, options: FieldAdvectionControlPanelOptions = {}): FieldAdvectionControlPanelHandle {
  const initialConfig = simulation.getFieldAdvectionConfig();
  const panel = createCollapsibleControlPanel({
    host,
    ariaLabel: "field advection controls",
    title: "field advection",
    hint: "transport pass"
  });

  const enabledToggle = createBooleanControl<DemoSimulationFieldAdvectionConfig>({
    label: "enable advection",
    getValue: (config) => config.enableFieldAdvection,
    setValue: (value) => {
      options.onConfigChange?.(simulation.updateFieldAdvectionConfig({ enableFieldAdvection: value }));
      sync();
    },
    changeEventName: "qubok-field-advection-control-change"
  });

  const numericControls = NUMERIC_CONTROLS.map((spec) => createNumericControl<DemoSimulationFieldAdvectionConfig, NumericConfigKey>(spec, {
    getValue: (config) => config[spec.key],
    setValue: (value) => {
      options.onConfigChange?.(simulation.updateFieldAdvectionConfig({ [spec.key]: value } as DemoSimulationFieldAdvectionConfigPatch));
      sync();
    }
  }));

  const footer = createControlFooter({
    infoText: "demo transport only",
    onReset: () => {
      options.onConfigChange?.(simulation.updateFieldAdvectionConfig(initialConfig));
      sync();
    }
  });

  panel.body.append(
    createControlSubsection("toggle", enabledToggle.row),
    createControlSubsection("transport", ...numericControls.map((control) => control.row)),
    footer
  );

  const sync = (): void => {
    const config = simulation.getFieldAdvectionConfig();
    enabledToggle.sync(config);
    for (const control of numericControls) control.sync(config);
  };

  sync();

  return {
    destroy: panel.destroy
  };
}

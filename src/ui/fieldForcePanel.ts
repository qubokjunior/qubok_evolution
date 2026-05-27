import type { DemoSimulationFieldForceConfig, DemoSimulationFieldForceConfigPatch, DemoSimulationHandle } from "../sim/demoSimulation";
import { createBooleanControl, createCollapsibleControlPanel, createControlFooter, createControlSubsection, createNumericControl, type NumericControlSpec } from "./controlPanelPrimitives";

export type FieldForceControlPanelHandle = {
  readonly destroy: () => void;
};

export type FieldForceControlPanelOptions = {
  readonly onConfigChange?: (config: DemoSimulationFieldForceConfig) => void;
};

type NumericConfigKey = "fieldForceStrength" | "fieldForceMaxForcePerAgent" | "fieldForceMinActiveMagnitude";

const NUMERIC_CONTROLS: readonly NumericControlSpec<NumericConfigKey>[] = Object.freeze([
  { key: "fieldForceStrength", label: "strength", valueKind: "float", sliderMin: 0, sliderMax: 4, inputMin: 0, inputMax: 16, step: 0.01 },
  { key: "fieldForceMaxForcePerAgent", label: "max force", valueKind: "float", sliderMin: 0, sliderMax: 800, inputMin: 0, inputMax: 10000, step: 1 },
  { key: "fieldForceMinActiveMagnitude", label: "min active", valueKind: "float", sliderMin: 0, sliderMax: 0.01, inputMin: 0, inputMax: 1000000, step: 0.0001 }
]);

export function createFieldForceControlPanel(host: HTMLElement, simulation: DemoSimulationHandle, options: FieldForceControlPanelOptions = {}): FieldForceControlPanelHandle {
  const initialConfig = simulation.getFieldForceConfig();
  const panel = createCollapsibleControlPanel({
    host,
    ariaLabel: "field force controls",
    title: "field force",
    hint: "agent response",
    defaultCollapsed: true
  });

  const enabledToggle = createBooleanControl<DemoSimulationFieldForceConfig>({
    label: "enable force",
    getValue: (config) => config.enableFieldForce,
    setValue: (value) => {
      options.onConfigChange?.(simulation.updateFieldForceConfig({ enableFieldForce: value }));
      sync();
    },
    changeEventName: "qubok-field-force-control-change"
  });

  const numericControls = NUMERIC_CONTROLS.map((spec) => createNumericControl<DemoSimulationFieldForceConfig, NumericConfigKey>(spec, {
    getValue: (config) => config[spec.key],
    setValue: (value) => {
      options.onConfigChange?.(simulation.updateFieldForceConfig({ [spec.key]: value } as DemoSimulationFieldForceConfigPatch));
      sync();
    }
  }));

  const footer = createControlFooter({
    infoText: "disabled by default",
    onReset: () => {
      options.onConfigChange?.(simulation.updateFieldForceConfig(initialConfig));
      sync();
    }
  });

  panel.body.append(
    createControlSubsection("toggle", enabledToggle.row),
    createControlSubsection("force", ...numericControls.map((control) => control.row)),
    footer
  );

  const sync = (): void => {
    const config = simulation.getFieldForceConfig();
    enabledToggle.sync(config);
    for (const control of numericControls) control.sync(config);
  };

  sync();

  return {
    destroy: panel.destroy
  };
}

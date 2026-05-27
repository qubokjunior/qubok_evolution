import type { DemoSimulationControllerConfig, DemoSimulationControllerConfigPatch, DemoSimulationHandle } from "../sim/demoSimulation";
import { createBooleanControl, createCollapsibleControlPanel, createControlFooter, createControlSubsection, createNumericControl, type NumericControlSpec } from "./controlPanelPrimitives";

export type ControllerControlPanelHandle = {
  readonly destroy: () => void;
};

export type ControllerControlPanelOptions = {
  readonly onConfigChange?: (config: DemoSimulationControllerConfig) => void;
};

type NumericConfigKey = "controllerStrength" | "controllerMaxIntentPerAgent" | "controllerFoodWeight" | "controllerThreatWeight" | "controllerFlowWeight";

const NUMERIC_CONTROLS: readonly NumericControlSpec<NumericConfigKey>[] = Object.freeze([
  { key: "controllerStrength", label: "strength", valueKind: "float", sliderMin: 0, sliderMax: 4, inputMin: 0, inputMax: 16, step: 0.01 },
  { key: "controllerMaxIntentPerAgent", label: "max intent", valueKind: "float", sliderMin: 0, sliderMax: 8, inputMin: 0, inputMax: 10000, step: 0.01 },
  { key: "controllerFoodWeight", label: "food weight", valueKind: "float", sliderMin: -4, sliderMax: 4, inputMin: -16, inputMax: 16, step: 0.01 },
  { key: "controllerThreatWeight", label: "threat weight", valueKind: "float", sliderMin: -4, sliderMax: 4, inputMin: -16, inputMax: 16, step: 0.01 },
  { key: "controllerFlowWeight", label: "flow weight", valueKind: "float", sliderMin: -4, sliderMax: 4, inputMin: -16, inputMax: 16, step: 0.01 }
]);

export function createControllerControlPanel(host: HTMLElement, simulation: DemoSimulationHandle, options: ControllerControlPanelOptions = {}): ControllerControlPanelHandle {
  const initialConfig = simulation.getControllerConfig();
  const panel = createCollapsibleControlPanel({
    host,
    ariaLabel: "controller controls",
    title: "controller",
    hint: "intent only",
    defaultCollapsed: true
  });

  const enabledToggle = createBooleanControl<DemoSimulationControllerConfig>({
    label: "enable controller",
    getValue: (config) => config.enableController,
    setValue: (value) => {
      options.onConfigChange?.(simulation.updateControllerConfig({ enableController: value }));
      sync();
    },
    changeEventName: "qubok-controller-control-change"
  });

  const numericControls = NUMERIC_CONTROLS.map((spec) => createNumericControl<DemoSimulationControllerConfig, NumericConfigKey>(spec, {
    getValue: (config) => config[spec.key],
    setValue: (value) => {
      options.onConfigChange?.(simulation.updateControllerConfig({ [spec.key]: value } as DemoSimulationControllerConfigPatch));
      sync();
    }
  }));

  const footer = createControlFooter({
    infoText: "disabled by default; intent readout only",
    onReset: () => {
      options.onConfigChange?.(simulation.updateControllerConfig(initialConfig));
      sync();
    }
  });

  panel.body.append(
    createControlSubsection("toggle", enabledToggle.row),
    createControlSubsection("intent", ...numericControls.map((control) => control.row)),
    footer
  );

  const sync = (): void => {
    const config = simulation.getControllerConfig();
    enabledToggle.sync(config);
    for (const control of numericControls) control.sync(config);
  };

  sync();

  return {
    destroy: panel.destroy
  };
}

import type { DemoSimulationControllerActuatorConfig, DemoSimulationControllerActuatorConfigPatch, DemoSimulationHandle } from "../sim/demoSimulation";
import { createBooleanControl, createCollapsibleControlPanel, createControlFooter, createControlSubsection, createNumericControl, type NumericControlSpec } from "./controlPanelPrimitives";

export type ControllerActuatorControlPanelHandle = {
  readonly destroy: () => void;
};

export type ControllerActuatorControlPanelOptions = {
  readonly onConfigChange?: (config: DemoSimulationControllerActuatorConfig) => void;
};

type NumericConfigKey = "controllerForceScale" | "controllerMaxForce" | "controllerMinActiveIntentMagnitude";

const NUMERIC_CONTROLS: readonly NumericControlSpec<NumericConfigKey>[] = Object.freeze([
  { key: "controllerForceScale", label: "force scale", valueKind: "float", sliderMin: 0, sliderMax: 4, inputMin: 0, inputMax: 16, step: 0.01 },
  { key: "controllerMaxForce", label: "max force", valueKind: "float", sliderMin: 0, sliderMax: 8, inputMin: 0, inputMax: 10000, step: 0.01 },
  { key: "controllerMinActiveIntentMagnitude", label: "min intent", valueKind: "float", sliderMin: 0, sliderMax: 1, inputMin: 0, inputMax: 10000, step: 0.0001 }
]);

export function createControllerActuatorControlPanel(host: HTMLElement, simulation: DemoSimulationHandle, options: ControllerActuatorControlPanelOptions = {}): ControllerActuatorControlPanelHandle {
  const initialConfig = simulation.getControllerActuatorConfig();
  const panel = createCollapsibleControlPanel({
    host,
    ariaLabel: "controller actuator controls",
    title: "controller actuator",
    hint: "intent to force; disabled by default",
    defaultCollapsed: true
  });

  const enabledToggle = createBooleanControl<DemoSimulationControllerActuatorConfig>({
    label: "enable movement influence",
    getValue: (config) => config.enableControllerMovementInfluence,
    setValue: (value) => {
      options.onConfigChange?.(simulation.updateControllerActuatorConfig({ enableControllerMovementInfluence: value }));
      sync();
    },
    changeEventName: "qubok-controller-actuator-control-change"
  });

  const numericControls = NUMERIC_CONTROLS.map((spec) => createNumericControl<DemoSimulationControllerActuatorConfig, NumericConfigKey>(spec, {
    getValue: (config) => config[spec.key],
    setValue: (value) => {
      options.onConfigChange?.(simulation.updateControllerActuatorConfig({ [spec.key]: value } as DemoSimulationControllerActuatorConfigPatch));
      sync();
    }
  }));

  const footer = createControlFooter({
    infoText: "explicit actuator bridge; disabled by default",
    onReset: () => {
      options.onConfigChange?.(simulation.updateControllerActuatorConfig(initialConfig));
      sync();
    }
  });

  panel.body.append(
    createControlSubsection("toggle", enabledToggle.row),
    createControlSubsection("actuator", ...numericControls.map((control) => control.row)),
    footer
  );

  const sync = (): void => {
    const config = simulation.getControllerActuatorConfig();
    enabledToggle.sync(config);
    for (const control of numericControls) control.sync(config);
  };

  sync();

  return {
    destroy: panel.destroy
  };
}

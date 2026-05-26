import type { DemoSimulationFieldDampingConfig, DemoSimulationFieldDampingConfigPatch, DemoSimulationHandle } from "../sim/demoSimulation";
import { createBooleanControl, createCollapsibleControlPanel, createControlFooter, createControlSection, createNumericControl, type NumericControlSpec } from "./controlPanelPrimitives";

export type FieldDampingControlPanelHandle = {
  readonly destroy: () => void;
};

type NumericConfigKey = "obstacleFieldDampingPerSecond" | "terrainFieldDampingScalePerSecond" | "fieldDampingMaxObstacleCells" | "fieldDampingMaxTerrainCells";

const NUMERIC_CONTROLS: readonly NumericControlSpec<NumericConfigKey>[] = Object.freeze([
  { key: "obstacleFieldDampingPerSecond", label: "obstacle/sec", valueKind: "float", sliderMin: 0, sliderMax: 4, inputMin: 0, inputMax: 16, step: 0.01 },
  { key: "terrainFieldDampingScalePerSecond", label: "terrain/sec", valueKind: "float", sliderMin: 0, sliderMax: 4, inputMin: 0, inputMax: 16, step: 0.01 },
  { key: "fieldDampingMaxObstacleCells", label: "max obstacle cells", valueKind: "integer", sliderMin: 0, sliderMax: 4096, inputMin: 0, inputMax: 1000000, step: 1 },
  { key: "fieldDampingMaxTerrainCells", label: "max terrain cells", valueKind: "integer", sliderMin: 0, sliderMax: 4096, inputMin: 0, inputMax: 1000000, step: 1 }
]);

export function createFieldDampingControlPanel(host: HTMLElement, simulation: DemoSimulationHandle): FieldDampingControlPanelHandle {
  const initialConfig = simulation.getFieldDampingConfig();
  const panel = createCollapsibleControlPanel({
    host,
    ariaLabel: "field damping controls",
    title: "field damping",
    hint: "sliders + exact values"
  });

  const obstacleToggle = createBooleanControl<DemoSimulationFieldDampingConfig>({
    label: "obstacle damping",
    getValue: (config) => config.enableObstacleFieldDamping,
    setValue: (value) => simulation.updateFieldDampingConfig({ enableObstacleFieldDamping: value }),
    changeEventName: "qubok-field-damping-control-change"
  });

  const terrainToggle = createBooleanControl<DemoSimulationFieldDampingConfig>({
    label: "terrain damping",
    getValue: (config) => config.enableTerrainFieldDamping,
    setValue: (value) => simulation.updateFieldDampingConfig({ enableTerrainFieldDamping: value }),
    changeEventName: "qubok-field-damping-control-change"
  });

  const numericControls = NUMERIC_CONTROLS.map((spec) => createNumericControl<DemoSimulationFieldDampingConfig, NumericConfigKey>(spec, {
    getValue: (config) => config[spec.key],
    setValue: (value) => {
      simulation.updateFieldDampingConfig({ [spec.key]: value } as DemoSimulationFieldDampingConfigPatch);
      sync();
    }
  }));

  const footer = createControlFooter({
    infoText: "6/7 toggles · [] ;'",
    onReset: () => {
      simulation.updateFieldDampingConfig(initialConfig);
      sync();
    }
  });

  panel.body.append(
    createControlSection(obstacleToggle.row, terrainToggle.row),
    createControlSection(...numericControls.map((control) => control.row)),
    footer
  );

  const sync = (): void => {
    const config = simulation.getFieldDampingConfig();
    obstacleToggle.sync(config);
    terrainToggle.sync(config);
    for (const control of numericControls) control.sync(config);
  };

  sync();

  return {
    destroy: panel.destroy
  };
}

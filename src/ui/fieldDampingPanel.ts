import type { DemoSimulationFieldDampingConfig, DemoSimulationFieldDampingConfigPatch, DemoSimulationHandle } from "../sim/demoSimulation";

export type FieldDampingControlPanelHandle = {
  readonly destroy: () => void;
};

type BooleanConfigKey = "enableObstacleFieldDamping" | "enableTerrainFieldDamping";
type NumericConfigKey = "obstacleFieldDampingPerSecond" | "terrainFieldDampingScalePerSecond" | "fieldDampingMaxObstacleCells" | "fieldDampingMaxTerrainCells";

type NumericControlSpec = {
  readonly key: NumericConfigKey;
  readonly label: string;
  readonly valueKind: "float" | "integer";
  readonly sliderMin: number;
  readonly sliderMax: number;
  readonly inputMin: number;
  readonly inputMax: number;
  readonly step: number;
};

const NUMERIC_CONTROLS: readonly NumericControlSpec[] = Object.freeze([
  { key: "obstacleFieldDampingPerSecond", label: "obstacle/sec", valueKind: "float", sliderMin: 0, sliderMax: 4, inputMin: 0, inputMax: 16, step: 0.01 },
  { key: "terrainFieldDampingScalePerSecond", label: "terrain/sec", valueKind: "float", sliderMin: 0, sliderMax: 4, inputMin: 0, inputMax: 16, step: 0.01 },
  { key: "fieldDampingMaxObstacleCells", label: "max obstacle cells", valueKind: "integer", sliderMin: 0, sliderMax: 4096, inputMin: 0, inputMax: 1000000, step: 1 },
  { key: "fieldDampingMaxTerrainCells", label: "max terrain cells", valueKind: "integer", sliderMin: 0, sliderMax: 4096, inputMin: 0, inputMax: 1000000, step: 1 }
]);

export function createFieldDampingControlPanel(host: HTMLElement, simulation: DemoSimulationHandle): FieldDampingControlPanelHandle {
  const initialConfig = simulation.getFieldDampingConfig();
  const root = document.createElement("section");
  root.className = "qubok_evolve-control-panel";
  root.setAttribute("aria-label", "field damping controls");

  const title = document.createElement("div");
  title.className = "qubok_evolve-control-title";
  title.textContent = "field damping";

  const hint = document.createElement("div");
  hint.className = "qubok_evolve-control-hint";
  hint.textContent = "sliders + exact values";

  const toggles = document.createElement("div");
  toggles.className = "qubok_evolve-control-section";

  const obstacleToggle = createBooleanControl("obstacle damping", "enableObstacleFieldDamping", simulation);
  const terrainToggle = createBooleanControl("terrain damping", "enableTerrainFieldDamping", simulation);
  toggles.append(obstacleToggle.row, terrainToggle.row);

  const numericSection = document.createElement("div");
  numericSection.className = "qubok_evolve-control-section";
  const numericControls = NUMERIC_CONTROLS.map((spec) => createNumericControl(spec, simulation));
  for (const control of numericControls) numericSection.append(control.row);

  const footer = document.createElement("div");
  footer.className = "qubok_evolve-control-footer";

  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.className = "qubok_evolve-control-button";
  resetButton.textContent = "reset";
  resetButton.addEventListener("click", () => {
    simulation.updateFieldDampingConfig(initialConfig);
    sync();
  });

  const shortcutText = document.createElement("span");
  shortcutText.textContent = "6/7 toggles · [] ;'";
  footer.append(resetButton, shortcutText);

  root.append(title, hint, toggles, numericSection, footer);
  host.append(root);

  const sync = (): void => {
    const config = simulation.getFieldDampingConfig();
    obstacleToggle.sync(config);
    terrainToggle.sync(config);
    for (const control of numericControls) control.sync(config);
  };

  sync();

  return {
    destroy: () => root.remove()
  };
}

function createBooleanControl(labelText: string, key: BooleanConfigKey, simulation: DemoSimulationHandle): { readonly row: HTMLElement; readonly sync: (config: DemoSimulationFieldDampingConfig) => void } {
  const row = document.createElement("label");
  row.className = "qubok_evolve-control-check-row";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.addEventListener("change", () => {
    simulation.updateFieldDampingConfig({ [key]: input.checked } as DemoSimulationFieldDampingConfigPatch);
    input.dispatchEvent(new CustomEvent("qubok-field-damping-control-change", { bubbles: true }));
  });

  const label = document.createElement("span");
  label.textContent = labelText;

  row.append(input, label);

  return {
    row,
    sync: (config) => {
      input.checked = config[key];
    }
  };
}

function createNumericControl(spec: NumericControlSpec, simulation: DemoSimulationHandle): { readonly row: HTMLElement; readonly sync: (config: DemoSimulationFieldDampingConfig) => void } {
  const row = document.createElement("div");
  row.className = "qubok_evolve-control-number-row";

  const top = document.createElement("div");
  top.className = "qubok_evolve-control-number-top";

  const label = document.createElement("label");
  label.textContent = spec.label;

  const valueBadge = document.createElement("output");
  valueBadge.className = "qubok_evolve-control-value";

  top.append(label, valueBadge);

  const controls = document.createElement("div");
  controls.className = "qubok_evolve-control-number-controls";

  const range = document.createElement("input");
  range.type = "range";
  range.min = String(spec.sliderMin);
  range.max = String(spec.sliderMax);
  range.step = String(spec.step);

  const number = document.createElement("input");
  number.type = "number";
  number.min = String(spec.inputMin);
  number.max = String(spec.inputMax);
  number.step = String(spec.step);

  const update = (rawValue: number): void => {
    const nextValue = normalizeValue(rawValue, spec);
    simulation.updateFieldDampingConfig({ [spec.key]: nextValue } as DemoSimulationFieldDampingConfigPatch);
    sync(simulation.getFieldDampingConfig());
  };

  range.addEventListener("input", () => update(Number(range.value)));
  number.addEventListener("change", () => update(Number(number.value)));
  number.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      update(Number(number.value));
      number.blur();
    }
  });

  controls.append(range, number);
  row.append(top, controls);

  const sync = (config: DemoSimulationFieldDampingConfig): void => {
    const value = config[spec.key];
    range.value = String(Math.max(spec.sliderMin, Math.min(spec.sliderMax, value)));
    number.value = formatValue(value, spec);
    valueBadge.textContent = formatValue(value, spec);
  };

  return { row, sync };
}

function normalizeValue(value: number, spec: NumericControlSpec): number {
  const safeValue = Number.isFinite(value) ? value : spec.inputMin;
  const clamped = Math.max(spec.inputMin, Math.min(spec.inputMax, safeValue));
  return spec.valueKind === "integer" ? Math.floor(clamped) : clamped;
}

function formatValue(value: number, spec: NumericControlSpec): string {
  return spec.valueKind === "integer" ? Math.round(value).toString() : value.toFixed(2);
}

import type { PixiRendererHandle } from "../render/pixiRenderer";
import type { RenderDebugConfig, RenderDebugConfigPatch } from "../render/renderDebugConfig";

export type FieldVisualDebugPanelHandle = {
  readonly destroy: () => void;
};

type BooleanDebugKey = "showAgentFieldInfluenceLayer";
type NumericDebugKey = "agentFieldInfluenceAlpha" | "agentFieldInfluenceScale" | "agentFieldInfluenceMaxAgents" | "agentFieldInfluenceMinMagnitude";

type NumericDebugSpec = {
  readonly key: NumericDebugKey;
  readonly label: string;
  readonly valueKind: "float" | "integer";
  readonly sliderMin: number;
  readonly sliderMax: number;
  readonly inputMin: number;
  readonly inputMax: number;
  readonly step: number;
};

const NUMERIC_DEBUG_CONTROLS: readonly NumericDebugSpec[] = Object.freeze([
  { key: "agentFieldInfluenceAlpha", label: "alpha", valueKind: "float", sliderMin: 0, sliderMax: 1, inputMin: 0, inputMax: 1, step: 0.01 },
  { key: "agentFieldInfluenceScale", label: "length scale", valueKind: "float", sliderMin: 0, sliderMax: 16, inputMin: 0, inputMax: 64, step: 0.1 },
  { key: "agentFieldInfluenceMaxAgents", label: "max agents", valueKind: "integer", sliderMin: 0, sliderMax: 2048, inputMin: 0, inputMax: 4096, step: 1 },
  { key: "agentFieldInfluenceMinMagnitude", label: "min magnitude", valueKind: "float", sliderMin: 0, sliderMax: 4, inputMin: 0, inputMax: 64, step: 0.01 }
]);

export function createFieldVisualDebugPanel(host: HTMLElement, renderer: PixiRendererHandle): FieldVisualDebugPanelHandle {
  const initialConfig = renderer.getRenderDebugConfig();
  const root = document.createElement("section");
  root.className = "qubok_evolve-control-panel qubok_evolve-control-panel--visual-debug";
  root.setAttribute("aria-label", "agent field visual debug controls");
  root.dataset.collapsed = "false";

  const body = document.createElement("div");
  body.className = "qubok_evolve-control-body";


  const title = document.createElement("div");
  title.className = "qubok_evolve-control-title";
  title.textContent = "agent field debug";
  title.tabIndex = 0;
  title.setAttribute("role", "button");
  title.setAttribute("aria-expanded", "true");
  const togglePanelCollapsed = (): void => {
    const collapsed = root.dataset.collapsed !== "true";
    root.dataset.collapsed = collapsed ? "true" : "false";
    body.hidden = collapsed;
    title.setAttribute("aria-expanded", collapsed ? "false" : "true");
  };
  title.addEventListener("click", togglePanelCollapsed);
  title.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      togglePanelCollapsed();
    }
  });

  const hint = document.createElement("div");
  hint.className = "qubok_evolve-control-hint";
  hint.textContent = "entity influence vectors";

  const toggles = document.createElement("div");
  toggles.className = "qubok_evolve-control-section";
  const enabledToggle = createBooleanControl("show influence", "showAgentFieldInfluenceLayer", renderer);
  toggles.append(enabledToggle.row);

  const numericSection = document.createElement("div");
  numericSection.className = "qubok_evolve-control-section";
  const numericControls = NUMERIC_DEBUG_CONTROLS.map((spec) => createNumericControl(spec, renderer));
  for (const control of numericControls) numericSection.append(control.row);

  const footer = document.createElement("div");
  footer.className = "qubok_evolve-control-footer";
  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.className = "qubok_evolve-control-button";
  resetButton.textContent = "reset";
  resetButton.addEventListener("click", () => {
    renderer.updateRenderDebugConfig({
      showAgentFieldInfluenceLayer: initialConfig.showAgentFieldInfluenceLayer,
      agentFieldInfluenceAlpha: initialConfig.agentFieldInfluenceAlpha,
      agentFieldInfluenceScale: initialConfig.agentFieldInfluenceScale,
      agentFieldInfluenceMaxAgents: initialConfig.agentFieldInfluenceMaxAgents,
      agentFieldInfluenceMinMagnitude: initialConfig.agentFieldInfluenceMinMagnitude
    });
    sync();
  });

  const modeText = document.createElement("span");
  modeText.textContent = "separate from field vectors";
  footer.append(resetButton, modeText);

  body.append(hint, toggles, numericSection, footer);
  root.append(title, body);
  host.append(root);

  const sync = (): void => {
    const config = renderer.getRenderDebugConfig();
    enabledToggle.sync(config);
    for (const control of numericControls) control.sync(config);
  };

  sync();

  return {
    destroy: () => root.remove()
  };
}

function createBooleanControl(labelText: string, key: BooleanDebugKey, renderer: PixiRendererHandle): { readonly row: HTMLElement; readonly sync: (config: RenderDebugConfig) => void } {
  const row = document.createElement("label");
  row.className = "qubok_evolve-control-check-row";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.addEventListener("change", () => {
    renderer.updateRenderDebugConfig({ [key]: input.checked } as RenderDebugConfigPatch);
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

function createNumericControl(spec: NumericDebugSpec, renderer: PixiRendererHandle): { readonly row: HTMLElement; readonly sync: (config: RenderDebugConfig) => void } {
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
    renderer.updateRenderDebugConfig({ [spec.key]: nextValue } as RenderDebugConfigPatch);
    sync(renderer.getRenderDebugConfig());
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

  const sync = (config: RenderDebugConfig): void => {
    const value = config[spec.key];
    range.value = String(Math.max(spec.sliderMin, Math.min(spec.sliderMax, value)));
    number.value = formatValue(value, spec);
    valueBadge.textContent = formatValue(value, spec);
  };

  return { row, sync };
}

function normalizeValue(value: number, spec: NumericDebugSpec): number {
  const safeValue = Number.isFinite(value) ? value : spec.inputMin;
  const clamped = Math.max(spec.inputMin, Math.min(spec.inputMax, safeValue));
  return spec.valueKind === "integer" ? Math.floor(clamped) : clamped;
}

function formatValue(value: number, spec: NumericDebugSpec): string {
  return spec.valueKind === "integer" ? Math.round(value).toString() : value.toFixed(2);
}

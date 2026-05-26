export type ControlPanelHandle = {
  readonly root: HTMLElement;
  readonly body: HTMLElement;
  readonly destroy: () => void;
};

export type ControlSyncHandle<TConfig> = {
  readonly row: HTMLElement;
  readonly sync: (config: TConfig) => void;
};

export type NumericControlSpec<TKey extends string = string> = {
  readonly key: TKey;
  readonly label: string;
  readonly valueKind: "float" | "integer";
  readonly sliderMin: number;
  readonly sliderMax: number;
  readonly inputMin: number;
  readonly inputMax: number;
  readonly step: number;
};

export function createCollapsibleControlPanel(options: {
  readonly host: HTMLElement;
  readonly className?: string;
  readonly ariaLabel: string;
  readonly title: string;
  readonly hint?: string;
}): ControlPanelHandle {
  const root = document.createElement("section");
  root.className = options.className ?? "qubok_evolve-control-panel";
  root.setAttribute("aria-label", options.ariaLabel);
  root.dataset.collapsed = "false";

  const body = document.createElement("div");
  body.className = "qubok_evolve-control-body";

  const title = document.createElement("button");
  title.type = "button";
  title.className = "qubok_evolve-control-title";
  title.textContent = options.title;
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

  if (options.hint) {
    const hint = document.createElement("div");
    hint.className = "qubok_evolve-control-hint";
    hint.textContent = options.hint;
    body.append(hint);
  }

  root.append(title, body);
  options.host.append(root);

  return {
    root,
    body,
    destroy: () => root.remove()
  };
}

export function createControlSection(...children: readonly HTMLElement[]): HTMLElement {
  const section = document.createElement("div");
  section.className = "qubok_evolve-control-section";
  section.append(...children);
  return section;
}

export function createControlSubsection(titleText: string, ...children: readonly HTMLElement[]): HTMLElement {
  const section = createControlSection();
  const title = document.createElement("div");
  title.className = "qubok_evolve-control-subsection-title";
  title.textContent = titleText;
  section.append(title, ...children);
  return section;
}

export function createControlFooter(options: {
  readonly resetLabel?: string;
  readonly infoText: string;
  readonly onReset: () => void;
}): HTMLElement {
  const footer = document.createElement("div");
  footer.className = "qubok_evolve-control-footer";

  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.className = "qubok_evolve-control-button";
  resetButton.textContent = options.resetLabel ?? "reset";
  resetButton.addEventListener("click", options.onReset);

  const text = document.createElement("span");
  text.textContent = options.infoText;

  footer.append(resetButton, text);
  return footer;
}

export function createBooleanControl<TConfig>(options: {
  readonly label: string;
  readonly getValue: (config: TConfig) => boolean;
  readonly setValue: (value: boolean) => void;
  readonly changeEventName?: string;
}): ControlSyncHandle<TConfig> {
  const row = document.createElement("label");
  row.className = "qubok_evolve-control-check-row";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.addEventListener("change", () => {
    options.setValue(input.checked);
    if (options.changeEventName) {
      input.dispatchEvent(new CustomEvent(options.changeEventName, { bubbles: true }));
    }
  });

  const label = document.createElement("span");
  label.textContent = options.label;
  row.append(input, label);

  return {
    row,
    sync: (config) => {
      input.checked = options.getValue(config);
    }
  };
}

export function createNumericControl<TConfig, TKey extends string>(spec: NumericControlSpec<TKey>, options: {
  readonly getValue: (config: TConfig) => number;
  readonly setValue: (value: number) => void;
}): ControlSyncHandle<TConfig> {
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
    options.setValue(nextValue);
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

  const sync = (config: TConfig): void => {
    const value = options.getValue(config);
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

import { clearStoredRenderDebugConfig } from "../render/renderDebugConfigPersistence";
import { clearStoredFieldDampingConfig } from "../sim/fieldDampingConfigPersistence";
import { applyDebugConfigPresetText, serializeDebugConfigPreset, validateDebugConfigPresetText } from "./debugConfigPreset";
import { createCollapsibleControlPanel, createControlSection, createControlSubsection } from "./controlPanelPrimitives";

export type DebugLayoutPanelHandle = {
  readonly destroy: () => void;
};

const LAYOUT_STATE_KEYS = Object.freeze([
  "qubok_evolve.perf_overlay_width"
]);

const LAYOUT_STATE_PREFIXES = Object.freeze([
  "qubok_evolve.control_panel_width.",
  "qubok_evolve.control_panel_collapsed.",
  "qubok_evolve.control_subsection_collapsed."
]);

export function createDebugLayoutPanel(host: HTMLElement): DebugLayoutPanelHandle {
  const panel = createCollapsibleControlPanel({
    host,
    className: "qubok_evolve-control-panel qubok_evolve-control-panel--layout-state",
    ariaLabel: "debug ui layout controls",
    title: "debug ui layout",
    hint: "stored panel state",
    defaultCollapsed: true
  });

  const copyPresetButton = document.createElement("button");
  copyPresetButton.type = "button";
  copyPresetButton.className = "qubok_evolve-control-button qubok_evolve-control-button--wide";
  copyPresetButton.textContent = "copy debug preset";

  const presetInput = document.createElement("textarea");
  presetInput.className = "qubok_evolve-control-textarea";
  presetInput.placeholder = "paste debug preset JSON";

  const importPresetButton = document.createElement("button");
  importPresetButton.type = "button";
  importPresetButton.className = "qubok_evolve-control-button qubok_evolve-control-button--wide";
  importPresetButton.textContent = "import preset + reload";

  const clearPresetButton = document.createElement("button");
  clearPresetButton.type = "button";
  clearPresetButton.className = "qubok_evolve-control-button qubok_evolve-control-button--wide";
  clearPresetButton.textContent = "clear preset text";

  const presetStatus = document.createElement("div");
  presetStatus.className = "qubok_evolve-control-note qubok_evolve-control-note--preset";

  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.className = "qubok_evolve-control-button qubok_evolve-control-button--wide";
  resetButton.textContent = "reset layout + debug config";

  const status = document.createElement("div");
  status.className = "qubok_evolve-control-note";
  status.textContent = "copy/export or clear stored debug values";

  const updatePresetValidation = (): void => {
    const validation = validateDebugConfigPresetText(presetInput.value);
    presetInput.dataset.validation = validation.state;
    presetStatus.dataset.validation = validation.state;
    presetStatus.textContent = validation.message;
    importPresetButton.disabled = validation.state !== "valid";
  };

  copyPresetButton.addEventListener("click", async () => {
    const presetText = serializeDebugConfigPreset();
    try {
      await navigator.clipboard.writeText(presetText);
      status.textContent = `copied debug preset · ${presetText.length} chars`;
    } catch {
      status.textContent = "clipboard unavailable · open devtools to inspect preset";
      console.info("qubok_evolve debug preset", presetText);
    }
  });

  presetInput.addEventListener("input", updatePresetValidation);

  clearPresetButton.addEventListener("click", () => {
    presetInput.value = "";
    updatePresetValidation();
    status.textContent = "preset text cleared";
  });

  importPresetButton.addEventListener("click", () => {
    try {
      const result = applyDebugConfigPresetText(presetInput.value);
      status.textContent = `imported preset · layout ${result.layoutKeyCount} · render ${result.hasRenderDebugConfig ? "yes" : "no"} · damping ${result.hasFieldDampingConfig ? "yes" : "no"} · reloading`;
      window.setTimeout(() => window.location.reload(), 80);
    } catch {
      status.textContent = "invalid debug preset JSON";
    }
  });

  resetButton.addEventListener("click", () => {
    const removedCount = clearDebugLayoutState();
    clearStoredRenderDebugConfig();
    clearStoredFieldDampingConfig();
    status.textContent = `cleared ${removedCount} stored ui keys · reloading`;
    window.setTimeout(() => window.location.reload(), 80);
  });

  updatePresetValidation();

  panel.body.append(
    createControlSubsection("preset io", copyPresetButton, presetInput, importPresetButton, clearPresetButton, presetStatus),
    createControlSection(resetButton, status)
  );

  return {
    destroy: panel.destroy
  };
}

export function clearDebugLayoutState(): number {
  let removedCount = 0;

  for (const key of LAYOUT_STATE_KEYS) {
    removedCount += removeStoredKey(key);
  }

  try {
    const keysToRemove: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && LAYOUT_STATE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      removedCount += removeStoredKey(key);
    }
  } catch {
    // localStorage can be unavailable in restricted contexts.
  }

  return removedCount;
}

function removeStoredKey(key: string): number {
  try {
    if (localStorage.getItem(key) === null) return 0;
    localStorage.removeItem(key);
    return 1;
  } catch {
    return 0;
  }
}

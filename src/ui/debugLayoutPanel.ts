import { createCollapsibleControlPanel, createControlSection } from "./controlPanelPrimitives";

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
    hint: "stored panel state"
  });

  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.className = "qubok_evolve-control-button qubok_evolve-control-button--wide";
  resetButton.textContent = "reset layout + reload";

  const status = document.createElement("div");
  status.className = "qubok_evolve-control-note";
  status.textContent = "clears widths + collapsed states only";

  resetButton.addEventListener("click", () => {
    const removedCount = clearDebugLayoutState();
    status.textContent = `cleared ${removedCount} stored ui keys · reloading`;
    window.setTimeout(() => window.location.reload(), 80);
  });

  panel.body.append(createControlSection(resetButton, status));

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

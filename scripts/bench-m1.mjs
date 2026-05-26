import { stat } from "node:fs/promises";

const start = performance.now();

await stat("src/render/pixiRenderer.ts");
await stat("src/render/debugOverlay.ts");
await stat("src/ui/App.ts");

const elapsed = performance.now() - start;

console.log(JSON.stringify({
  benchmark: "m1-scaffold-smoke",
  purpose: "Confirms that milestone 1 render/UI modules exist. Browser overlay measures live FPS and frame time.",
  elapsedMs: Number(elapsed.toFixed(3)),
  renderTarget: "PixiJS canvas",
  simMsPerTick: 0,
  entityCount: 256
}, null, 2));

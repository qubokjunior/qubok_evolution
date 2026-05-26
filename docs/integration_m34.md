# m34 integration: terrain debug render layer

Milestone 34 adds a Pixi terrain debug render layer that consumes the m33 terrain render snapshot boundary.

## Implementation

- `demoSimulation.ts` owns a deterministic demo terrain layer and emits `terrainRenderSnapshot` per frame.
- `pixiRenderer.ts` draws material cells behind obstacles and agents using `renderTerrainLayer()`.
- `debugOverlay.ts` exposes terrain render timing, cell count, and truncation state.
- `perfMetrics.ts` includes terrain render metrics.
- `scripts/test-terrain-debug-render-layer.mjs` guards the render-layer integration tokens.

## Acceptance

- `npm run test:terrain-debug-render-layer`
- `npm run test`
- `npm run build`

## Explicitly not changed

- no terrain editor
- no terrain movement integration
- no resource distribution integration
- no sensor terrain integration
- no fluid field
- no controller/brain work

# m33 integration: terrain render snapshot foundation

Milestone 33 adds a read-only terrain render snapshot boundary for future terrain debug visualization.

## Implementation

- `src/sim/terrainRenderSnapshot.ts` creates immutable snapshot-style arrays from `TerrainLayer`.
- `makeTerrainRenderSnapshot()` copies terrain cell ids, material ids, and optional scalar channels.
- `analyzeTerrainRenderSnapshot()` provides low-cost debug summary stats.
- `scripts/test-terrain-render-snapshot.mjs` validates snapshot content, truncation, scalar exclusion, and non-mutation.
- `scripts/bench-terrain-render-snapshot.mjs` measures snapshot throughput.

## Acceptance

- `npm run test:terrain-render-snapshot`
- `npm run test`
- `npm run build`
- `npm run bench:terrain-render-snapshot`

## Explicitly not changed

- no terrain editor
- no terrain Pixi render layer yet
- no movement/resource/sensor terrain integration yet
- no fluid field
- no controller/brain work
- no authoritative terrain state outside `src/sim/terrain.ts`

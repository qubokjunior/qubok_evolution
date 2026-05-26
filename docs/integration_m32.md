# m32 integration: terrain/material layer foundation

Milestone 32 starts the terrain/material track from the m31 roadmap without adding an editor, renderer refactor, controller, fluid field, or terrain visuals.

## Implementation

- `src/sim/terrain.ts` defines a typed-array terrain grid.
- Each terrain cell stores material id, friction, drag, resource affinity, and movement cost.
- `sampleTerrainAtPosition()` provides the world-position query API future movement/resource/sensor systems can consume.
- `scripts/test-terrain.mjs` validates deterministic cell/material lookup and bounds behavior.
- `scripts/bench-terrain.mjs` measures terrain query throughput.

## Acceptance

- `npm run test:terrain`
- `npm run test`
- `npm run build`
- `npm run bench:terrain`

## Explicitly not changed

- no terrain editor
- no terrain rendering
- no movement integration yet
- no resource distribution integration yet
- no fluid field
- no controller/brain work

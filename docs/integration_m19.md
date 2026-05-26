# qubok_evolve integration milestone 19

Milestone 19 adds a minimal obstacle occupancy mask and wires it into the existing `sectorObstacle` sensor channel.

## Goal

m17 created `sectorObstacle` as a fixed-width channel and m18 added warm-channel cadence. m19 gives `sectorObstacle` a real terrain-like source without adding a full terrain system, signed distance field, editor or physics engine.

## Changed

- `package.json` now reports `0.1.0-milestone.19`.
- `src/shared/appVersion.ts` now reports `m19`.
- Added `src/sim/obstacleMask.ts`.
- Added `scripts/test-obstacle-mask.mjs`.
- `applyAgentSensors()` now accepts `obstacleMask`.
- `sectorObstacle` is fed by:
  - world-border proximity,
  - occupied cells from `ObstacleMask`.
- Demo simulation creates a deterministic demo obstacle mask via `seedDemoObstacleMask()`.
- `bench:sensors` now reports obstacle mask cell checks, hits and sector writes.
- Overlay exposes:
  - `obs mask hits`,
  - `obs mask sectors`.

## Contract

The brain-facing sector input width remains unchanged:

- `sectorAlly`,
- `sectorThreat`,
- `sectorFood`,
- `sectorObstacle`.

m19 changes the source of `sectorObstacle`, not the channel layout.

## Not changed

- No full terrain/material system.
- No signed distance field.
- No terrain editor.
- No collision response against obstacles.
- No pathfinding.
- No brain/controller.
- No workerization.
- No WebGPU.
- No fluid/flow fields.

## Verification

Required commands:

```powershell
npm run test
npm run build
npm run bench:sensors
```

## Next m20 target

A good next step is obstacle response / soft push-out sampling, or a benchmark-focused optimization pass for obstacle mask sector scanning. Do not add both in one milestone.

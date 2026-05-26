# qubok_evolve integration milestone 24

Milestone 24 consolidates obstacle-aware lifecycle telemetry.

## Goal

m19-m23 added obstacle-aware systems in separate places:

- obstacle sector sensing,
- obstacle soft response,
- obstacle-aware initial spawning,
- obstacle-aware resource respawn,
- obstacle-aware offspring placement.

m24 adds a small telemetry aggregation layer so the demo/overlay can observe these systems as one lifecycle surface.

## Changed

- `package.json` now reports `0.1.0-milestone.24`.
- `src/shared/appVersion.ts` now reports `m24`.
- Added `src/sim/lifecycleTelemetry.ts`.
- Added `scripts/test-lifecycle-telemetry.mjs`.
- Added `scripts/bench-lifecycle-telemetry.mjs`.
- Demo step now returns `obstacleLifecycleTelemetry`.
- Perf metrics and overlay now expose consolidated obstacle lifecycle counters:
  - lifecycle events,
  - lifecycle pressure,
  - spawn blocked attempts,
  - spawn fallbacks,
  - spawn failures,
  - reproduction obstacle blocks,
  - reproduction placement failures,
  - obstacle-aware resource respawns.

## Contract

The telemetry layer is read-only aggregation. It does not change simulation behavior, spawning, reproduction, sensors, movement, resource logic, or terrain data.

## Not changed

- No new agent behavior.
- No brain/controller.
- No pathfinding.
- No collision solver.
- No signed distance field.
- No editor/UI for terrain.
- No WebGPU.
- No workerization.

## Verification

Required commands:

```powershell
npm run test
npm run build
npm run bench:lifecycle-telemetry
```

## Next m25 target

A good next step is a visible obstacle debug render layer for the demo, because obstacle systems now exist but the terrain mask itself is not directly visible in the live canvas.

# qubok_evolve integration milestone 21

Milestone 21 optimizes the m20 soft obstacle response by adding spatial sampling controls.

## Goal

m20 introduced `applyObstacleSoftResponse()` as a local force pass. m21 keeps the same force contract but adds controls that bound or reduce obstacle cell work per agent.

## Changed

- `package.json` now reports `0.1.0-milestone.21`.
- `src/shared/appVersion.ts` now reports `m21`.
- `src/sim/obstacleResponse.ts` now exposes `qubok_evolve.obstacle_response.v2`.
- `ObstacleSoftResponseConfig` now supports:
  - `boundsOnly`,
  - `cellStride`,
  - `cellStridePhase`,
  - `maxObstacleCellChecksPerAgent`.
- Response stats now report:
  - `obstacleCellsSkippedByStride`,
  - `obstacleCellCheckLimitHits`.
- Demo simulation exposes m21 controls:
  - `obstacleResponseCellStride`,
  - `obstacleResponseMaxCellChecksPerAgent`,
  - `obstacleResponseBoundsOnly`.
- Overlay reports:
  - `obs checks`,
  - `obs skip cells`,
  - `obs limits`.
- `bench:obstacle-response` now compares:
  - full sampling,
  - stride-2 sampling,
  - capped sampling,
  - bounds-only mode.

## Contract

The movement contract remains unchanged. Obstacle response still writes only into `world.fx/world.fy`, and `stepMovement()` still owns velocity, drag, speed clamp, position update and force clearing.

## Not changed

- No hard collision solver.
- No pathfinding.
- No signed distance field.
- No terrain editor.
- No spawn validation.
- No workerization.
- No WebGPU.

## Verification

Required commands:

```powershell
npm run test
npm run build
npm run bench:obstacle-response
```

## Next m22 target

A good next step is obstacle-aware resource spawning and agent spawn validation, so resources/agents do not initialize inside occupied obstacle cells.

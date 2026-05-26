# qubok_evolve integration milestone 23

Milestone 23 adds obstacle-aware offspring placement to reproduction.

## Goal

m22 prevented initial agents/resources and resource respawns from appearing inside obstacle cells. m23 applies the same terrain constraint to offspring created by `applyReproduction()`.

## Changed

- `package.json` now reports `0.1.0-milestone.23`.
- `src/shared/appVersion.ts` now reports `m23`.
- `src/sim/reproduction.ts` now exposes `qubok_evolve.reproduction.v3`.
- `ReproductionConfig` now accepts:
  - `obstacleMask`,
  - `offspringSpawnMaxAttempts`,
  - `offspringClearanceRadius`.
- `ReproductionStepStats` now reports:
  - `blockedByObstacle`,
  - `obstacleFallbackUsedCount`,
  - `obstaclePlacementFailedCount`,
  - `obstacleBlockedAttemptCount`.
- Demo reproduction now passes `obstacleMask` and spawn validation controls.
- Added `bench:reproduction-spawn-validation`.

## Contract

If no `obstacleMask` is provided, reproduction keeps the previous local random offset behavior.

If `obstacleMask` is provided, offspring placement uses `findFreePositionNearOrRandom()`. Parent energy is spent only after a valid child position is found. If all placement attempts fail and no free fallback exists, no child is spawned and parent energy remains unchanged.

## Not changed

- No new genes.
- No brain/controller.
- No pathfinding.
- No hard collision solver.
- No signed distance field.
- No terrain editor.
- No workerization.
- No WebGPU.

## Verification

Required commands:

```powershell
npm run test
npm run build
npm run bench:reproduction-spawn-validation
```

## Next m24 target

A good next step is lifecycle/performance telemetry consolidation for obstacle-aware systems, or reproduction-spawn validation tuning for dense obstacle fields. Do not add both in one milestone.

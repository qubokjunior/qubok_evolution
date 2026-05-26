# qubok_evolve integration milestone 22

Milestone 22 adds obstacle-aware spawning for agents and resources.

## Goal

m19 made obstacle cells visible to sensors and m20/m21 made them push agents softly. m22 prevents new agents/resources from initializing inside occupied obstacle cells.

## Changed

- `package.json` now reports `0.1.0-milestone.22`.
- `src/shared/appVersion.ts` now reports `m22`.
- Added `src/sim/spawnValidation.ts`.
- Added `scripts/test-spawn-validation.mjs`.
- Added `scripts/bench-spawn-validation.mjs`.
- Demo initialization now seeds `ObstacleMask` before spawning agents/resources.
- Demo uses:
  - `spawnRandomAgentsAvoidingObstacles()`,
  - `spawnRandomResourcesAvoidingObstacles()`,
  - `respawnResourcesToTargetAvoidingObstacles()`.
- Demo handle exposes initial spawn validation stats.

## Contract

Obstacle-aware spawning does not change the core typed-array world or resource layout. It is an external placement helper that calls the existing `spawnAgent()` and `spawnResource()` functions only after finding a valid free position.

## Not changed

- No pathfinding.
- No hard collision solver.
- No signed distance field.
- No terrain editor.
- No biome/material system.
- No reproduction obstacle validation yet.
- No WebGPU.
- No workerization.

## Verification

Required commands:

```powershell
npm run test
npm run build
npm run bench:spawn-validation
```

## Next m23 target

A good next step is reproduction spawn validation, so offspring are not placed inside occupied obstacle cells.

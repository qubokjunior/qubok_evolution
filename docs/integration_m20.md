# qubok_evolve integration milestone 20

Milestone 20 adds a minimal soft response to the obstacle mask.

## Goal

m19 made obstacles visible to sensors through `sectorObstacle`. m20 makes the same obstacle mask influence movement by adding a soft push-out force before `stepMovement()`.

## Changed

- `package.json` now reports `0.1.0-milestone.20`.
- `src/shared/appVersion.ts` now reports `m20`.
- Added `src/sim/obstacleResponse.ts`.
- Added `scripts/test-obstacle-response.mjs`.
- Added `scripts/bench-obstacle-response.mjs`.
- Demo simulation calls `applyObstacleSoftResponse()` after demo steering forces and before movement integration.
- Overlay reports:
  - `obs response`,
  - `obs forces`,
  - `obs hits`,
  - `obs boundary`.

## Contract

This is still not a full collision system. The response is force-based, local and soft:

1. Sample occupied obstacle cells around each alive agent.
2. Accumulate force away from occupied cells inside response radius.
3. Optionally add inward boundary force near world edges.
4. Clamp force per agent.
5. Add the force into existing `world.fx/world.fy`.
6. Let the existing movement integrator handle velocity, drag, speed clamp and position.

## Not changed

- No hard collision solver.
- No pathfinding.
- No signed distance field.
- No terrain editor.
- No material movement cost.
- No WebGPU.
- No workerization.
- No brain/controller.

## Verification

Required commands:

```powershell
npm run test
npm run build
npm run bench:obstacle-response
```

`npm run bench:sensors` remains useful but is not the hot-path acceptance benchmark for m20.

## Next m21 target

A good next step is either:

1. obstacle response optimization / spatial sampling controls, or
2. obstacle-aware resource spawning and agent spawn validation.

Do not add both in one milestone.

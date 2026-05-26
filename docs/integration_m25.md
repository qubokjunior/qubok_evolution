# qubok_evolve integration milestone 25

Milestone 25 adds a visible obstacle debug render layer.

## Goal

m19-m24 made the obstacle mask participate in sensors, soft response, spawn validation, resource respawn, reproduction placement and telemetry. m25 makes the obstacle mask visible in the live Pixi canvas.

## Changed

- `package.json` now reports `0.1.0-milestone.25`.
- `src/shared/appVersion.ts` now reports `m25`.
- Added `src/sim/obstacleRenderSnapshot.ts`.
- Added `scripts/test-obstacle-render-snapshot.mjs`.
- Added `scripts/bench-obstacle-render-snapshot.mjs`.
- Demo step now returns `obstacleMaskSnapshot`.
- Pixi renderer now creates an `obstacleLayer` between grid and agents.
- Debug overlay now reports:
  - `obs render`,
  - `obs cells`.
- Perf metrics now track:
  - `obstacleRenderMs`,
  - `obstacleRenderCellCount`.

## Rendering contract

Obstacle rendering is debug-only and read-only. It draws occupied obstacle cells as a subtle layer under agents. It does not add terrain editing, painting, signed distance fields, pathfinding or collision solving.

Layer order:

```text
background
grid
obstacle debug cells
agents
```

## Verification

Required commands:

```powershell
npm run test
npm run build
npm run bench:obstacle-render-snapshot
```

## Next m26 target

A good next step is obstacle debug visibility controls or render caching, not terrain editing yet.

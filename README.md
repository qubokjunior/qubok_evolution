# qubok_evolve

High-performance realtime 2D artificial-life ecosystem simulator.

Current status: m41 / 0.1.0-milestone.41.

## What exists now

qubok_evolve is a deterministic, data-oriented 2D artificial-life runtime. The simulation state lives in typed arrays under `src/sim`, the PixiJS renderer consumes read-only snapshots under `src/render`, and milestone work is validated with Node-based tests and benchmarks.

Implemented runtime foundations:

- typed-array `WorldState` with deterministic spawning, lifecycle counters, phenotype fields, sensor buffers, and lineage fields;
- movement, spatial hash, neighbor query, resources, energy survival, reproduction, mutation, predator/prey interaction, and sector sensors;
- obstacle mask used by sensing, soft movement response, spawn validation, lifecycle telemetry, and debug rendering;
- free-list dead-slot reuse so death creates structural room for later births;
- live performance/debug overlay with obstacle, terrain, field, sensor, reproduction, and world-slot telemetry;
- static tests guarding architecture boundaries, repo status, roadmap status, and lifecycle death routing;
- terrain/material data layer with deterministic cell/material sampling;
- terrain render snapshot foundation and Pixi debug render layer;
- terrain movement query integration using material friction, drag, and movement cost;
- terrain resource-affinity spawning and respawning;
- terrain-aware sensor sampling on controlled cadence;
- terrain-aware offspring placement for reproduction;
- low-resolution environmental flow field with movement integration and debug overlay metrics;
- environmental field render snapshot and Pixi vector debug layer;
- m41 milestone setup for render debug controls and overlay grouping.

## Commands

```powershell
npm install
npm run test
npm run build
npm run dev
```

Targeted checks:

```powershell
npm run test:repo-status
npm run test:roadmap-status
npm run test:field
npm run test:field-render-snapshot
npm run test:movement
npm run test:terrain
npm run test:terrain-render-snapshot
npm run test:terrain-debug-render-layer
npm run test:terrain-movement-query
npm run test:terrain-resource-affinity
npm run test:terrain-sensor-sampling
npm run test:terrain-reproduction-placement
npm run test:death-path-audit
npm run test:lifecycle-pressure
npm run bench:world-free-list
npm run bench:terrain-render-snapshot
```

Open the local URL printed by Vite, usually:

```text
http://127.0.0.1:5173/
```

## Milestones and docs

- `docs/milestones.md` — compact milestone index through m41.
- `docs/roadmap.md` — development tracks after m41.
- `docs/architecture_tracks.md` — boundary contracts for future work.
- `docs/world_state.md` — typed-array world state and lifecycle slot contract.
- `docs/integration_m36.md` — terrain resource-affinity milestone.
- `docs/integration_m37.md` — terrain-aware sensor sampling milestone.
- `docs/integration_m38.md` — terrain-aware reproduction placement milestone.
- `docs/integration_m39.md` — environmental flow field milestone.
- `docs/integration_m40.md` — environmental field render snapshot and Pixi vector debug layer.
- `docs/integration_m41.md` — render debug controls and overlay grouping milestone setup.

## Boundary rule

PixiJS is allowed in `src/render/` only. The simulation layer must remain renderer-agnostic. The renderer reads immutable snapshots and must not own authoritative simulation state.

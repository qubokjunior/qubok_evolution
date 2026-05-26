# qubok_evolve

High-performance realtime 2D artificial-life ecosystem simulator.

Current status: m34 / 0.1.0-milestone.34.

## What exists now

qubok_evolve is a deterministic, data-oriented 2D artificial-life runtime. The simulation state lives in typed arrays under `src/sim`, the PixiJS renderer consumes read-only snapshots under `src/render`, and milestone work is validated with Node-based tests and benchmarks.

Implemented runtime foundations:

- typed-array `WorldState` with deterministic spawning, lifecycle counters, phenotype fields, sensor buffers, and lineage fields;
- movement, spatial hash, neighbor query, resources, energy survival, reproduction, mutation, predator/prey interaction, and sector sensors;
- obstacle mask used by sensing, soft movement response, spawn validation, lifecycle telemetry, and debug rendering;
- free-list dead-slot reuse so death creates structural room for later births;
- live performance/debug overlay with obstacle and world-slot telemetry;
- static tests guarding architecture boundaries, repo status, roadmap status, and lifecycle death routing;
- terrain/material data layer with deterministic cell/material sampling;
- terrain render snapshot foundation for future terrain debug visualization;
- terrain Pixi debug render layer with overlay metrics.

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
npm run test:terrain
npm run test:terrain-render-snapshot
npm run test:terrain-debug-render-layer
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

- `docs/milestones.md` — compact milestone index through m34.
- `docs/roadmap.md` — development tracks after m31.
- `docs/architecture_tracks.md` — boundary contracts for future work.
- `docs/world_state.md` — typed-array world state and lifecycle slot contract.
- `docs/integration_m34.md` — current terrain debug render layer milestone.

## Boundary rule

PixiJS is allowed in `src/render/` only. The simulation layer must remain renderer-agnostic. The renderer reads immutable snapshots and must not own authoritative simulation state.

# qubok_evolve

High-performance realtime 2D artificial-life ecosystem simulator.

Current status: m49 complete / controller actuator bridge shipped behind explicit disabled-by-default config. M50 planning is open for ecology pressure calibration: hunger, scarcity, reproduction, predation, and population pressure.

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
- render debug controls, keyboard layer toggles, and grouped overlay metrics;
- field decay/diffusion foundation with deterministic dynamics, scratch buffers, metrics, benchmark, demo wiring, and overlay labels;
- field sources/sinks foundation with deterministic resource-driven vector emission, agent absorption, demo wiring, metrics, overlay labels, tests, and benchmark;
- field source semantics tuning and visualization QA with resource energy/radius source scaling, agent radius/energy-pressure absorption, runtime visual QA, and overlay/readout guards;
- m45 complete: obstacle/terrain damping sources, editable debug parameters, panel persistence, render layer controls, and debug config preset import/export UX;
- m46 complete: deterministic environmental field advection with core tests, benchmark, demo wiring, overlay/readouts, editable controls, and persistence;
- m47 complete: renderer-agnostic field-force sampling, deterministic tests, benchmark, disabled-by-default demo wiring, overlay/readouts, controls, and persistence;
- m48 complete: renderer-agnostic controller API, deterministic intent buffers, disabled-by-default demo wiring, benchmark, overlay/readouts, panel controls, persistence, source-material overview, and status guards;
- m49 complete: renderer-agnostic controller actuator bridge, disabled-by-default demo wiring, actuator benchmark, overlay/readouts, panel controls, persistence, and status guards.

## Commands

```powershell
npm install
npm run test
npm run build
npm run dev
```

Targeted current checks:

```powershell
npm run test:repo-status
npm run test:roadmap-status
npm run test:controller-actuator
npm run test:controller-integration
npm run test:controller-overlay-qa
npm run test:controller-panel
npm run test:controller-config-persistence
npm run test:demo-integration
npm run build
```

Open the local URL printed by Vite, usually:

```text
http://127.0.0.1:5173/
```

## Milestones and docs

- `docs/project_overview.md` — technical source-material overview: current architecture, implemented systems, known limits, philosophy, and M50 -> M57 roadmap.
- `docs/milestones.md` — compact milestone index through m50.
- `docs/roadmap.md` — development tracks after m49 actuator bridge and before M50 runtime ecology wiring.
- `docs/architecture_tracks.md` — boundary contracts for future work.
- `docs/world_state.md` — typed-array world state and lifecycle slot contract.
- `docs/integration_m36.md` — terrain resource-affinity milestone.
- `docs/integration_m37.md` — terrain-aware sensor sampling milestone.
- `docs/integration_m38.md` — terrain-aware reproduction placement milestone.
- `docs/integration_m39.md` — environmental flow field milestone.
- `docs/integration_m40.md` — environmental field render snapshot and Pixi vector debug layer.
- `docs/integration_m41.md` — render debug controls and overlay grouping milestone.
- `docs/integration_m42.md` — field decay/diffusion foundation milestone.
- `docs/integration_m43.md` — field sources/sinks foundation milestone.
- `docs/integration_m44.md` — field source semantics tuning and visualization QA milestone.
- `docs/integration_m45.md` — completed obstacle/terrain damping sources and editable debug parameters milestone.
- `docs/integration_m46.md` — completed environmental field transport/advection milestone.
- `docs/integration_m47.md` — completed field-force separation milestone.
- `docs/integration_m48.md` — completed controller/brain first-pass milestone.
- `docs/integration_m49.md` — completed controller actuator bridge milestone.
- `docs/integration_m50.md` — ecology pressure calibration planning scope.

## Boundary rule

PixiJS is allowed in `src/render/` only. The simulation layer must remain renderer-agnostic. The renderer reads immutable snapshots and must not own authoritative simulation state.

# qubok_evolve

High-performance realtime 2D artificial-life ecosystem simulator.

Current status: m30 / 0.1.0-milestone.30.

## What exists now

qubok_evolve is now a deterministic, data-oriented 2D artificial-life runtime, not just a renderer scaffold. The simulation state lives in typed arrays under `src/sim`, the PixiJS renderer consumes read-only snapshots under `src/render`, and milestone work is validated with small Node-based tests and benchmarks.

Implemented runtime foundations:

- typed-array `WorldState` with deterministic spawning, lifecycle counters, phenotype fields, sector sensor buffers, and lineage fields;
- movement integration with force accumulation, drag, speed clamp, heading update, bounds modes, and movement energy cost;
- spatial hash and local neighbor sampling;
- resource layer with pickup, respawn, and obstacle-aware placement;
- energy/starvation survival loop;
- reproduction with phenotype mutation and obstacle-aware offspring placement;
- predator/prey interaction with diet masks, damage, armor, kills, and energy transfer;
- fixed-width sector sensors for allies, threats, food, and obstacles;
- obstacle mask used by sensing, soft movement response, spawn validation, lifecycle telemetry, and debug rendering;
- free-list dead-slot reuse so death creates structural room for future births;
- live performance/debug overlay including obstacle and world-slot telemetry;
- static tests guarding architecture boundaries, repo status, and lifecycle death routing.

## Current lifecycle contract

All runtime death paths must call `killAgent(world, index)`. Direct `alive[index] = 0` writes outside `src/sim/world.ts` are blocked by `npm run test:death-path-audit`, because direct writes bypass the reusable-slot free-list introduced in m26.

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
npm run test:death-path-audit
npm run test:lifecycle-pressure
npm run bench:world-free-list
```

Open the local URL printed by Vite, usually:

```text
http://127.0.0.1:5173/
```

## Milestones and docs

- `docs/milestones.md` — compact milestone index through m30.
- `docs/world_state.md` — typed-array world state and lifecycle slot contract.
- `docs/integration_m30.md` — current repo-status sync milestone.

## Boundary rule

PixiJS is allowed in `src/render/` only. The simulation layer must remain renderer-agnostic. The renderer reads immutable snapshots and must not own authoritative simulation state.

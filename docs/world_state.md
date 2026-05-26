# qubok_evolve WorldState contract

Milestone 3 introduces the first real runtime memory layout.

## Purpose

WorldState is the typed-array storage layer for simulation data. It is not an object graph and it is not React state.

## Invariants

- No `Entity` class.
- No dynamic component objects in the simulation hot path.
- One entity index maps to the same index across all per-agent arrays.
- Hot data uses compact typed arrays.
- Warm sector data uses pooled arrays: `agentIndex * sectorCount + sectorIndex`.
- Structural morphology changes do not happen inside this layer yet.
- PixiJS, React, editor and compiler logic must not be imported inside `src/sim`.

## Current files

- `src/sim/arrays.ts`: typed-array helpers and validation.
- `src/sim/world.ts`: WorldState allocation, reset, spawn, kill, memory accounting and deterministic random spawn helper.
- `scripts/test-world.mjs`: schema, capacity, reset and determinism checks.
- `scripts/bench-world.mjs`: allocation/spawn benchmark for 1k, 5k, 10k, 16k and 25k.

## Current benchmark meaning

`bench:world` measures allocation plus deterministic spawning only. It is not a movement benchmark yet. Movement starts in the next milestone.

## m26 dead-slot reuse / free-list

Milestone 26 changes lifecycle capacity semantics without changing the typed-array storage model.

`WorldState` now keeps a deterministic free-list for dead agent slots:

- `reusableSlots: Uint32Array` stores dead slot indices;
- `reusableSlotFlags: Uint8Array` prevents duplicate insertion;
- `reusableSlotCount` is the current number of reusable slots;
- `spawnReusedSlotCount` counts spawns that reused dead slots;
- `spawnAppendedSlotCount` counts spawns that appended at the historical end.

`killAgent(world, index)` now validates the index, returns immediately if the slot is already dead, writes `alive[index] = 0`, and queues the slot only once.

`spawnAgent(world, input)` now reuses a queued dead slot before appending. It throws only when there is no reusable slot and `world.count >= world.capacity`.

No compaction is performed. Render snapshots still expose slots from `0..world.count`, and downstream code must continue to respect `alive[index]`.

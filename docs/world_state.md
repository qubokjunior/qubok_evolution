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


## m27 world slot telemetry

Milestone 27 exposes the m26 slot reuse counters in runtime telemetry and the debug overlay.

The tracked counters are:

- reusableSlotCount: dead slots currently available for reuse.
- spawnReusedSlotCount: total spawns that reused a dead slot.
- spawnAppendedSlotCount: total spawns that appended at the historical end of world.count.

These values are read-only observability surfaces. They do not change the reuse algorithm introduced in m26.

## m28 lifecycle deaths and reusable slots

Milestone 28 makes lifecycle death paths consume the same world-level death API as manual kills. Energy/starvation deaths and predator/prey kills now call `killAgent(world, index)` instead of directly writing `alive[index] = 0`.

This matters because m26 introduced dead-slot reuse through `reusableSlots`, and direct `alive` writes bypassed that free-list. After m28, runtime deaths participate in the same lifecycle loop:

`death -> reusableSlotCount increments -> reproduction/spawn reuses the slot -> spawnReusedSlotCount increments`.

The new lifecycle-pressure test configures a full-capacity demo world, forces one energy death, keeps one parent reproduction-eligible, and verifies that the same tick kills an agent, creates a reusable slot, births a child, and reuses the dead slot without appending beyond capacity.

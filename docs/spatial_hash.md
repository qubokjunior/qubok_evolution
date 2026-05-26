# qubok_evolve spatial hash contract

Milestone 7 introduces the first broad-phase spatial structure: a uniform grid / spatial hash.

## Purpose

The grid is shared infrastructure for future perception, collision, flocking, food lookup, threat lookup and local sensors.

## Current scope

Implemented now:

- `src/sim/spatialHash.ts`
- one linked-list grid per frame
- one cell id per alive agent
- dead agents skipped
- out-of-bounds positions clamped to edge cells
- grid rebuild benchmark for 1k / 5k / 10k / 16k / 25k
- live `gridBuildMs` overlay metric

Not implemented yet:

- radius neighbor query
- candidate counting
- cone sensors
- collision response
- flocking summaries

Those start in the next milestones.

## Runtime invariants

- No `Entity` objects.
- No PixiJS, React, editor or compiler imports inside `src/sim`.
- Grid storage uses typed arrays:
  - `cellHeads: Int32Array`
  - `next: Int32Array`
  - `cellIds: Int32Array`
  - `cellOccupancy: Uint16Array`
- Rebuild is `O(entityCount + cellCount)`.
- Cell size should initially be near the dominant interaction radius, not the whole map scale.

## Why uniform grid first

Most early agents are similarly sized and highly dynamic. A flat grid gives predictable rebuild cost and simple cache-friendly local traversal. Quadtree or hierarchical grid stays a later benchmark branch for heterogeneous body sizes and sparse worlds.
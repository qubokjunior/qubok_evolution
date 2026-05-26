# qubok_evolve neighbor query contract

Milestone 8 adds local radius neighbor queries over the milestone 7 uniform grid / spatial hash.

## Files

- `src/sim/neighborQuery.ts`
- `scripts/test-neighbor-query.mjs`
- `scripts/bench-neighbor-query.mjs`

## Runtime rule

Neighbor queries are broad-phase grid traversal plus narrow-phase squared-distance checks.

The query path must not allocate per-entity objects inside future hot loops. Current visitor calls are acceptable for tests/debug/sampled summaries; later sensor aggregation should write directly into typed buffers.

## Current API

- `forEachNeighborInRadius(grid, world, centerIndex, radius, visitor)`
- `writeNeighborsInRadius(grid, world, centerIndex, radius, output)`
- `sampleLocalNeighborStats(grid, world, { radius, maxSampleCount, stride })`

## Metrics now produced

- `neighborCandidates`
- `avgNeighborsPerAgent`
- `neighborQueryMs` in the live overlay
- `maxNeighborsForAgent` in the live overlay

## Why this stage matters

The same query foundation will feed:

- cone and sector sensors,
- collision broad phase,
- flocking summaries,
- predator/prey interaction,
- resource pickup checks.

This step still does not implement perception or flocking. It only proves the local query layer and benchmark hook.
# qubok_evolve mutation contract

Milestone 12 introduces a dedicated phenotype parameter mutation module.

## Goal

Mutation is now separated from reproduction logic as a deterministic, testable subsystem.

## Rules

- Mutation happens at birth/reproduction boundaries, not inside the movement hot loop.
- Runtime entity state remains typed-array based.
- RNG must be injected; the subsystem must not use Math.random().
- Mutation rules are bounded by explicit min/max ranges.
- A mutation can be disabled with probability = 0 without consuming RNG draws.
- Morphology placement/add/remove mutation remains locked until the blueprint compiler and validation layer exist.

## Current scope

Implemented:

- scalar Gaussian mutation
- probability gate
- deterministic RNG use
- clamping
- integer option
- parameter block mutation
- default simple phenotype rules

Not implemented yet:

- body grid mutation
- component add/remove mutation
- crossover
- symmetry-aware limb/fins mutation
- mutation history serialization into lineage UI
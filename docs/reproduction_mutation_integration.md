# qubok_evolve reproduction/mutation integration

Milestone 13 connects reproduction to the dedicated phenotype mutation module from milestone 12.

## Goal

Reproduction no longer owns ad-hoc mutation code. It now builds a parameter block, passes it through `mutateParameterBlock()`, then spawns a child from the mutated phenotype.

## Current mutable phenotype fields

- radius
- mass
- drag
- maxSpeed
- turnRate
- metabolism
- maxEnergy
- maxStamina
- health
- armor
- mouthPower
- landThrust
- waterThrust
- flowAffinity
- terrainAffinity
- visionRadius
- visionCosHalfCone

## Invariants

- Mutation still happens only at birth, not inside the movement hot loop.
- Morphology mutation is still locked.
- Component add/remove/move mutation is still locked.
- RNG is injected and deterministic.
- Runtime remains typed-array based.

## Why this matters

This creates the first clean bridge between survival/reproduction and later evolution. From now on, phenotype rules can be tuned in `mutation.ts` without editing reproduction logic.
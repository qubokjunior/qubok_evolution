# qubok_evolve reproduction threshold

Milestone 11 adds the first reproduction subsystem.

## Purpose

This is not morphology mutation yet. It is only the survival-loop bridge between energy and population growth.

## Rules

An agent can reproduce when:

- alive = 1
- energy >= energyThreshold
- age >= minAgeSeconds
- world.count < world.capacity
- maxBirthsPerStep has not been reached

Birth creates a new runtime slot with inherited phenotype data and small bounded mutation.

## Runtime constraints

- no Entity classes
- no React state
- no Pixi imports
- deterministic RNG only
- structural change is limited to birth-time append through `spawnAgent`
- newborns do not reproduce in the same step because iteration uses the original count

## Current mutation scope

Mutated traits:

- radius
- mass
- drag
- maxSpeed
- turnRate
- metabolism
- maxEnergy
- maxStamina
- armor
- mouthPower
- landThrust
- waterThrust
- flowAffinity
- terrainAffinity
- visionRadius
- visionCosHalfCone

Unchanged traits for now:

- componentFlags
- archetypeId
- speciesId
- dietMask
- colorRGBA

Morphology placement/add/remove mutation remains locked until the compiler and validation layer exist.
## m23 obstacle-aware offspring placement

`applyReproduction()` accepts optional obstacle spawn validation:

| Config | Purpose |
|---|---|
| `obstacleMask` | occupied-cell source |
| `offspringSpawnMaxAttempts` | local attempts before fallback |
| `offspringClearanceRadius` | extra clearance around child position |

New stats track blocked obstacle placement and fallback usage.

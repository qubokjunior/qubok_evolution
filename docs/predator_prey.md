# qubok_evolve predator/prey interaction

Milestone 14 adds the first predator/prey interaction module.

## Goal

This is a local broad-phase interaction system using the existing spatial hash and radius-neighbor query. It is not a physics engine and it does not raycast.

## Runtime contract

- No Entity classes.
- No React state.
- No Pixi import in `src/sim`.
- Predator/prey state is stored in existing `WorldState` typed arrays.
- Diet is represented by `dietMask` bits.
- Attacks are local spatial-hash queries.
- Dead prey is marked by `alive[index] = 0`.

## Diet bits

- `DIET_PLANT = 1`
- `DIET_MEAT = 2`
- `DIET_OMNIVORE = 3`

## Current interaction model

For each alive predator candidate:

1. Check predator diet bit.
2. Query nearby agents through `forEachNeighborInRadius`.
3. Reject same-species targets when protection is enabled.
4. Reject targets without prey diet bit.
5. Attack nearest valid prey.
6. Apply mouthPower-based damage reduced by armor.
7. Transfer energy from damage and optionally from prey corpse energy.
8. Increment kill counters and fitness when prey dies.

## Not included yet

- Cone/vision gating.
- Brain decision output.
- Attack cooldown buffer.
- Specialized predator/prey archetypes.
- Terrain or line-of-sight blocking.

Those come after sensor schema and brain/controller work.
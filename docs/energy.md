# qubok_evolve energy / hunger / death milestone

Milestone 10 adds the first explicit survival loop.

## Contract

- Energy is runtime typed-array data on `WorldState.energy`.
- Health is runtime typed-array data on `WorldState.health`.
- Death is a flag change on `WorldState.alive[index]`; no entity object is created or destroyed in the hot loop.
- Movement can spend energy, resources can restore energy, and `energy.ts` applies starvation damage and death.
- The simulation remains deterministic for a fixed seed and fixed delta sequence.

## Current order in demo simulation

1. Apply demo steering forces.
2. Step movement.
3. Rebuild spatial hash.
4. Sample local neighbor summaries.
5. Rebuild resource grid.
6. Consume resources.
7. Apply energy survival: starvation, damage, death.
8. Produce render snapshot.

This order lets food pickup rescue low-energy agents before starvation damage is applied in the same tick.
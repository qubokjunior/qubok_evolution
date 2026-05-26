# qubok_evolve resources contract

Milestone 9 adds the first food/resource layer.

## Files

- `src/sim/resources.ts`
- `scripts/test-resources.mjs`
- `scripts/bench-resources.mjs`

## Runtime model

Resources are not entity objects. They use typed arrays:

- `x`, `y`
- `energy`
- `radius`
- `kindId`
- `alive`
- `cellHeads`, `next` for a resource-local uniform grid

## Current behavior

- Resources spawn deterministically from seed-derived RNG.
- Resource grid is rebuilt once per simulation step.
- Agents can consume nearby resources if they are below max energy.
- Consumed resources are marked dead and respawned up to a target count.
- Energy transfer is capped by agent missing energy.
- `world.foodEaten` accumulates transferred energy.

## Metrics

- `resourceMs`
- `food alive`
- `food target`
- `food eaten`
- `food energy`

## Non-goals for this step

- No plants ecology yet.
- No reproduction threshold yet.
- No predator/prey roles yet.
- No smell fields yet.
- No rendering of food particles yet; this step proves the sim/resource loop and metrics first.
## m22 obstacle-aware resource spawning

Resources can now be spawned through `spawnRandomResourcesAvoidingObstacles()` and respawned through `respawnResourcesToTargetAvoidingObstacles()`. The resource layer itself remains unchanged; validation lives in `spawnValidation.ts`.

# runtime contract

## Current milestone

Milestone 1 has no simulation runtime yet. It only creates the render shell and module boundaries.

## Future runtime state

Entity data will use structure-of-arrays storage:

- hot arrays: `x`, `y`, `vx`, `vy`, `fx`, `fy`, `headingX`, `headingY`, `energy`, `stamina`, `health`, `alive`
- warm arrays: terrain sample, flow sample, sector summaries, local neighbor summaries
- cold arrays: fitness, genealogy, age, historical counters

## Determinism

- All future stochastic behavior must use seedable random generators from `src/sim/rng.ts`.
- No `Math.random()` in simulation modules.
- Replay must be reconstructable from seed, config, and snapshot.

## Performance contract

Every performance-sensitive subsystem needs:

- one correctness test or smoke test,
- one benchmark hook,
- metrics surfaced to debug UI when useful.

# m29 integration: death-path consistency audit

Milestone 29 hardens the lifecycle contract introduced by m26 and exercised by m28.

## Problem guarded

After free-list slot reuse exists, a runtime system must not kill agents by writing directly to `world.alive[index] = 0`.

Direct alive-zero writes bypass `killAgent(world, index)`, so the dead slot would not enter `reusableSlots`. That reintroduces the old append-only capacity failure under a different form.

## Implementation

m29 adds `scripts/test-death-path-audit.mjs`.

The test scans `src/sim/*.ts` for direct alive-zero writes outside `src/sim/world.ts`.

Allowed:

- `src/sim/world.ts`, where `killAgent()` owns the low-level alive bit write.

Forbidden in runtime systems:

- `world.alive[index] = 0`
- `someWorld.alive[targetIndex] = 0`
- local `alive[index] = 0` death shortcuts outside the world module.

The test also verifies that the two known runtime death paths still call `killAgent()`:

- energy starvation death in `energy.ts`
- predator/prey kills in `predatorPrey.ts`

## Acceptance

- `npm run test:death-path-audit`
- `npm run test`
- `npm run build`
- `npm run bench:world-free-list`

## Explicitly not changed

- no new biology
- no controller/brain
- no terrain editor
- no pathfinding
- no renderer refactor
- no worker migration
- no world compaction

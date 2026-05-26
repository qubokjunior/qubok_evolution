# m26 integration: world dead-slot reuse

Milestone 26 adds deterministic free-list reuse for dead agent slots in `WorldState`.

## Problem fixed

Before m26, lifecycle storage was append-only:

- `spawnAgent()` appended at `world.count`;
- `killAgent()` only wrote `alive[index] = 0`;
- reproduction treated `world.count >= world.capacity` as a hard capacity block.

In long-running simulations this could produce:

- high historical `entities`;
- much lower `alive`;
- high `repro elig`;
- high `birth block`;
- `births = 0`.

That meant ecological space existed, but structural slots could not be reused.

## Runtime change

`WorldState` now owns a deterministic free-list:

- `reusableSlots: Uint32Array`;
- `reusableSlotFlags: Uint8Array`;
- `reusableSlotCount`;
- `spawnReusedSlotCount`;
- `spawnAppendedSlotCount`.

`killAgent(world, index)` now queues a slot for reuse only once. Repeated kill calls on the same dead slot are no-ops.

`spawnAgent(world, input)` now:

1. reuses a dead slot if `reusableSlotCount > 0`;
2. otherwise appends when `world.count < world.capacity`;
3. throws only when neither route is available.

No compaction is performed. Historical slot indices remain stable, so render and simulation code continue to use `alive[index]` as the visibility/activity mask.

## Reproduction change

`applyReproduction()` now checks `canSpawnAgent(world)`. Reproduction can create a child when `world.count == world.capacity` if at least one reusable dead slot exists.

`blockedByCapacity` now means:

- no append capacity, and
- no reusable dead slot.

## Acceptance

Expected verification commands:

```powershell
npm run test
npm run build
npm run bench:world-free-list
```

Expected benchmark token:

```json
{
  "bench": "world-free-list:m26"
}
```

## Explicitly not changed

- no terrain editor;
- no brain/controller;
- no pathfinding;
- no signed distance field;
- no WebGPU;
- no worker migration;
- no Pixi renderer refactor;
- no per-entity classes;
- no React-owned entity state.

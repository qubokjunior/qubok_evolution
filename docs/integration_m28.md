# m28 integration: lifecycle pressure scenario

Milestone 28 closes the loop exposed by m26 and m27.

m26 added dead-slot reuse to `WorldState`, and m27 exposed that reuse through render snapshots, Pixi metrics, and overlay rows. m28 verifies that real runtime deaths also feed the same free-list, not only direct calls to `killAgent()` in tests.

## Problem fixed

Some lifecycle systems still killed agents by writing `alive[index] = 0` directly. That made the agent disappear, but it bypassed the m26 free-list and therefore did not create a reusable slot.

That was dangerous because the live ecosystem could still reach this pattern:

- `world.count == world.capacity`
- agents die through starvation or predator/prey interaction
- `aliveCount` falls
- `reusableSlotCount` does not rise
- reproduction remains structurally blocked

## m28 changes

- Energy/starvation deaths now call `killAgent(world, index)`.
- Predator/prey kills now call `killAgent(world, preyIndex)`.
- `test:lifecycle-pressure` creates a full-capacity controlled demo scenario where one agent dies and one eligible parent reproduces in the same tick.
- The test verifies the full loop: `death -> reusable slot -> birth`.

## Acceptance

Run:

```powershell
npm run test:lifecycle-pressure
npm run test
npm run build
npm run bench:world-free-list
```

The controlled lifecycle-pressure test should prove that a runtime death creates a reusable slot and that reproduction consumes it without appending beyond capacity.

## Explicitly not changed

- no new brain/controller
- no terrain editor
- no pathfinding
- no signed distance field
- no WebGPU
- no worker migration
- no renderer refactor beyond existing m27 telemetry usage

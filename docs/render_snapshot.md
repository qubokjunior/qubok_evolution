# qubok_evolve render snapshot contract

Milestone 5 replaces renderer-owned demo particles with snapshots produced from the typed-array WorldState.

## Contract

- `src/sim` still contains no PixiJS and no UI imports.
- The simulation owns `WorldState` typed arrays.
- `makeRenderSnapshot(world)` returns a read-only view over the active `[0..count)` range.
- The renderer consumes only snapshot fields needed for drawing: position, heading, radius, energy, alive flag, species and color.
- Current milestone runs simulation on the main thread for simplicity. Worker ownership comes later.

## Current demo scale

- Browser demo: 1536 agents.
- Benchmark: 4096 agents for 600 deterministic ticks.

## Why this exists

This is the first real connection between the data-oriented runtime and PixiJS. The old renderer-local animation is removed so future rendering can consume worker snapshots without changing simulation data layout.
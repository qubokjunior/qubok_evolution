# qubok_evolve performance metrics bus

Milestone 6 adds a small shared metrics bus used by the renderer/debug overlay and future simulation subsystems.

## Current contract

- The metrics bus lives in `src/shared/perfMetrics.ts`.
- It has no PixiJS, no React and no editor imports.
- It tracks latest, average, minimum, maximum, total and count per metric.
- It already reserves the metric names needed by later milestones: spatial grid, neighbor queries, brain, terrain, fields, worker transfer and ecology throughput.
- Renderer/debug UI consumes a snapshot; simulation state is still not placed in UI state.

## Metrics reserved from the project performance ladder

- `simMsPerTick`
- `renderMsPerFrame`
- `gridBuildMs`
- `neighborCandidates`
- `avgNeighborsPerAgent`
- `brainMs`
- `terrainMs`
- `fieldMs`
- `workerTransferMs`
- `peakMemoryMB`
- `birthsPerSecond`
- `deathsPerSecond`
- `generationDuration`
- `diversityScore`
- `extinctionCount`

## Current overlay

The browser overlay now shows:

- fps
- frame time
- render time
- sim tick time
- entity count
- alive count
- average energy
- tick
- integrated movement count

This prepares the project for the next milestone: uniform grid / spatial hash, where `gridBuildMs`, `neighborCandidates` and `avgNeighborsPerAgent` become real measurements.
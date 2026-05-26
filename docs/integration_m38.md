# m38 integration: terrain-aware reproduction placement

Primary track: terrain/material.

## Goal

m38 connects terrain sampling to offspring placement. Reproduction can now bias child spawn candidates toward more suitable habitat while preserving the existing obstacle-aware placement path.

## Runtime changes

- `applyReproduction` accepts `terrain?: TerrainLayer`.
- `offspringTerrainMaxAttempts` controls terrain-biased candidate attempts.
- `offspringTerrainMinAcceptance` prevents hard zero-acceptance dead zones.
- Offspring placement samples candidate terrain and accepts using a habitat score derived from movement cost, resource affinity, friction, and parent `terrainAffinity`.
- Obstacle validation remains active when `obstacleMask` is passed.
- Parent energy is spent only after a valid child position is found.

## Metrics and debug overlay

m38 adds reproduction terrain metrics:

- `terrainOffspringSampleCount`
- `terrainOffspringAffinitySum`
- `terrainOffspringRejectedCount`

The Pixi renderer records these metrics and the debug overlay displays them as terrain child samples, affinity, and rejected candidates.

## Boundary notes

The simulation layer owns terrain-aware child placement. The renderer receives metrics and snapshots only. PixiJS remains confined to `src/render`.

## Validation

- `test:terrain-reproduction-placement` verifies terrain-biased offspring placement, terrain + obstacle placement, stat accumulation, and invalid config handling.
- demo integration validates terrain reproduction wiring, metrics, overlay labels, and render boundary preservation.

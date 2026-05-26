# qubok_evolve sensors contract

Milestone 15 adds the first agent perception pass.

## Scope

The sensor system is still CPU, deterministic and data-oriented:

- no raycasts per entity,
- no object components in the hot loop,
- no PixiJS or React imports in `src/sim`,
- local lookup comes from `spatialHash + neighborQuery`,
- each entity writes into fixed-width sector buffers already owned by `WorldState`.

## Current channels

For every alive agent with `visionRadius > 0`:

- radius query gathers local neighbors,
- cone test uses heading dot direction and `visionCosHalfCone`,
- `sectorAlly` receives same-species neighbor signal,
- `sectorThreat` receives different-species neighbor signal,
- `averageNeighborHeadingX/Y` stores normalized local heading average,
- `localCentroidX/Y` stores visible-neighbor centroid,
- `separationX/Y` stores a simple repulsion vector.

`sectorFood` and `sectorObstacle` are cleared but not filled yet. Food-sector aggregation belongs to the resource/perception integration step. Obstacle sectors belong to terrain.

## Sector convention

For `sectorCount = 8` and heading along +X:

- sector 0 = forward,
- sector 2 = left,
- sector 4 = behind,
- sector 6 = right.

This keeps the future brain input width fixed even when neighbor count changes.
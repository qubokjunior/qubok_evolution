# terrain and fields

## Terrain layers

- material grid: movement cost, fertility, habitat type,
- obstacle mask: blocked cells,
- signed distance field: cheap push-out and obstacle gradient.

## Field layers

Initial fluid-like behavior uses fields, not full fluid simulation:

- `flowX`, `flowY`,
- food smell,
- danger smell,
- pheromone,
- nutrients,
- fertility,
- temperature.

## Later branches

Stable Fluids, WebGPU compute, and high-resolution transport are research branches after the CPU field system is benchmarked.
## m19 minimal obstacle mask

m19 introduces a minimal `ObstacleMask` as a typed-array occupancy grid:

| Field | Type | Purpose |
|---|---|---|
| `occupied` | `Uint8Array` | 0/1 occupancy per obstacle cell |
| `cellSize` | number | obstacle grid resolution |
| `columns`, `rows` | number | grid dimensions |
| `cellCount` | number | total occupied buffer length |

The mask currently feeds `sectorObstacle` only. It does not yet apply collision response, terrain movement cost, material sampling or signed-distance-field correction.
## m20 soft obstacle response

m20 adds `applyObstacleSoftResponse()` as the first movement-facing use of `ObstacleMask`.

| Stage | Behavior |
|---|---|
| sample | reads occupied cells around each alive agent |
| response | accumulates force away from nearby occupied cells |
| boundary | optionally adds inward force near world edges |
| clamp | caps final force per agent |
| movement | writes to `world.fx/world.fy`, then existing movement integration handles velocity/position |

This is intentionally soft response, not a hard collision solver.
## m21 obstacle response sampling controls

m21 adds cheap controls for obstacle response cost:

| Control | Purpose |
|---|---|
| `boundsOnly` | skip obstacle mask cells and respond only to world borders |
| `cellStride` | sample every Nth obstacle cell in local range |
| `cellStridePhase` | stable offset for stride sampling |
| `maxObstacleCellChecksPerAgent` | hard cap for per-agent obstacle checks |

These controls trade precision for a bounded hot path while keeping `world.fx/world.fy` output stable.
## m22 obstacle-aware spawning

m22 adds spawn validation helpers that reject positions overlapping `ObstacleMask`.

| Helper | Purpose |
|---|---|
| `isPositionBlockedByObstacleMask` | test a point plus optional clearance radius |
| `findFreeRandomPosition` | random attempts then deterministic grid fallback |
| `findFreePositionNearOrRandom` | near-origin search with random fallback |
| `spawnRandomAgentsAvoidingObstacles` | creates agents only on free cells |
| `spawnRandomResourcesAvoidingObstacles` | creates resources only on free cells |
| `respawnResourcesToTargetAvoidingObstacles` | keeps food target without spawning inside obstacles |

This is placement validation only, not pathfinding or collision solving.

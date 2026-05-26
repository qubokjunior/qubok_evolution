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

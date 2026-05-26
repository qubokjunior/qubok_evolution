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

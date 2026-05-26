# m37 integration: terrain-aware sensor sampling

Primary track: terrain/material.

## Goal

m37 connects terrain sampling to the sensor pass without making sensors depend on rendering. Alive agents can sample the terrain cell beneath them on a controlled cadence, independent of whether their vision cone currently sees neighbors, food, or obstacles.

## Runtime changes

- `applyAgentSensors` accepts `terrain?: TerrainLayer`.
- `terrainTickInterval` controls terrain sensor cadence.
- Alive agents write their sampled cell into `world.terrainCellId[index]`.
- Dead agents are not sampled.
- Skipped terrain ticks preserve the last sampled `terrainCellId`.
- Sensor stats expose terrain sampling totals for movement cost, friction, drag, and resource affinity.

## Metrics and debug overlay

m37 adds terrain sensor metrics:

- `terrainSensorSampleCount`
- `terrainSensorMovementCostSum`
- `terrainSensorFrictionSum`
- `terrainSensorDragSum`
- `terrainSensorResourceAffinitySum`
- `terrainSensorScheduled`
- `terrainSensorSkippedByCadence`

The Pixi renderer records these metrics and the debug overlay can display them without requiring a hand-written row for every future metric.

## Boundary notes

The simulation layer owns terrain sampling. The renderer receives metrics and snapshots only. PixiJS remains confined to `src/render`.

## Validation

- `test:terrain-sensor-sampling` verifies cadence, alive-only sampling, terrain cell writes, stat sums, skipped tick preservation, and interval validation.
- `test:sensors` imports terrain for the upgraded sensor module.
- repo, roadmap, and demo integration status tests lock the m37 milestone wiring.

# sensor schema

## Perception default

Use radius + cone + sector aggregation.

No physical raycast per entity as the default perception model.

## Planned pipeline

1. Query nearby candidates from uniform grid.
2. Reject by radius.
3. Reject by forward cone using dot product against `visionCosHalfCone`.
4. Bin accepted entities into fixed sectors.
5. Write fixed-width sector summaries.

## Planned sector buffers

- `sectorFood`
- `sectorThreat`
- `sectorAlly`
- `sectorObstacle`
- `averageNeighborHeading`
- `localCentroid`
- `separationVector`

Fixed-width input is mandatory so brain cost does not explode with local density.

## m17 sector aggregation hardening

Milestone 17 keeps the fixed-width sector contract stable while making the existing sector buffers more meaningful for future brains.

### Populated sector channels

| channel | m17 source | meaning |
|---|---|---|
| `sectorAlly` | visible same-species agents | weighted ally/social density by angular sector |
| `sectorThreat` | visible non-same-species agents | weighted local threat pressure by angular sector |
| `sectorFood` | visible resources from `ResourceLayer` | weighted food/resource signal by angular sector |
| `sectorObstacle` | world-border proximity only | provisional obstacle channel until real terrain/obstacle masks exist |

### Weighting

All channels use proximity falloff based on `(1 - distance / radius)^2`, then multiply by a cheap local weight:

- ally: neighbor energy ratio,
- threat: neighbor mouth power, speed and armor proxy,
- food: resource energy and radius,
- obstacle: boundary proximity.

This deliberately does not change `sectorCount`. Brain inputs can keep the same fixed-width layout and later reinterpret the channel values as the controller matures.

### Current limitation

`sectorObstacle` is not terrain-aware yet. It only senses world bounds as a cheap placeholder/proxy. The later terrain milestone should replace or extend this with obstacle mask / signed distance field sampling.
## m18 warm-channel cadence

m18 keeps the fixed-width sector channel contract stable while allowing expensive warm channels to refresh less often:

| Channel | Default cadence | Buffer behavior on skipped tick |
|---|---:|---|
| `sectorAlly` | every sensor pass | cleared and recomputed |
| `sectorThreat` | every sensor pass | cleared and recomputed |
| `sectorFood` | configurable, demo default every 4 ticks | preserved by default |
| `sectorObstacle` | configurable, demo default every 8 ticks | preserved by default |

`applyAgentSensors()` accepts `tick`, `foodTickInterval`, `obstacleTickInterval`, and `preserveSkippedSectorChannels`. This changes update frequency, not brain input width.
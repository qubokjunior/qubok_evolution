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

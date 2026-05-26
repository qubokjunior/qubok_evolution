# m35 integration: terrain movement query

Milestone 35 connects the terrain query API to movement only.

## Implementation

- `stepMovement()` accepts optional `terrain: TerrainLayer`.
- Agents sample terrain at their current position before movement integration.
- Terrain drag is added to agent drag.
- Terrain friction and movement cost modulate effective max speed.
- Movement energy cost is scaled by terrain movement cost.
- Demo simulation passes its existing terrain layer into movement.
- Debug overlay exposes terrain movement sample, cost, friction, and drag metrics.

## Acceptance

- `npm run test:terrain-movement-query`
- `npm run test`
- `npm run build`

## Explicitly not changed

- no terrain editor
- no terrain resource integration
- no terrain sensor integration
- no fluid field
- no controller/brain work

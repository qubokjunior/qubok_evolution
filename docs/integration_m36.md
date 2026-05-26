# m36 integration: terrain resource affinity

Milestone 36 connects terrain resourceAffinity to resource spawning and respawning.

## Implementation

- Resource spawn validation can receive an optional terrain layer.
- Candidate resource positions sample terrain.resourceAffinity.
- Low-affinity terrain can reject candidates through bounded rejection sampling.
- Demo resource spawn and respawn pass the existing terrain layer.
- Overlay metrics expose terrain resource samples, affinity sum, and rejected candidates.

## Acceptance

- npm run test:terrain-resource-affinity
- npm run test
- npm run build

## Explicitly not changed

- no terrain editor
- no terrain sensor integration
- no fluid field
- no controller/brain work

# m31 integration: roadmap architecture tracks

Milestone 31 creates roadmap and architecture-track documentation for the next phase after m30.

## Implementation

- docs/roadmap.md splits future work into terrain/material, fluid-like field, morphology/entity editor, controller/brain, render/performance, and worker/WebGPU tracks.
- docs/architecture_tracks.md defines per-track boundaries.
- README.md links roadmap and architecture-track docs.
- scripts/test-roadmap-status.mjs keeps README, roadmap, architecture docs, and package version synchronized.
- npm run test includes test:roadmap-status.

## Acceptance

- npm run test:roadmap-status
- npm run test
- npm run build
- npm run bench:world-free-list

## Explicitly not changed

- no simulation behavior changes
- no terrain implementation
- no controller/brain implementation
- no renderer refactor
- no worker/WebGPU migration

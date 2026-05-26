# m39 integration: environmental flow field

Primary track: fluid-like field.

## Goal

m39 adds the first low-resolution environmental field layer. The field stores flow vectors and lets movement sample those vectors by world position.

## Runtime changes

- `src/sim/field.ts` defines `EnvironmentalFieldLayer` with typed-array `flowX` and `flowY` channels.
- `sampleFieldAtPosition` returns field cell id, cell coordinates, flow vector, and flow magnitude.
- `stepMovement` accepts `field?: EnvironmentalFieldLayer` and `fieldForceScale?: number`.
- Field vectors are applied to velocity before drag and speed clamping.
- Demo simulation seeds a deterministic swirl-like field and passes it into movement.

## Metrics and debug overlay

m39 adds field movement metrics:

- `fieldMovementSampleCount`
- `fieldFlowXSum`
- `fieldFlowYSum`
- `fieldFlowMagnitudeSum`

The Pixi renderer records these metrics and the debug overlay exposes them as field move/flow labels.

## Boundary notes

The field layer belongs to `src/sim`. PixiJS still receives only metrics and snapshots. M39 does not add a field render layer yet.

## Validation

- `test:field` validates field creation, cell write/add, position sampling, clamping, memory accounting, and invalid parameter handling.
- `test:movement` validates field flow integration into velocity and movement metrics.
- demo integration validates demo wiring, perf metrics, overlay labels, and render boundary preservation.

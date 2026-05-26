# m40 integration: environmental field render snapshot

Primary track: fluid-like field / render debug.

## Goal

m40 makes the low-resolution environmental flow field visible without changing the authoritative simulation model. The field remains a typed-array simulation layer, while the renderer receives a read-only vector snapshot.

## Runtime changes

- `src/sim/fieldRenderSnapshot.ts` defines `FieldRenderSnapshot`.
- `makeFieldRenderSnapshot` samples field vectors into compact arrays.
- Snapshot generation supports `stride`, `maxVectors`, and `minMagnitude` so debug rendering can be decimated.
- Demo simulation emits `fieldRenderSnapshot` alongside terrain and obstacle snapshots.

## Render changes

- Pixi renderer owns a dedicated `fieldLayer`.
- Render order is: background -> grid -> terrain -> field vectors -> obstacles -> agents.
- `renderFieldVectorLayer` draws low-alpha direction arrows from the snapshot.
- The simulation layer still does not import PixiJS.

## Metrics and overlay

m40 adds field render metrics:

- `fieldRenderMs`
- `fieldRenderVectorCount`
- `fieldRenderTruncated`

Debug overlay labels:

- `field render`
- `field vectors`
- `field trunc`

## Validation

- `test:field-render-snapshot` validates vector centers, flow channels, magnitudes, stride, min magnitude, truncation, and snapshot analysis.
- Static integration tests validate demo wiring, renderer tokens, metrics, overlay labels, and status sync.

## Scope boundary

m40 does not add field diffusion, decay, advection, editor controls, or a true fluid solver. Those remain later field-track milestones.

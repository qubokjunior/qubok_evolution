# Integration m46 - environmental field transport / advection planning

Milestone m46 starts after the closed m45 debug/config and field damping milestone. M46 stays on the fluid-like field track and focuses on environmental field transport before controller/brain work.

## Goal

M46 should make environmental fields move through space in a deterministic, low-resolution, CPU-friendly way. The first implementation target is field advection: carrying scalar/vector field values along the existing flow field so sources, sinks, damping, and diffusion can produce directional trails instead of only local blobs.

## Why this milestone now

The field track already has:

- m39: low-resolution environmental field grid sampled by movement;
- m40: field render snapshot and vector debug layer;
- m42: deterministic decay/diffusion;
- m43: sources/sinks;
- m44: source/sink semantic tuning and QA;
- m45: obstacle/terrain damping plus editable debug and preset workflow.

Advection is the next coherent field-system step because the project now has enough visualization, metrics, and config persistence to debug moving fields without introducing controller complexity.

## Definitions

- `diffusion`: spreads values outward from high concentration to neighbors.
- `decay`: reduces values over time.
- `sources/sinks`: add or remove field magnitude based on world events or entities.
- `damping`: locally absorbs or weakens field magnitude around obstacles or terrain materials.
- `advection`: transports field values along a velocity/flow vector field.
- `field force`: applies sampled field vectors to agents as movement influence.

M46 should prioritize advection. Field force is related but should remain separated behind its own API/config so the field can be transported without automatically changing agent movement rules.

## Planned scope

- add an integration design for deterministic semi-Lagrangian field advection;
- define where advection sits in the demo step order relative to sources, damping, decay, and diffusion;
- prepare a small core API for later implementation, likely `advectEnvironmentalField(...)`;
- keep advection simulation-only and renderer-agnostic;
- expose metrics names before UI work: `fieldAdvectionMs`, `fieldAdvectionSampleCount`, `fieldAdvectionMagnitudeBefore`, `fieldAdvectionMagnitudeAfter`, `fieldAdvectionMagnitudeDelta`;
- add deterministic tests before demo wiring;
- keep debug rendering based on existing field render snapshots and vector controls.

## Out of scope

- Stable Fluids pressure projection;
- incompressible velocity solve;
- vorticity confinement;
- WebGPU compute;
- controller/brain logic;
- morphology editor;
- terrain editor;
- render rewrite;
- changing existing movement semantics by default.

## Architecture decision

Use a CPU semi-Lagrangian advection pass as the first implementation. For each destination cell, trace backward through the flow field by `flow * deltaSeconds * strength`, bilinearly sample the previous field state, write into a scratch/current buffer, then apply clamp/safety rules.

This is not a full fluid solver. It is a stable transport pass for ecology/debug fields. It is intentionally lower risk than a pressure solver and fits the existing typed-array field layer.

## Proposed step order

Initial candidate order:

1. apply field sources/sinks;
2. apply obstacle/terrain damping;
3. advect field values along flow;
4. apply decay/diffusion dynamics;
5. build render/debug snapshots and metrics.

Reasoning: sources and damping create structured values first; advection transports them; diffusion/decay then smooth and attenuate the transported field. Tests should keep this order explicit so later changes are intentional.

## Core test plan

- zero-flow no-op: advection with zero flow leaves field values unchanged except accepted floating-point tolerance;
- zero-strength no-op: strength 0 leaves values unchanged;
- deterministic repeat: same field, flow, config, and delta produce identical output;
- bounds clamp: sampling outside the grid clamps or wraps according to explicit config, never reads outside arrays;
- constant-flow transport: a compact source moves in the expected direction;
- magnitude sanity: total magnitude remains bounded and does not produce NaN/Infinity;
- scratch separation: output must not read partially written values from the same pass.

## Benchmark plan

Add a focused benchmark before UI integration:

- 64 x 64 field, 1 substep;
- 128 x 128 field, 1 substep;
- optional 128 x 128 field, 2-4 substeps;
- report advection milliseconds, sampled cells, and magnitude before/after.

## Acceptance checks for M46-A0

- docs/integration_m46.md exists and defines advection scope;
- docs/roadmap.md points next field-track milestone to m46 advection;
- docs/milestones.md lists m46 as planned/in progress;
- no simulation or UI files are changed in A0.

## Next implementation slices

- M46-A1: core advection API + deterministic unit tests, no demo wiring;
- M46-A2: benchmark + metrics struct;
- M46-A3: demo wiring behind conservative config: sources/sinks -> damping -> advection -> dynamics;
- M46-A4: overlay metrics/readouts;
- M46-A5: optional editable debug controls only after core behavior is stable.

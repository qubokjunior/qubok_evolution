# Integration m47 - field-force separation planning

Milestone m47 starts after the closed m46 environmental field transport/advection milestone. M47 stays on the fluid-like field track but changes focus from moving field values to defining when and how agents may respond to environmental fields.

## Goal

M47 should separate field transport from agent movement semantics. M46 moves environmental values through space. M47 defines a small simulation-only field-force layer that samples already-updated fields and can optionally convert those samples into bounded movement influence.

Default behavior must remain unchanged unless field force is explicitly enabled by configuration.

## Why this milestone now

The field track already has:

- m39: low-resolution environmental field grid sampled by movement;
- m40: field render snapshot and vector debug layer;
- m42: deterministic decay/diffusion;
- m43: sources/sinks;
- m44: source/sink semantic tuning and QA;
- m45: obstacle/terrain damping plus editable debug and preset workflow;
- m46: deterministic field advection with demo wiring, metrics, controls, and persistence.

Field values now have enough lifecycle and visibility to be transported, inspected, and persisted. The next coherent step is to keep that transport independent from movement influence so later behavior/controller work does not silently inherit field-side assumptions.

## Definitions

- `sources/sinks`: add or remove field magnitude based on world events or entities.
- `damping`: locally absorbs or weakens field magnitude around obstacles or terrain materials.
- `advection`: transports field values along a velocity/flow vector field.
- `dynamics`: applies decay/diffusion and related field-internal updates.
- `field force`: samples a finished field state and computes an agent-local force or movement bias.

Field force is not advection. It must not mutate field buffers.

## Proposed step order

Target conceptual order:

1. apply field sources/sinks;
2. apply obstacle/terrain damping;
3. advect field values along flow;
4. apply field dynamics;
5. sample field force and optionally influence movement.

A1 may implement the field-force API and tests without demo wiring. Demo integration should only happen once no-op and disabled behavior are guarded.

## Planned scope

- add a renderer-agnostic, simulation-only field-force design;
- define the API boundary separately from existing advection and movement code;
- keep field force disabled by default or behavior-neutral without explicit config;
- ensure field force reads field values but does not write field values;
- expose bounded force output, not controller/brain decisions;
- prepare metrics names before UI work, for example `fieldForceMs`, `fieldForceSampleCount`, `fieldForceAgentCount`, `fieldForceMagnitudeTotal`, and `fieldForceClampCount`;
- add deterministic unit tests before demo wiring;
- keep UI changes out of the first slice.

## Out of scope

- controller/brain logic;
- neural response or learned behavior;
- pathfinding;
- morphology editor or body compiler work;
- terrain editor;
- Stable Fluids pressure projection or full fluid solver;
- hard collision physics;
- WebGPU compute;
- large UI panels in A0/A1;
- changing default agent movement behavior without explicit configuration.

## Architecture decision

Field force should be a post-field-update sampling layer. It should accept world state, field layer, delta time, and an explicit config, then write either temporary force accumulators or a returned force summary according to the chosen A1 design.

The first API should stay narrow and testable, likely shaped around `applyFieldForces(...)` or `sampleFieldForces(...)`. The implementation must remain inside `src/sim` and may not import PixiJS or render modules.

## Core test plan

- zero strength no-op;
- zero field no-op;
- config disabled no-op;
- deterministic repeat with the same field, agents, config, and delta;
- finite/clamped force output, with no NaN or Infinity;
- alive-only agents receive force consideration;
- dead agents are ignored;
- field buffers are not mutated;
- no direct renderer dependency;
- metrics sanity for sampled agents, magnitude, and clamps.

## Benchmark plan

Add a focused benchmark after the core API exists:

- 1k agents sampling a 64 x 64 field;
- 5k agents sampling a 128 x 128 field;
- optional 10k stress case once demo wiring is stable;
- report milliseconds, sampled agents, force magnitude, and clamp count.

## Next implementation slices

- M47-A1: core field-force API + deterministic unit tests, no demo wiring;
- M47-A2: metrics and benchmark;
- M47-A3: demo wiring behind conservative disabled/default-light config;
- M47-A4: overlay/readout QA;
- M47-A5: optional controls and persistence only after behavior is stable.

## Acceptance checks for M47-A0

- `docs/integration_m47.md` exists and defines field-force separation scope;
- `docs/roadmap.md` points the next field-track milestone to m47 field-force separation;
- `docs/milestones.md` lists m47 as planned;
- status guard checks the m47 planning document if consistent with existing repo style;
- no runtime, render, or UI behavior is changed in A0.

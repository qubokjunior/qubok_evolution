# Integration m48 - controller/brain first-pass planning

M48 starts after the closed m47 field-force separation milestone. The goal is to introduce a minimal, deterministic controller layer without turning it into a neural-network, learning, morphology, or behavior-editor milestone.

## Goal

M48 should define where agent decision logic lives, what it may read, and what it may output.

The first controller should be small, deterministic, simulation-only, and disabled or behavior-neutral by default. It should sit after sensors and environmental readouts are available, but before movement integration consumes force/intent.

## Why this milestone now

The runtime already has:

- fixed-width sector sensors;
- terrain/material sampling;
- obstacle-aware movement and sensing;
- resource, predator/prey, energy, reproduction, and lifecycle systems;
- environmental field sampling, dynamics, sources/sinks, damping, advection, and field force;
- debug overlay/readouts for terrain, field, movement, and lifecycle pressure.

This gives enough observable state to define a first controller boundary without inventing a full brain system.

## Definitions

- `controller`: deterministic simulation layer that reads agent-local observations and writes a bounded movement/behavior intent;
- `brain`: later richer decision system, possibly compositional or evolvable, but not part of M48-A0/A1;
- `intent`: compact output such as desired movement bias, aggression/avoidance scalar, or target steering signal;
- `actuator output`: bounded value consumed by existing movement/force systems.

## Proposed order

Target conceptual order:

1. update world/environment systems;
2. run sensors and local observations;
3. sample terrain/field readouts already available to agents;
4. run controller/intent pass;
5. apply forces/movement using existing movement integration;
6. keep render/debug as read-only consumers.

## Planned scope

- define a renderer-agnostic controller API under `src/sim`;
- keep first output narrow and bounded;
- preserve default behavior unless controller is explicitly enabled;
- add deterministic no-op tests before demo wiring;
- expose metrics before UI controls;
- reuse existing sensor/field/terrain data instead of adding a new perception system.

## Out of scope

- neural-network training or learning;
- genetic brain evolution;
- behavior tree editor;
- pathfinding;
- morphology compiler/editor;
- terrain editor;
- WebGPU compute;
- full fluid solver;
- large UI panels in A0/A1;
- changing default agent behavior without explicit configuration.

## Planned slices

- M48-A1: core controller/intent API + deterministic no-op tests, no demo wiring;
- M48-A2: metrics and benchmark;
- M48-A3: demo wiring behind disabled/default-light config;
- M48-A4: overlay/readout QA;
- M48-A5: optional controls/persistence only after behavior is stable.

## Acceptance checks for M48-A0

- `docs/integration_m48.md` exists and defines controller/brain scope;
- roadmap points current planning to M48 controller/brain first pass;
- milestones list M48 as planned;
- status guard checks M48 planning document;
- no runtime, render, or UI behavior is changed in A0.

# Integration m49 - controller actuator bridge

M49 starts after the closed M48 controller first pass. M48 writes deterministic intent buffers and exposes controller config, metrics, overlay/readouts, panel controls, persistence, and guards, but it intentionally does not change movement. M49 is the first behavior-changing controller milestone, so every behavior path must remain explicit, measurable, and disabled by default.

## Goal

M49 turns controller intent into an optional movement influence through a separate actuator stage.

The actuator bridge should convert `intentX`, `intentY`, and `intentMagnitude` into bounded force or movement-bias data without merging controller logic into `movement.ts`, field force, obstacle response, or demo-force setup.

## Required boundary

- keep `src/sim/controller.ts` responsible only for reading observations and writing intent;
- introduce a separate `controllerActuator` / `intentToForce` stage under `src/sim`;
- keep simulation renderer-agnostic;
- keep default behavior unchanged unless controller actuation is explicitly enabled;
- preserve all M48 controller overlay/readout and persistence surfaces;
- expose actuator metrics separately from controller metrics and field-force metrics.

## Target runtime order

Target M49 conceptual order:

1. update environment and field systems;
2. rebuild spatial/resource structures as needed;
3. run sensors and local observations;
4. run controller/intent pass;
5. run controller actuator pass into bounded movement influence;
6. integrate movement through existing movement stage;
7. run interactions, resources, energy, lifecycle, reproduction;
8. publish snapshots and read-only debug/render data.

The first implementation may keep the existing demo order if changing order would be too risky, but the integration guard must still prove that controller output is only consumed by an explicit actuator stage, not by accidental direct wiring.

## Planned slices

- M49-A0: integration scope document and guard updates, no runtime behavior change.
- M49-A1: core `controllerActuator` / `intentToForce` API with deterministic no-op tests, no demo wiring.
- M49-A2: actuator metrics and benchmark for controller + actuator cost.
- M49-A3: demo wiring behind disabled/default-neutral config.
- M49-A4: overlay/readout QA for actuator metrics.
- M49-A5: optional panel controls and persistence after behavior and metrics are stable.
- M49-final: version/status/docs close and full validation.

## Required config shape

Initial config should be small and bounded:

- `enableControllerMovementInfluence`: default `false`;
- `controllerForceScale`: default safe low value;
- `controllerMaxForce`: finite positive clamp;
- optional `controllerBlendWithDemoForces`: default should preserve current demo behavior unless explicitly enabled.

## Required metrics

Actuator metrics should be distinct from controller metrics:

- actuator enabled flag;
- actuator step milliseconds;
- considered agent count;
- affected agent count;
- zero-intent count;
- clamp count;
- total applied force magnitude;
- max applied force magnitude.

## Required tests

- disabled actuator produces identical movement baseline;
- zero intent is no-op;
- non-finite config or output is rejected;
- force output is finite and clamped;
- only alive agents are affected;
- actuator does not mutate sensors, field buffers, or controller intent buffers;
- deterministic repeat with identical world/controller output/config;
- demo integration guard proves default disabled behavior;
- guard proves controller output is not passed directly into movement without the actuator stage.

## Required debug and UI

- overlay labels for actuator milliseconds, affected count, clamp count, total force magnitude, and max force magnitude;
- optional intent-vector visual layer separate from environmental field vectors and agent-field influence debug;
- right-panel controls only after core API, tests, benchmark, and demo guard are stable;
- persistence only after controls are stable.

## Out of scope

- learning or neural-network training;
- genetic brain evolution;
- behavior tree editor;
- morphology/component editor;
- pathfinding;
- ecology pressure calibration, except for preserving metrics needed by later M50;
- sensor budgeting, except for preserving controller compatibility with existing sensor buffers;
- render rewrite, workerization, WebGPU, or full fluid solver.

## Acceptance checks for M49-A0

- `docs/integration_m49.md` exists and defines actuator bridge scope;
- roadmap points current planning to M49 actuator bridge;
- milestones list M49 as planned;
- status guards check M49 planning document;
- no runtime, render, or UI behavior is changed in A0.

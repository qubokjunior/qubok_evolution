# Integration m49 - controller actuator bridge

M49 starts after the closed M48 controller first pass. M48 writes deterministic intent buffers and exposes controller config, metrics, overlay/readouts, panel controls, persistence, and guards, but it intentionally does not change movement. M49 is the first behavior-changing controller milestone, so every behavior path must remain explicit, measurable, and disabled by default.

## Current status

M49-A0 is complete: planning document, roadmap/milestone references, and guard scope exist.

M49-A1 core API is complete without demo wiring:

- `src/sim/controllerActuator.ts` defines the renderer-agnostic actuator boundary;
- `CONTROLLER_ACTUATOR_VERSION` is `qubok_evolve.controller_actuator.m49`;
- `applyControllerActuator(...)` converts controller intent arrays into bounded force writes;
- default config keeps movement influence disabled;
- `scripts/test-controller-actuator.mjs` covers disabled no-op, config clamping, alive-only application, force clamping, determinism, output capacity guard, non-finite intent guard, and intent-buffer non-mutation;
- `package.json` exposes `test:controller-actuator` and includes it in `npm run test`.

M49-A2 benchmark exposure is complete without demo wiring:

- `scripts/bench-controller-actuator.mjs` benchmarks actuator-only cost at 1k/5k/10k agents;
- `package.json` exposes `bench:controller-actuator`;
- benchmark output reports average step time, agent count, sample count, affected count, zero intent count, clamp count, total force magnitude, and max force magnitude.

M49-A3 demo wiring is implemented behind disabled/default-neutral config:

- `src/sim/demoSimulation.ts` imports and calls `applyControllerActuator(...)`;
- `DEFAULT_ENABLE_CONTROLLER_MOVEMENT_INFLUENCE = false` keeps default behavior neutral;
- demo result exposes `controllerActuatorStats`, `controllerActuatorConfig`, and `controllerActuatorMs`;
- demo handle exposes `getControllerActuatorConfig()` and `updateControllerActuatorConfig(...)` for later UI/persistence slices;
- `scripts/test-controller-integration.mjs` guards actuator ordering, default-disabled state, and no direct controller-output-to-movement wiring.

No render overlay, panel, or persistence wiring is added in A3. Those remain M49-A4/A5.

## Goal

M49 turns controller intent into an optional movement influence through a separate actuator stage.

The actuator bridge converts `intentX`, `intentY`, and `intentMagnitude` into bounded force data without merging controller logic into `movement.ts`, field force, obstacle response, or demo-force setup.

## Required boundary

- keep `src/sim/controller.ts` responsible only for reading observations and writing intent;
- keep `src/sim/controllerActuator.ts` responsible only for converting intent to bounded force influence;
- keep simulation renderer-agnostic;
- keep default behavior unchanged unless controller actuation is explicitly enabled;
- preserve all M48 controller overlay/readout and persistence surfaces;
- expose actuator metrics separately from controller metrics and field-force metrics.

## Runtime order

Current A3 demo order keeps the existing pipeline shape for low-risk integration:

1. apply demo forces;
2. apply obstacle response;
3. update field sources/sinks, damping, advection, dynamics, and field-force;
4. apply controller actuator using the current `controllerOutput` buffer;
5. run movement;
6. rebuild spatial/resource structures;
7. run sensors;
8. run controller/intent pass for the next tick;
9. run predator/prey, resources, energy, reproduction;
10. publish snapshots and read-only debug/render data.

Important implication: until a later order-refinement slice changes this, controller actuation uses the previous available controller output. The default-disabled actuator keeps baseline behavior unchanged.

Target final M49 conceptual order remains:

`environment -> spatial/resource rebuild -> sensors -> controller -> actuators/forces -> movement -> interactions -> lifecycle/reproduction -> snapshots`.

## Planned slices

- M49-A0: integration scope document and guard updates, no runtime behavior change. Complete.
- M49-A1: core `controllerActuator` / `intentToForce` API with deterministic no-op tests, no demo wiring. Complete.
- M49-A2: actuator metrics and benchmark for controller + actuator cost. Complete.
- M49-A3: demo wiring behind disabled/default-neutral config. Complete.
- M49-A4: overlay/readout QA for actuator metrics.
- M49-A5: optional panel controls and persistence after behavior and metrics are stable.
- M49-final: version/status/docs close and full validation.

## Config shape

Initial config is small and bounded:

- `enableControllerMovementInfluence`: default `false`;
- `controllerForceScale`: finite non-negative force multiplier;
- `controllerMaxForce`: finite non-negative force clamp;
- `minActiveIntentMagnitude`: finite non-negative threshold for ignoring tiny intent.

## Actuator metrics

Core actuator metrics are distinct from controller metrics:

- enabled flag;
- world tick;
- agent count;
- sample count;
- affected agent count;
- ignored dead count;
- zero-intent count;
- clamp count;
- total force X/Y;
- total force magnitude;
- max force magnitude;
- total input intent magnitude.

Benchmark-visible metrics:

- average step milliseconds;
- agent count;
- sample count;
- affected agent count;
- zero-intent count;
- clamp count;
- total force magnitude;
- max force magnitude.

## Required tests

A1 test coverage:

- disabled actuator is no-op;
- zero scale is no-op;
- non-finite config is rejected;
- output capacity smaller than world count is rejected;
- non-finite intent is rejected;
- force output is finite and clamped;
- only alive agents are affected;
- small intent can be ignored through threshold;
- controller intent buffers are not mutated;
- deterministic repeat with identical world/controller output/config.

A3 guard coverage:

- demo integration includes controller actuator config/readout surfaces;
- controller actuator runs after field force and before movement;
- controller actuator remains disabled by default;
- controller output is not passed directly into movement.

Remaining M49 tests for later slices:

- render/overlay guard for actuator metrics;
- panel/persistence guard after controls exist.

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

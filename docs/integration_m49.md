# Integration m49 - controller actuator bridge

## Final status

M49 is closed.

M49 turns M48 controller intent into an optional movement influence through a separate renderer-agnostic actuator stage. The actuator remains disabled by default and behavior-changing only when `enableControllerMovementInfluence` is explicitly enabled.

## Implemented scope

- `src/sim/controllerActuator.ts` defines the renderer-agnostic actuator boundary;
- `CONTROLLER_ACTUATOR_VERSION` is `qubok_evolve.controller_actuator.m49`;
- `applyControllerActuator(...)` converts `intentX`, `intentY`, and `intentMagnitude` into bounded force writes;
- default config keeps movement influence disabled;
- `scripts/test-controller-actuator.mjs` covers disabled no-op, config clamping, alive-only application, force clamping, determinism, output capacity guard, non-finite intent guard, and intent-buffer non-mutation;
- `scripts/bench-controller-actuator.mjs` benchmarks actuator-only cost at 1k/5k/10k agents;
- demo wiring exists behind `DEFAULT_ENABLE_CONTROLLER_MOVEMENT_INFLUENCE = false`;
- demo result exposes `controllerActuatorStats`, `controllerActuatorConfig`, and `controllerActuatorMs`;
- demo handle exposes `getControllerActuatorConfig()` and `updateControllerActuatorConfig(...)`;
- Pixi renderer records controller actuator metrics into the shared performance bus;
- debug overlay groups and labels `controllerActuator*` metrics under controller;
- `src/ui/controllerActuatorPanel.ts` exposes a collapsed-by-default actuator panel;
- `src/sim/controllerActuatorConfigPersistence.ts` stores actuator config under `qubok_evolve.controller_actuator_config.v1`;
- `src/ui/App.ts` loads, applies, saves, and destroys the actuator panel/persistence path;
- status guards close M49 on `0.1.0-milestone.49`.

## Runtime order

Current M49 demo order keeps the existing pipeline shape for low-risk integration:

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

Important implication: M49 demo actuation uses the previous available controller output. The default-disabled actuator keeps baseline behavior unchanged. A later order-refinement slice may move toward:

`environment -> spatial/resource rebuild -> sensors -> controller -> actuators/forces -> movement -> interactions -> lifecycle/reproduction -> snapshots`.

## Config shape

- `enableControllerMovementInfluence`: default `false`;
- `controllerForceScale`: finite non-negative force multiplier;
- `controllerMaxForce`: finite non-negative force clamp;
- `controllerMinActiveIntentMagnitude`: finite non-negative threshold for ignoring tiny intent.

## Actuator metrics

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

## Final validation set

```powershell
npm run test:repo-status
npm run test:roadmap-status
npm run test:controller
npm run test:controller-actuator
npm run bench:controller-actuator
npm run test:controller-integration
npm run test:controller-overlay-qa
npm run test:controller-panel
npm run test:controller-config-persistence
npm run test:demo-integration
npm run build
```

## Known limits after close

- actuator is default-disabled and must be explicitly enabled to affect motion;
- current demo order uses the previous available controller output;
- ecology pressure still needs calibration before behavior quality can be evaluated;
- sensor pass remains a known hotspot;
- debug render layers still need throttling/cache in later performance work;
- Vite chunk warning is known and belongs to the M57 code-splitting/performance split.

## Out of scope

- learning or neural-network training;
- genetic brain evolution;
- behavior tree editor;
- morphology/component editor;
- pathfinding;
- ecology pressure calibration;
- sensor budgeting;
- render rewrite, workerization, WebGPU, or full fluid solver.

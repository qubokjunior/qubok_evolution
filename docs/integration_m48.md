# Integration m48 - controller/brain first pass

## Final status

M48 is closed.

M48 adds the first deterministic controller boundary as a renderer-agnostic, behavior-neutral observation and configuration layer. It does not actuate controller intent into movement. The actuator bridge is intentionally deferred to M49.

## Goal

M48 defines where agent decision logic lives, what it may read, and what it may output.

The first controller is small, deterministic, simulation-only, and disabled by default. It runs after sensors are available in the current demo pipeline and writes bounded intent buffers that can be inspected, benchmarked, persisted through config, and rendered through overlay readouts.

## Implemented scope

- renderer-agnostic controller API under `src/sim/controller.ts`;
- controller version marker: `qubok_evolve.controller.m48`;
- deterministic output arrays: `intentX`, `intentY`, `intentMagnitude`;
- bounded config: enable, strength, max intent, food weight, threat weight, flow weight;
- deterministic tests for default disabled behavior, clamping, alive-only processing, zero intent, invalid finite checks, and repeatability;
- benchmark script exposed as `bench:controller`;
- demo wiring behind `DEFAULT_ENABLE_CONTROLLER = false`;
- controller metrics and overlay/readouts;
- controller panel with collapsed-by-default controls;
- config persistence through `qubok_evolve.controller_config.v1`;
- status and roadmap guards updated for M48 closure;
- `docs/project_overview.md` added as source-material overview for the project.

## Runtime boundary

M48 writes intent only. It does not call `addForce`, does not pass controller output into `stepMovement`, and does not change default agent behavior.

Current M48 demo ordering relevant to the controller:

1. environment/field/terrain/resource foundations run according to the existing demo pipeline;
2. sensors run and fill fixed-width readout buffers;
3. `stepAgentController(...)` reads sensor/flow channels and writes intent buffers;
4. predator/prey, resources, energy, reproduction, and snapshots continue through the existing pipeline;
5. renderer/UI consume metrics and snapshots read-only.

M49 owns the final behavior order for actuated control:

`environment -> spatial/resource rebuild -> sensors -> controller -> actuators/forces -> movement -> interactions -> lifecycle/reproduction -> snapshots`.

## Why this milestone exists

Before M48, the runtime already had:

- fixed-width sector sensors;
- terrain/material sampling;
- obstacle-aware movement and sensing;
- resource, predator/prey, energy, reproduction, and lifecycle systems;
- environmental field sampling, dynamics, sources/sinks, damping, advection, and field force;
- debug overlay/readouts for terrain, field, movement, lifecycle pressure, and render cost.

That made it safe to define a controller boundary without also introducing neural evolution, behavior editing, morphology compilation, or movement actuation.

## Out of scope

- wiring controller intent into movement or forces;
- neural-network training or learning;
- genetic brain evolution;
- behavior tree editor;
- pathfinding;
- morphology compiler/editor;
- terrain editor;
- WebGPU compute;
- full fluid solver;
- changing default agent behavior without explicit configuration.

## Final validation set

M48-final should be validated with:

```powershell
npm run test:repo-status
npm run test:roadmap-status
npm run test:controller
npm run test:controller-panel
npm run test:controller-config-persistence
npm run test:controller-integration
npm run test:controller-overlay-qa
npm run test:demo-integration
npm run build
```

Optional benchmark:

```powershell
npm run bench:controller
```

## Known limits after close

- controller output is observable and configurable, but not actuated;
- ecology pressure still needs calibration before behavior quality can be evaluated;
- sensor cost remains a known hotspot;
- debug render layers still need throttling/cache in later performance work;
- Vite chunk warning is known and belongs to the M57 code-splitting/performance split.

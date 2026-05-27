# qubok_evolve project overview

`docs/project_overview.md` is the compact source-material document for the repository. It describes the current technical state and the intended next milestones; it is not a chat note or a runtime feature spec.

## Project goal

qubok_evolve is a high-performance realtime 2D artificial-life ecosystem simulator. The target is a deterministic browser-first simulation where many agents, resources, terrain layers, environmental fields, sensors, reproduction, mutation, controller logic, actuator influence, and later morphology systems can be observed and tuned without turning the simulation hot path into a UI/game-object scene.

The practical direction is:

- realtime 2D ecosystem simulation;
- artificial-life behavior emerging from energy, sensors, environment, reproduction, mutation, predation, terrain, fields, controller intent, and explicit actuator influence;
- data-oriented runtime that can scale before visual complexity is added;
- debug-first workflow where every new system exposes metrics, tests, and validation guards.

## Architecture

### Module map

- `src/sim` owns authoritative simulation state and deterministic runtime systems.
- `src/render` owns PixiJS rendering, debug layers, snapshots, and overlay readouts.
- `src/ui` owns panels, app wiring, user controls, and persistence glue.
- `src/shared` owns cross-boundary constants and shared observability surfaces such as app version and performance metrics.
- `scripts` contains Node-based tests, static status guards, integration checks, and benchmarks.
- `docs` contains milestone notes, integration documents, architecture rules, and roadmap material.

### Runtime model

The simulation uses typed arrays and renderer-agnostic data flow. Agent state is stored in `WorldState` arrays rather than per-agent objects. Systems read and write bounded data structures, and render/UI layers consume snapshots or metrics rather than owning simulation truth.

Core architectural invariants:

- simulation remains renderer-agnostic;
- PixiJS stays outside `src/sim`;
- UI state does not become authoritative entity state;
- deterministic tests precede demo wiring;
- runtime features are milestone-isolated;
- debug and performance metrics are part of the feature definition, not optional polish.

## Implemented systems

### World and lifecycle

- typed-array `WorldState` with position, velocity, force, heading, survival values, phenotype fields, sensor buffers, lineage fields, and fitness-adjacent counters;
- deterministic spawning and lifecycle counters;
- `killAgent` death path and free-list dead-slot reuse, so dead slots can become structural capacity for later births;
- world slot telemetry for `world.count`, alive count, free slots, append spawns, and reused spawns.

### Spatial and local interaction

- spatial hash foundation;
- neighbor query and local sampling;
- fixed-width sector sensor buffers;
- predator/prey local interaction using spatial proximity, diet masks, damage, armor, kills, and energy transfer.

### Resources, energy, reproduction, mutation

- resource layer with spatial indexing, alive counts, pickup, and respawn;
- energy survival, starvation/death path, and health-based death path;
- reproduction with energy/age/capacity gates, maximum births per step, obstacle-aware and terrain-aware placement;
- bounded phenotype mutation rules for existing numeric traits.

### Obstacles and terrain

- obstacle mask used by sensing, soft movement response, spawn validation, reproduction placement, lifecycle telemetry, and debug rendering;
- terrain/material typed-array layer;
- terrain render snapshot and Pixi debug render layer;
- terrain movement query integration using material friction, drag, and movement cost;
- terrain resource-affinity spawning and respawning;
- terrain-aware sensors and terrain-aware reproduction placement.

### Environmental field stack

- low-resolution environmental vector/scalar field layer;
- movement sampling from environmental fields;
- field render snapshot and Pixi vector debug layer;
- field decay/diffusion with scratch buffers and metrics;
- field sources/sinks with resource-driven emission and agent absorption;
- obstacle/terrain damping sources;
- deterministic field advection;
- renderer-agnostic field-force sampling and explicit agent response to environmental fields.

Current field-stage order is intentionally separated into sources/sinks, damping, advection, dynamics, and field-force style response so each cost and effect remains observable.

### Controller and actuator

M48 closed the controller first pass as an observation/configuration layer:

- `src/sim/controller.ts` defines a renderer-agnostic controller API;
- controller output uses deterministic intent arrays: `intentX`, `intentY`, and `intentMagnitude`;
- config is bounded and includes enable, strength, max intent, food weight, threat weight, and flow weight;
- controller overlay/readouts, benchmark, panel controls, persistence, and exposure tests exist.

M49 closes the explicit controller actuator bridge:

- `src/sim/controllerActuator.ts` converts controller intent into bounded force writes;
- default config remains disabled through `enableControllerMovementInfluence = false`;
- demo wiring exists but is default-neutral;
- actuator metrics are exposed through the shared performance bus and overlay;
- actuator controls and persistence exist under `qubok_evolve.controller_actuator_config.v1`;
- benchmark coverage exists through `bench:controller-actuator`;
- repo status, roadmap status, milestone, integration, package version, and app version now report `0.1.0-milestone.49` / `m49`.

Important limit: current M49 demo order uses the previous available controller output for actuator influence. Later order refinement may move toward `environment -> spatial/resource rebuild -> sensors -> controller -> actuators/forces -> movement -> interactions -> lifecycle/reproduction -> snapshots`.

### UI, overlay, persistence, tests, benchmarks

- live debug/performance overlay with runtime, terrain, field, sensor, obstacle, resource, predator/prey, reproduction, world-slot, render, controller, and controller actuator metrics;
- grouped overlay metrics and panel stack controls;
- render layer toggles and debug config persistence;
- field, damping, advection, field-force, controller, and controller actuator control panels with persistence where implemented;
- Node-based unit, integration, status, UI QA, and benchmark scripts;
- known Vite chunk-size warning is tracked as a later performance/code-splitting task, not a blocking runtime error.

## Current limitations and known technical debt

- Ecology pressure is intentionally weak in some demo configs; hunger, scarcity, predation, and reproduction pressure need calibration in M50.
- The sensor pass is a known hotspot and needs budgeting, cadence control, candidate caps, and better selected-agent visualization in M51.
- Current M49 actuator demo order uses previous controller output; order refinement remains a future safe step.
- Render/debug layers can become expensive because terrain, obstacle, field vectors, and agent debug views may redraw too often; throttling/cache belongs to the M57 performance split.
- Signed-distance field terrain/obstacle response is not implemented yet.
- Morphology/component compiler and body editor are not implemented yet.
- Workerization, SharedArrayBuffer, WebGPU, full fluid solver, and topology-evolving brains are future branches, not current runtime dependencies.
- The current Vite chunk warning should be handled through code-splitting and debug module separation in M57.

## Project philosophy

- Determinism first: reproducible seeds, deterministic typed-array systems, and stable validation are more important than early visual complexity.
- Debug first: a system is not considered usable until it exposes metrics, readouts, and targeted tests.
- Test before demo wiring: core behavior should be validated before it is connected to the live demo.
- Milestone isolation: each milestone should primarily touch one track unless an integration document justifies coupling.
- Performance observability: every system that can become expensive should expose timing and counters early.
- Renderer-agnostic simulation: render layers visualize snapshots; they do not own simulation state.
- Behavior neutrality by default: new behavior-changing systems should be default-disabled or no-op until explicitly enabled and tested.

## Roadmap: M50 to M57

| Milestone | Purpose | Required direction |
|---|---|---|
| M50 | Ecology pressure calibration. | Add presets and runtime controls for hunger, starvation, resource scarcity, reproduction pressure, predator pressure, and pressure readouts. |
| M51 | Sensor budgeting and perception quality. | Add sensor caps, strides, cadence per channel, dense-cluster benchmarks, and selected-agent sensor wedge visualization. |
| M52 | Agent inspector and lab tools. | Add selected-agent inspector, sample groups, pause/step/slow motion, and debug-state export. |
| M53 | Morphology compiler foundation. | Define component schema and compile body/component data into existing numeric phenotype traits before adding an editor. |
| M54 | Terrain/obstacle response refinement. | Add signed-distance or nearest-boundary response, response-vector visualization, and material inspector tools. |
| M55 | Lineage, fitness, species observability. | Track lineage/species/genome metrics, fitness proxies, generation distributions, and compact run summaries. |
| M56 | Experiment config, presets, replay preparation. | Unify render/debug/field/ecology/controller/sensor presets into a versioned experiment config with scenario save/load and migration. |
| M57 | Performance architecture split. | Split large render/debug modules, group tests, throttle debug rendering, resolve Vite code-splitting warning, and prepare workerization contracts. |

## Near-term rule

M49 is closed. The next behavior-quality step is M50, focused on ecology pressure calibration rather than new brain complexity.

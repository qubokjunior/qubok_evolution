# qubok_evolve roadmap

Current status: m49 complete / controller actuator bridge shipped behind disabled-by-default configuration. Controller intent can now become bounded movement force only through the explicit actuator stage. M50 is next: ecology pressure calibration.

## shipped sequence

- m34 shipped: terrain Pixi debug render layer.
- m35 shipped: terrain movement query integration.
- m36 shipped: terrain resource-affinity spawning and respawning.
- m37 shipped: terrain-aware sensor sampling on controlled cadence.
- m38 shipped: terrain-aware reproduction placement using offspring habitat acceptance.
- m39 shipped: low-resolution environmental flow field sampled by movement.
- m40 shipped: environmental field render snapshot and Pixi vector debug layer.
- m41 shipped: render debug controls, keyboard layer visibility toggles, and grouped overlay metrics.
- m42 shipped: field decay/diffusion foundation with deterministic dynamics, benchmark, demo wiring, and overlay metrics.
- m43 shipped: field sources/sinks foundation with demo wiring and overlay metrics.
- m44 shipped: field source semantics tuning and visualization QA.
- m45 shipped: obstacle/terrain damping sources, editable debug parameters, panel stack persistence, render layer controls, and debug config preset import/export UX.
- m46 shipped: deterministic environmental field advection with tests, benchmark, demo wiring, overlay/readouts, editable controls, and persistence.
- m47 shipped: field-force separation and explicit agent response to environmental fields.
- m48 shipped: controller/brain first pass with renderer-agnostic controller API, deterministic intent buffers, disabled-by-default demo wiring, benchmark, overlay/readouts, panel controls, persistence, source overview, and status guards.
- m49 shipped: controller actuator bridge with renderer-agnostic intent-to-force API, deterministic tests, benchmark, disabled-by-default demo wiring, overlay/readouts, panel controls, persistence, and status guards.

## terrain/material track

Shipped sequence:
- terrain layer foundation;
- terrain render snapshot and debug layer;
- movement/material query;
- resource-affinity spawning;
- sensor sampling;
- reproduction placement.

Next candidates:
- signed-distance-field correction for smoother obstacle/terrain response;
- terrain influence presets for dry/wet/friction/resource-affinity regions;
- terrain editor tools after controller behavior and sensor cost are stable;
- richer field/material coupling after M50/M51 behavior pressure is measurable.

## fluid-like field track

Shipped sequence:
- low-resolution environmental field grid;
- deterministic field sampling by position;
- movement integration using flow vectors;
- field movement metrics and overlay labels;
- field render snapshot;
- Pixi vector debug layer with decimated arrows and field render metrics;
- field vector visibility and render debug controls;
- deterministic field decay/diffusion step with scratch buffers, metrics, benchmark, demo wiring, and overlay labels;
- deterministic field sources/sinks with resource-driven vector emission, agent absorption, demo wiring, metrics, benchmark, and overlay labels;
- field source semantics tuning with resource energy/radius scaling, agent radius/energy-pressure absorption, runtime visual QA, and overlay/readout guards;
- obstacle/terrain damping sources with runtime metrics, editable damping controls, persisted debug config, render layer/vector controls, and preset import/export UX;
- deterministic environmental field advection with core tests, benchmark, demo wiring, overlay/readouts, editable controls, and persisted config;
- field-force separation with renderer-agnostic sim API, deterministic tests, benchmark, disabled-by-default demo wiring, overlay/readouts, controls, and persisted config.

Follow-up candidates:
- ecology presets that combine fields, terrain, food scarcity, and predator pressure;
- signed-distance-field correction if the next track returns to terrain/material response;
- render/code-splitting follow-up for the current Vite warning.

## controller/brain track

Goal: introduce decision logic after sensing, field, terrain, and debug foundations are stable.

M48 closed state:
- renderer-agnostic controller API under `src/sim/controller.ts`;
- deterministic intent output arrays: `intentX`, `intentY`, `intentMagnitude`;
- bounded controller config: enable, strength, max intent, food/threat/flow weights;
- disabled/default-neutral demo wiring;
- benchmark and tests;
- controller overlay/readouts;
- controller panel and persisted config;
- `docs/project_overview.md` source overview;
- status guards closed on `0.1.0-milestone.48`.

M49 closed state:
- renderer-agnostic controller actuator API under `src/sim/controllerActuator.ts`;
- explicit intent-to-force bridge using `enableControllerMovementInfluence`;
- default-disabled demo wiring between field force and movement;
- actuator benchmark exposed as `bench:controller-actuator`;
- actuator metrics exposed through perf bus and overlay group;
- actuator panel and dedicated persistence key;
- integration/status guards closed on `0.1.0-milestone.49`.

Known M49 limit:
- current demo order uses the previous available controller output for actuator influence. A later order-refinement slice may move toward `environment -> spatial/resource rebuild -> sensors -> controller -> actuators/forces -> movement -> interactions -> lifecycle/reproduction -> snapshots`.

## post-M49 milestone roadmap

### M50: ecology pressure calibration

Purpose: make behavior matter. Without hunger, scarcity, predation, and reproduction pressure, controller output cannot be evaluated.

Required runtime work:
- create demo ecology presets: neutral lab, scarce food, predator pressure, terrain habitat, field current stress;
- expose basal metabolism, starvation threshold, starvation damage, reproduction threshold/cost, resource target, respawn rate, predator attack radius/damage as safe runtime config;
- prevent capacity saturation from hiding ecology by adding explicit population pressure metrics and optional capacity/pause controls;
- tune food/energy loops so starvation and reproduction become observable without catastrophic collapse.

Required tests/benchmarks:
- deterministic pressure scenario: resources decrease, agents eat, energy changes, births/deaths occur;
- capacity-blocked births remain visible;
- starvation death path uses `killAgent` and free-list reuse;
- predator/prey kills use free-list reuse;
- benchmark ecology presets at fixed agent/resource counts.

Required debug and realtime config:
- ecology panel: metabolism, starvation, resource count, respawn, reproduction, predator pressure;
- overlay group for ecology pressure: food density, energy histogram approximation, deaths, births, blocked births, average/max/min energy;
- optional heatmap for resource pressure / depleted cells;
- preset import/export entry for ecology configs.

### M51: sensor cost and perception quality pass

Purpose: reduce the current sensor bottleneck while making sensory data easier to inspect.

Required runtime work:
- add `sensorMaxAgentsPerTick`, `sensorAgentStride`, `maxSensorCandidatesPerAgent`, `maxVisibleNeighborsPerAgent`;
- split cheap sensors from expensive food/obstacle/terrain channels;
- make cadence visible and configurable per channel;
- preserve skipped sector channels only when explicitly requested by config;
- add dense-cluster sensor benchmark.

Required debug and realtime config:
- sensor panel for radius scale, cadence, max agents/tick, candidate cap, channel toggles;
- visual debug for one selected/sample agent: sector wedges, food/threat/ally/obstacle values;
- overlay values for candidates, visible neighbors, sector writes, skipped channels, capped candidates.

### M52: behavior inspection and agent sampling tools

Purpose: make individual and group behavior diagnosable before adding richer brains.

Required runtime/UI work:
- add stable sample-agent inspector independent of render object identity;
- expose selected agent values: position, velocity, energy, health, species, diet, generation, sensor sectors, controller intent, actuator force, terrain cell, field sample;
- add group sampling: top energy, lowest energy, predators, high reproduction candidates, recent deaths if available;
- add pause/step/slow-motion controls for deterministic observation.

### M53: morphology/component foundation

Purpose: begin moving from parameter-only agents toward body/component-driven behavior.

Required runtime work:
- define minimal morphology/component schema separate from rendering;
- map components to existing typed-array traits: sensors, mouth power, armor, movement thrust, metabolism, radius/mass;
- keep first version compile-only: component grid -> numeric phenotype parameters.

### M54: terrain/obstacle response refinement

Purpose: improve environmental plausibility and collision feel without jumping to a full solver.

Required runtime work:
- signed-distance-field or nearest-boundary approximation for obstacle response;
- smoother terrain boundary response;
- material-specific movement/energy penalties.

### M55: lineage, selection, and genome observability

Purpose: make evolution measurable, not only visually interesting.

Required runtime work:
- track parent/child lineage metrics over time;
- species/genome counters and generation distribution;
- fitness proxy accumulation based on survival, food, reproduction, exploration, combat.

### M56: sim lab presets and experiment sessions

Purpose: make experiments reproducible and comparable.

Required work:
- unify render/debug/field/ecology/controller/sensor presets into one versioned experiment config;
- support reset/reseed/run controls;
- add scenario presets: calm field, strong advection, scarce food, predator island, terrain corridor, dense stress test;
- add compatibility migration for old localStorage keys.

### M57: performance architecture split

Purpose: keep realtime as functionality grows.

Required work:
- split large renderer metric mapping into modules;
- add test categories: `test:status`, `test:core`, `test:field`, `test:ui`, `test:render`, `test:demo`, `test:all`;
- add debug render throttling: overlay Hz, field vector Hz, terrain/obstacle refresh Hz;
- code-splitting follow-up for the Vite chunk warning;
- later evaluate workerization only after deterministic frame input/output contract is written.

## debug and monitoring requirements for every future milestone

Every runtime milestone should include:
- deterministic core test;
- no-op/default-disabled test when behavior can change;
- benchmark at representative scale;
- integration guard for demo wiring;
- overlay/readout labels for the new metrics;
- right-panel controls only after core behavior is stable;
- persistence only after controls are stable;
- clear separation between simulation state, renderer, and UI;
- visual QA where visual interpretation can mislead, especially fields, sensors, terrain, and controller intent.

## render/performance track

Goal: keep visual debugging useful while entity counts grow.

Near steps:
- render snapshot cost checks;
- sensor dense-cluster benchmark;
- debug render throttling;
- chunk size/code-splitting follow-up for the current Vite warning.

## Track sequencing rule

Each future milestone should primarily touch one track. Cross-track work needs an integration doc explaining why the coupling is necessary.

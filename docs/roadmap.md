# qubok_evolve roadmap

Current status: m48 complete / controller first pass shipped as a behavior-neutral observation and configuration layer. Controller intent is not yet actuated into movement; M49 owns the actuator bridge.

m34 shipped: terrain Pixi debug render layer.

m35 shipped: terrain movement query integration.

m36 shipped: terrain resource-affinity spawning and respawning.

m37 shipped: terrain-aware sensor sampling on controlled cadence.

m38 shipped: terrain-aware reproduction placement using offspring habitat acceptance.

m39 shipped: low-resolution environmental flow field sampled by movement.

m40 shipped: environmental field render snapshot and Pixi vector debug layer.

m41 shipped: render debug controls, keyboard layer visibility toggles, and grouped overlay metrics.

m42 shipped: field decay/diffusion foundation with deterministic dynamics, benchmark, demo wiring, and overlay metrics.

m43 shipped: field sources/sinks foundation with demo wiring and overlay metrics.

m44 shipped: field source semantics tuning and visualization QA.

m45 shipped: obstacle/terrain damping sources, editable debug parameters, panel stack persistence, render layer controls, and debug config preset import/export UX.

m46 shipped: deterministic environmental field advection with tests, benchmark, demo wiring, overlay/readouts, editable controls, and persistence.

m47 shipped: field-force separation and explicit agent response to environmental fields.

m48 shipped: controller/brain first pass with renderer-agnostic controller API, deterministic intent buffers, disabled-by-default demo wiring, benchmark, overlay/readouts, panel controls, persistence, source overview, and status guards.

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
- richer field/material coupling, but only after M49/M50 behavior pressure is measurable.

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

Current milestone:
- m49 planning: controller actuator bridge after M48 controller intent observability is closed.

M46 shipped scope:
- define advection separately from diffusion, sources/sinks, damping, and field force;
- keep first pass CPU, deterministic, low-resolution, and renderer-agnostic;
- add core advection API and deterministic tests before demo wiring;
- benchmark field sizes and substep counts before UI controls;
- keep Stable Fluids pressure solve, WebGPU, controller/brain, and render rewrite out of scope.

M47 shipped scope:
- define field force as a separate stage after sources/sinks, damping, advection, and dynamics;
- keep field-force sampling simulation-only and renderer-agnostic;
- ensure field force reads fields without mutating field buffers;
- keep default agent behavior unchanged unless field force is explicitly enabled;
- add deterministic no-op, clamp, alive-only, and metrics tests before demo wiring;
- keep controller/brain, pathfinding, full fluid solver, hard collision, WebGPU, and large UI panels out of scope.

Follow-up candidates:
- M49 controller actuator bridge;
- signed-distance-field correction if the next track returns to terrain/material response;
- render/code-splitting follow-up for the current Vite warning.

## controller/brain track

Goal: introduce decision logic after sensing, field, terrain, and debug foundations are stable.

Current planning:
- m49 actuator bridge: convert existing M48 intent into optional movement influence without changing default behavior.

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

Known M48 limit:
- controller output is not actuated into movement or forces. This remains M49 scope.

## post-M48 milestone roadmap

### M49: controller actuator bridge

Purpose: turn controller intent into an optional movement influence without breaking default demo behavior.

Required runtime work:
- introduce an explicit `controllerActuator` or `intentToForce` stage between controller and movement;
- decide and document final order: environment update -> spatial/resource rebuild -> sensors -> controller -> actuators/forces -> movement -> interactions -> lifecycle/reproduction -> snapshots;
- add `enableControllerMovementInfluence`, `controllerForceScale`, `controllerMaxForce`, and optional `controllerBlendWithDemoForces` config;
- keep default disabled and behavior-neutral;
- ensure field force, demo force, obstacle response, and controller influence remain separate metrics.

Required tests/benchmarks:
- disabled controller produces identical movement baseline;
- zero intent no-op;
- finite/clamped force output;
- alive-only application;
- deterministic repeat;
- actuator does not mutate sensors or field buffers;
- benchmark 1k/5k/10k agents for controller + actuator cost.

Required debug and realtime config:
- overlay labels for `controller actuator ms`, `intent force applied`, `intent force clamps`, `intent mean/max magnitude`;
- right-panel controls for controller actuator enable/strength/max force;
- visual layer for intent vectors, separate from field vectors and agent field influence;
- toggle to compare raw sensor intent versus final actuator force.

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

Required tests/benchmarks:
- dense cluster does not explode beyond configured candidate cap;
- cadence skip preserves or clears channels as configured;
- controller still sees deterministic sensor state;
- benchmark sensors at sparse, ring, and dense cluster distributions.

Required debug and realtime config:
- sensor panel for radius scale, cadence, max agents/tick, candidate cap, channel toggles;
- visual debug for one selected/sample agent: sector wedges, food/threat/ally/obstacle values;
- overlay values for candidates, visible neighbors, sector writes, skipped channels, capped candidates.

### M52: behavior inspection and agent sampling tools

Purpose: make individual and group behavior diagnosable before adding richer brains.

Required runtime/UI work:
- add stable sample-agent inspector independent of render object identity;
- expose selected agent values: position, velocity, energy, health, species, diet, generation, sensor sectors, controller intent, terrain cell, field sample;
- add group sampling: top energy, lowest energy, predators, high reproduction candidates, recent deaths if available;
- add pause/step/slow-motion controls for deterministic observation.

Required debug and realtime config:
- selected agent overlay marker;
- sensor-sector radial mini readout;
- controller intent vector and final force vector;
- time controls: pause, one tick, 10 ticks, speed scale;
- snapshot export of selected agent debug state.

### M53: morphology/component foundation

Purpose: begin moving from parameter-only agents toward body/component-driven behavior.

Required runtime work:
- define minimal morphology/component schema separate from rendering;
- map components to existing typed-array traits: sensors, mouth power, armor, movement thrust, metabolism, radius/mass;
- keep first version compile-only: component grid -> numeric phenotype parameters;
- no editor yet unless data format and tests are stable.

Required tests/benchmarks:
- deterministic morphology compile;
- bounds/clamp validation;
- phenotype mutation affects derived traits safely;
- benchmark morphology compile for population sizes.

Required debug and realtime config:
- morphology readout per sampled agent;
- component contribution table: what changed speed, sensor radius, energy cost, attack, defense;
- phenotype histogram overlay for key traits.

### M54: terrain/obstacle response refinement

Purpose: improve environmental plausibility and collision feel without jumping to a full solver.

Required runtime work:
- signed-distance-field or nearest-boundary approximation for obstacle response;
- smoother terrain boundary response;
- material-specific movement/energy penalties;
- optional terrain/obstacle editing only after deterministic query APIs are stable.

Required debug and realtime config:
- obstacle response vector visualization;
- terrain material inspector under cursor/sample point;
- editable damping/friction/drag/resource-affinity presets;
- overlay for obstacle hits, boundary hits, response clamps, terrain movement cost.

### M55: lineage, selection, and genome observability

Purpose: make evolution measurable, not only visually interesting.

Required runtime work:
- track parent/child lineage metrics over time;
- species/genome counters and generation distribution;
- fitness proxy accumulation based on survival, food, reproduction, exploration, combat;
- preserve deterministic mutation and reproduction rules.

Required debug and realtime config:
- lineage overlay group;
- species population chart/readout;
- generation histogram approximation;
- sampled genome/phenotype diff between parent and child;
- export compact run summary.

### M56: sim lab presets and experiment sessions

Purpose: make experiments reproducible and comparable.

Required work:
- unify render/debug/field/ecology/controller/sensor presets into one versioned experiment config;
- support reset/reseed/run controls;
- add scenario presets: calm field, strong advection, scarce food, predator island, terrain corridor, dense stress test;
- add compatibility migration for old localStorage keys.

Required debug and realtime config:
- scenario selector;
- save/load preset JSON;
- copy current experiment config;
- run summary overlay with seed, tick, population, average energy, births, deaths, sensor/render cost.

### M57: performance architecture split

Purpose: keep realtime as functionality grows.

Required work:
- split large renderer metric mapping into modules;
- add test categories: `test:status`, `test:core`, `test:field`, `test:ui`, `test:render`, `test:demo`, `test:all`;
- add debug render throttling: overlay Hz, field vector Hz, terrain/obstacle refresh Hz;
- code-splitting follow-up for the Vite chunk warning;
- later evaluate workerization only after deterministic frame input/output contract is written.

Required debug and realtime config:
- performance panel with simulation Hz, overlay Hz, render layer refresh rates;
- high/medium/low debug quality presets;
- explicit readout for sim cost versus render/debug cost.

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

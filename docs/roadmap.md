# qubok_evolve roadmap

Current status: m47 complete / field-force separation shipped; m48 planning opened for controller/brain first pass.

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

m48 planned: controller/brain first pass using existing sensors, terrain, field, and debug readouts.

## terrain/material track

Shipped sequence:
- terrain layer foundation;
- terrain render snapshot and debug layer;
- movement/material query;
- resource-affinity spawning;
- sensor sampling;
- reproduction placement.

Next candidates:
- later signed-distance-field correction;
- later terrain editor tools and richer field layers.

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
- m48 planning: controller/brain first pass after sensing, terrain, and field response foundations.

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
- M48-A1 core controller/intent API + deterministic no-op tests, no demo wiring;
- M48-A2 metrics and benchmark;
- M48-A3 demo wiring behind disabled/default-light config;
- M48-A4 overlay/readout QA;
- M48-A5 optional controls/persistence after behavior is stable;
- signed-distance-field correction if the next track returns to terrain/material response;
- render/code-splitting follow-up for the current Vite warning.

## controller/brain track

Goal: introduce decision logic after sensing, field, terrain, and debug foundations are stable.

Current planning:
- m48 controller/brain first pass using existing fixed-width sensors and current observability surfaces.

## render/performance track

Goal: keep visual debugging useful while entity counts grow.

Near steps:
- render snapshot cost checks;
- chunk size/code-splitting follow-up for the current Vite warning.

## Track sequencing rule

Each future milestone should primarily touch one track. Cross-track work needs an integration doc explaining why the coupling is necessary.

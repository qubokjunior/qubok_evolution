# qubok_evolve roadmap

Current status: m46 planning / field transport-advection track.

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

m46 planned: deterministic environmental field transport/advection before controller/brain work.

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
- obstacle/terrain damping sources with runtime metrics, editable damping controls, persisted debug config, render layer/vector controls, and preset import/export UX.

Current milestone:
- m46 planning: deterministic field transport/advection using a CPU semi-Lagrangian pass.

M46 planned scope:
- define advection separately from diffusion, sources/sinks, damping, and field force;
- keep first pass CPU, deterministic, low-resolution, and renderer-agnostic;
- add core advection API and deterministic tests before demo wiring;
- benchmark field sizes and substep counts before UI controls;
- keep Stable Fluids pressure solve, WebGPU, controller/brain, and render rewrite out of scope.

Follow-up candidates:
- field-force separation after advection behavior is stable;
- signed-distance-field correction if the next track returns to terrain/material response;
- controller/brain first pass after field behavior remains understandable and measurable.

## controller/brain track

Goal: introduce decision logic after sensing, field, terrain, and debug foundations are stable.

Candidate:
- controller/brain first pass using existing fixed-width sensors and current observability surfaces.

## render/performance track

Goal: keep visual debugging useful while entity counts grow.

Near steps:
- render snapshot cost checks;
- chunk size/code-splitting follow-up for the current Vite warning.

## Track sequencing rule

Each future milestone should primarily touch one track. Cross-track work needs an integration doc explaining why the coupling is necessary.

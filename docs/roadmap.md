# qubok_evolve roadmap

Current status: m45 / 0.1.0-milestone.45 closed.

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
- m45 closed: obstacle/terrain damping sources and editable debug parameters.

M45 scope:
- damp environmental field magnitude around obstacle cells and terrain materials;
- expose deterministic damping stats and overlay readouts;
- expose editable damping controls and panels;
- add agent field visual debug controls;
- consolidate right-side editable panels into a scrollable, resizable, persistent stack;
- persist render debug and field damping config;
- export/import debug config presets with validation UX;
- keep field damping simulation-only and renderer-agnostic.

Follow-up candidates:
- m46 candidate: field transport/advection research spike or field-force separation, if the next track remains fluid-like fields;
- signed-distance-field correction, if the next track returns to terrain/material response;
- controller/brain first pass, if the next milestone should begin behavior decision logic after the debug/config foundation is stable.

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

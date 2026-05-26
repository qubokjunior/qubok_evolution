# qubok_evolve roadmap

Current status: m41 / 0.1.0-milestone.41.

m34 shipped: terrain Pixi debug render layer.

m35 shipped: terrain movement query integration.

m36 shipped: terrain resource-affinity spawning and respawning.

m37 shipped: terrain-aware sensor sampling on controlled cadence.

m38 shipped: terrain-aware reproduction placement using offspring habitat acceptance.

m39 shipped: low-resolution environmental flow field sampled by movement.

m40 shipped: environmental field render snapshot and Pixi vector debug layer.

m41 shipped: render debug controls, keyboard layer visibility toggles, and grouped overlay metrics.

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
- field vector visibility and render debug controls.

Next likely milestone:
- m42 field decay/diffusion foundation or controller/brain first pass.

Follow-up candidates:
- simple decay/diffusion rules for field maps;
- field force integration separated from movement if field systems grow;
- later field transport/advection branch.

## controller/brain track

Goal: introduce decision logic after sensing and morphology foundations are stable.

## render/performance track

Goal: keep visual debugging useful while entity counts grow.

Shipped in m41:
- overlay grouping and keyboard visibility toggles;
- render debug config defaults;
- field vector alpha, scale, stride, and minimum magnitude config;
- grouped overlay metrics for runtime, field, terrain, obstacle, movement, spatial, sensors, combat, resources, reproduction, and world slots.

Near steps:
- render snapshot cost checks;
- chunk size/code-splitting follow-up for the current Vite warning.

## Track sequencing rule

Each future milestone should primarily touch one track. Cross-track work needs an integration doc explaining why the coupling is necessary.

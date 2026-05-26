# qubok_evolve roadmap

Current status: m39 / 0.1.0-milestone.39.

m34 shipped: terrain Pixi debug render layer.

m35 shipped: terrain movement query integration.

m36 shipped: terrain resource-affinity spawning and respawning.

m37 shipped: terrain-aware sensor sampling on controlled cadence.

m38 shipped: terrain-aware reproduction placement using offspring habitat acceptance.

m39 shipped: low-resolution environmental flow field sampled by movement.

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
- field movement metrics and overlay labels.

Next likely milestone:
- m40 environmental field render snapshot and Pixi vector debug layer.

Follow-up candidates:
- field vector render decimation;
- simple decay/diffusion rules for food scent / pressure / current maps;
- field force integration separated from movement if field systems grow.

## controller/brain track

Goal: introduce decision logic after sensing and morphology foundations are stable.

## render/performance track

Goal: keep visual debugging useful while entity counts grow.

Near steps:
- overlay grouping and toggles;
- render snapshot cost checks;
- chunk size/code-splitting follow-up for the current Vite warning.

## Track sequencing rule

Each future milestone should primarily touch one track. Cross-track work needs an integration doc explaining why the coupling is necessary.

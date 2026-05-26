# qubok_evolve roadmap

Current status: m37 / 0.1.0-milestone.37.

m34 shipped: terrain Pixi debug render layer.

m35 shipped: terrain movement query integration.

m36 shipped: terrain resource-affinity spawning and respawning.

m37 shipped: terrain-aware sensor sampling on controlled cadence.

## terrain/material track

Next candidates:
- m38 terrain-aware reproduction placement;
- later signed-distance-field correction;
- later terrain editor tools and richer field layers.

## fluid-like field track

Next candidates:
- low-resolution vector field sampled by agents;
- flow force integration separated from movement;
- debug render snapshot for field vectors.

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

# qubok_evolve roadmap

Current status: m36 / 0.1.0-milestone.36.

This roadmap splits future work into independent architecture tracks so later milestones do not mix terrain, morphology, controller, renderer, worker, and WebGPU changes in one step.

## terrain/material track

m32 shipped: terrain/material typed-array layer, material definitions, position-to-cell query API, tests, and benchmark.

m33 shipped: terrain render snapshot foundation for future terrain debug visualization.

m36 shipped: terrain Pixi debug render layer with overlay metrics.

m36 shipped: terrain movement query integration using material friction, drag, and movement cost.

m36 shipped: terrain resource-affinity spawning and respawning.

Goal: turn the flat world into layered 2D terrain data without coupling terrain to rendering.

Near steps:
- terrain material grid with ids, friction, drag, resource affinity, and movement modifiers;
- terrain query API used by movement;
- terrain resource-affinity integration for spawning and respawning;
- later terrain query integration for sensors and reproduction;
- debug snapshot and render layer for terrain fields.

## fluid-like field track

Goal: add cheap 2D environmental flow fields for fish/bird/flocking-like behavior.

Near steps:
- low-resolution vector field sampled by agents;
- flow force integration separated from movement;
- debug render snapshot for field vectors.

## morphology/entity editor track

Goal: prepare entity phenotype and morphology data for a later editor without breaking the typed-array runtime.

Near steps:
- component schema for body parts, sensors, mouth, locomotion, armor, and storage;
- compiler from component layout to runtime phenotype arrays;
- validation tests for component budgets and sensor/energy costs.

## controller/brain track

Goal: introduce decision logic after sensing and morphology foundations are stable.

Near steps:
- minimal action vector contract;
- deterministic rule controller baseline;
- controller metrics and replay tests.

## render/performance track

Goal: keep visual debugging useful while entity counts grow.

Near steps:
- overlay grouping and toggles;
- render snapshot cost checks;
- chunk size/code-splitting follow-up for the current Vite warning.

## worker/WebGPU track

Goal: keep the main thread responsive only after the simulation contract is stable.

Near steps:
- serializable snapshot boundary review;
- worker transfer benchmark;
- deterministic replay guard.

## Track sequencing rule

Each future milestone should primarily touch one track. Cross-track work needs an integration doc explaining why the coupling is necessary.

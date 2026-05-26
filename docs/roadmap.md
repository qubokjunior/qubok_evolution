# qubok_evolve roadmap

Current status: m31 / 0.1.0-milestone.31.

This roadmap splits future work into independent architecture tracks so later milestones do not mix terrain, morphology, controller, renderer, worker, and WebGPU changes in one step.

## terrain/material track

Goal: turn the flat world into layered 2D terrain data without coupling terrain to rendering.

Near steps:
- terrain material grid with ids, friction, drag, resource affinity, and movement modifiers;
- terrain query API used by movement, sensors, spawning, and reproduction;
- debug snapshot for terrain fields.

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

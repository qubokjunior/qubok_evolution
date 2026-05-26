# Integration m44 — field source semantics tuning and visualization QA

Milestone m44 starts from m43 / 0.1.0-milestone.43 and tunes field source/sink behavior after the first shipped demo wiring.

## Goal

M44 should make field source semantics easier to reason about and easier to debug visually. Resource-driven sources and agent-driven sinks already exist; this milestone focuses on making their strengths interpretable, testable, and useful in the live overlay.

## Planned scope

- tune resource source strength so it has a clear relation to resource state, such as energy and radius;
- tune agent sink absorption so it has a clear relation to agent presence without instantly erasing the field;
- add deterministic QA checks for demo source/sink behavior;
- preserve existing field source/sink API boundaries;
- preserve renderer-agnostic simulation logic;
- keep visualization QA on the current overlay/vector layer rather than rewriting rendering.

## Runtime visualization QA

- demo field source/sink behavior is checked over multiple simulation steps;
- emitted magnitude must remain positive and stronger than sink absorption in the QA config;
- field render snapshot must expose finite visible vectors without truncation.

## Overlay/readout QA

- field source/sink metrics must exist in `PERF_METRIC_NAMES`;
- Pixi renderer must record all source/sink metrics used by QA;
- debug overlay must expose readable labels for source/sink counts, touched cells, emitted/absorbed magnitude, post-step magnitude, vector count, and truncation.

## Out of scope

- advection;
- pressure or fluid solver;
- controller/brain logic;
- morphology editor;
- authored field/terrain painting UI;
- WebGPU;
- render rewrite.

## Validation target

- npm run test:field-sources
- npm run test:field-sources-integration
- npm run test:debug-overlay-groups
- npm run test:demo-integration
- npm run test:repo-status
- npm run test:roadmap-status
- npm run build

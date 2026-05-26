# Integration m44 — field source semantics tuning and visualization QA

Milestone m44 ships on 0.1.0-milestone.44 and tunes field source/sink behavior after the first shipped demo wiring.

## Goal

M44 should make field source semantics easier to reason about and easier to debug visually. Resource-driven sources and agent-driven sinks already exist; this milestone focuses on making their strengths interpretable, testable, and useful in the live overlay.

## Shipped scope

- tuned resource source strength so it has a clear relation to resource energy and radius;
- tuned agent sink absorption so it relates to agent radius and low-energy pressure without instantly erasing the field;
- added deterministic QA checks for demo source/sink behavior;
- preserved existing field source/sink API boundaries;
- preserved renderer-agnostic simulation logic;
- kept visualization QA on the current overlay/vector layer rather than rewriting rendering.

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

## Commits

- `de06bbc` — Tune m44 field source demo semantics
- `330b3ab` — Add m44 field source visual QA
- `2d68d44` — Add m44 field source overlay QA

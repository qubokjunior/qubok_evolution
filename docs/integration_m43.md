# Integration m43 — field sources and sinks foundation

Milestone m43 starts from m42 / 0.1.0-milestone.42 and adds deterministic source/sink operations for environmental field layers.

## Goal

M43 gives the existing field decay/diffusion system something explicit to process. Sources emit vector flow into field cells; sinks absorb existing field magnitude. The system remains simulation-only and renderer-agnostic.

## Planned scope

- add a focused field source/sink module;
- support deterministic point source emission by world position;
- support deterministic point sink absorption by world position;
- expose source/sink step metrics;
- add focused tests before wiring sources into demo resources/terrain/obstacles;
- keep renderer and controller/brain systems untouched.

## Out of scope

- advection;
- fluid solver;
- pressure solver;
- authored UI/editor tools;
- controller/brain logic;
- morphology editor;
- WebGPU;
- render rewrite.

## Validation target

- npm run test:field-sources
- npm run test:repo-status
- npm run test:roadmap-status
- npm run test:demo-integration
- npm run build

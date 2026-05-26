# Integration m42 — field decay and diffusion foundation

Milestone m42 starts from m41 / 0.1.0-milestone.41 and begins the fluid-like field dynamics track.

## Goal

M42 adds a small, deterministic decay/diffusion step for environmental field layers. It must remain simulation-only and renderer-agnostic. Rendering may keep using the existing field render snapshot path.

## Planned scope

- add field decay/diffusion configuration defaults;
- add deterministic per-cell decay for flow channels;
- add simple neighbor diffusion for flow channels;
- expose step metrics for sampled/updated cells and total magnitude loss/spread;
- keep integration independent from brain/controller and morphology systems;
- add focused tests before wiring into demo simulation.

## Out of scope

- advection;
- fluid solver;
- pressure solver;
- source/sink authoring UI;
- controller/brain logic;
- morphology editor;
- WebGPU;
- render rewrite.

## Validation target

- npm run test:repo-status
- npm run test:roadmap-status
- npm run test:demo-integration
- npm run build

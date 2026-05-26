# Integration m41 — render debug controls and overlay grouping

Milestone m41 starts from m40 / 0.1.0-milestone.40 and prepares the renderer/debug UX track for controlled visibility and grouped overlay metrics.

## Goal

M41 is a debug UX stabilization milestone. It must not change simulation mechanics. The simulation layer remains renderer-agnostic; render/debug configuration may affect PixiJS layer visibility and debug drawing style only.

## Planned scope

- add render debug config defaults;
- control visibility for grid, terrain, obstacle, field vector, and agent layers;
- expose field vector alpha, scale, stride, and minimum magnitude controls;
- add minimal keyboard or panel controls;
- structure overlay metrics into runtime, terrain, field, obstacle, sensors, resources, reproduction, and lifecycle/world-slot groups;
- keep WorldState and simulation hot loop unchanged.

## Out of scope

- diffusion;
- decay;
- advection;
- fluid solver;
- brain/controller;
- morphology editor;
- entity component editor;
- WebGPU;
- code splitting unless build starts failing.

## Validation target

- npm run test:repo-status
- npm run test:roadmap-status
- npm run test:demo-integration
- npm run build

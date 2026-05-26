# Integration m45 — obstacle/terrain damping sources and editable debug parameters

Milestone m45 starts from m44 / 0.1.0-milestone.44 and extends the field system with damping sources plus editable debug parameters.

## Goal

M45 should make the environmental field respond to non-agent environment structure. Obstacles and terrain materials should be able to locally damp field magnitude so the field becomes less uniform and more tied to world structure.

## Planned scope

- add obstacle damping as local field absorption around obstacle cells;
- add terrain damping as material-driven field absorption;
- add deterministic damping metrics;
- expose editable debug parameters for damping strength, toggles, and sampling limits;
- keep damping logic simulation-only and renderer-agnostic;
- keep UI/debug editing as configuration input, not authoritative simulation state;
- add tests for deterministic damping, demo wiring, and overlay/readout visibility.

## Out of scope

- advection;
- pressure/fluid solver;
- pathfinding;
- controller/brain logic;
- morphology editor;
- full terrain/field painting editor;
- WebGPU;
- render rewrite.

## Validation target

- npm run test:repo-status
- npm run test:roadmap-status
- npm run test:demo-integration
- npm run build

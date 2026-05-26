# Integration m43 — field sources and sinks foundation

Milestone m43 ships on 0.1.0-milestone.43 and adds deterministic source/sink operations for environmental field layers.

## Goal

M43 gives the existing field decay/diffusion system explicit producers and absorbers. Sources emit vector flow into field cells; sinks absorb existing field magnitude. The system remains simulation-only and renderer-agnostic.

## Shipped scope

- added `src/sim/fieldSources.ts`;
- added deterministic `FieldPointSource` emission by world position;
- added deterministic `FieldPointSink` absorption by world position;
- exposed `FieldSourceStepMetrics`;
- added focused source/sink tests and benchmark;
- wired resources as small deterministic field vector sources in `demoSimulation.ts`;
- wired living agents as clamped field sinks in `demoSimulation.ts`;
- added reusable source/sink buffers cleared with `length = 0`;
- added configurable limits: `fieldSourceMaxResources` and `fieldSinkMaxAgents`;
- recorded field source/sink metrics in `pixiRenderer.ts`;
- exposed overlay labels for source/sink count, touched cells, emitted/absorbed magnitude, and post-step magnitude.

## Out of scope

- advection;
- fluid solver;
- pressure solver;
- authored UI/editor tools;
- controller/brain logic;
- morphology editor;
- WebGPU;
- render rewrite.

## Validation

- npm run test:field-sources
- npm run test:field-sources-integration
- npm run test:debug-overlay-groups
- npm run test:demo-integration
- npm run test:repo-status
- npm run test:roadmap-status
- npm run build

## Commits

- `81b5351` — Wire field sources into demo simulation
- `8a45a39` — Update m43 status tests

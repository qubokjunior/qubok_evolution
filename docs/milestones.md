# qubok_evolve milestones

Compact milestone index through m48. Older early milestones are summarized at the system level; recent lifecycle, terrain, field, render-debug, and controller-observability milestones are listed with stricter implementation detail.

| Milestone | Focus | Status |
|---|---|---|
| m1 | Vite + TypeScript scaffold, Pixi render boundary, dark canvas, basic performance overlay, architecture docs. | complete |
| m2 | Deterministic random utilities and early runtime validation groundwork. | complete |
| m3 | Typed-array world state foundation and spawn/snapshot basics. | complete |
| m4 | Movement integration foundation. | complete |
| m5 | Spatial hash locality foundation. | complete |
| m6 | Neighbor query and local sampling groundwork. | complete |
| m7 | Resource layer foundation. | complete |
| m8 | Render snapshot boundary and read-only sim-to-render bridge. | complete |
| m9 | Energy/survival loop foundation. | complete |
| m10 | Reproduction foundation. | complete |
| m11 | Phenotype mutation rules and mutation tests/benchmarks. | complete |
| m12 | Predator/prey interaction foundation. | complete |
| m13 | Sensor pass foundation with fixed-width sector channels. | complete |
| m14 | Demo integration hardening across sim subsystems. | complete |
| m15 | Runtime/render integration and build/test stabilization. | complete |
| m16 | Demo simulation integration version visible in render snapshot tests. | complete |
| m17 | Additional subsystem benchmark/test coverage. | complete |
| m18 | Obstacle mask foundation. | complete |
| m19 | Obstacle soft movement response. | complete |
| m20 | Obstacle-aware spawn validation. | complete |
| m21 | Resource respawn with obstacle avoidance. | complete |
| m22 | Reproduction placement with obstacle validation. | complete |
| m23 | Obstacle-aware sensors and lifecycle-adjacent integration. | complete |
| m24 | Obstacle lifecycle telemetry. | complete |
| m25 | Obstacle debug render snapshot and Pixi overlay layer. | complete |
| m26 | World dead-slot free-list reuse. | complete |
| m27 | Live world slot telemetry in metrics/debug overlay. | complete |
| m28 | Controlled lifecycle pressure scenario validating death -> reusable slot -> birth. | complete |
| m29 | Death-path audit guarding against direct alive-zero writes outside world.ts. | complete |
| m30 | README/status sync, milestone index, and repo-status test. | complete |
| m31 | Roadmap and architecture-track split for future work. | complete |
| m32 | Terrain/material typed-array layer foundation with query API. | complete |
| m33 | Terrain render snapshot foundation for future debug visualization. | complete |
| m34 | Terrain Pixi debug render layer with overlay metrics. | complete |
| m35 | Terrain movement query integration using material friction, drag, and movement cost. | complete |
| m36 | Terrain resource-affinity spawning and respawning. | complete |
| m37 | Terrain-aware sensor sampling on controlled cadence. | complete |
| m38 | Terrain-aware reproduction placement using offspring habitat acceptance. | complete |
| m39 | Low-resolution environmental flow field sampled by movement. | complete |
| m40 | Environmental field render snapshot and Pixi vector debug layer. | complete |
| m41 | Render debug controls, field/terrain/obstacle visibility toggles, keyboard layer toggles, and grouped overlay metrics. | complete |
| m42 | Field decay/diffusion foundation with deterministic field dynamics, metrics, benchmark, demo wiring, and overlay labels. | complete |
| m43 | Field sources/sinks foundation for deterministic emission and absorption into environmental fields, demo wiring, overlay metrics, tests, and benchmark. | complete |
| m44 | Field source semantics tuning and visualization QA with runtime visual and overlay/readout guards. | complete |
| m45 | Obstacle/terrain damping sources, editable debug parameters, panel persistence, render layer controls, and debug config preset import/export UX. | complete |
| m46 | Deterministic environmental field transport/advection core, benchmark, demo wiring, overlay/readouts, editable controls, and persistence. | complete |
| m47 | Field-force separation and explicit agent response to environmental fields, with core API, tests, benchmark, demo wiring, overlay/readouts, controls, and persistence. | complete |
| m48 | Controller/brain first-pass slices: renderer-agnostic controller API, deterministic intent buffers, disabled-by-default demo wiring, overlay/readouts, panel controls, persistence, tests, and benchmark. Controller intent is not yet actuated into movement. | implemented slices present / pending final close |

## Current next-step candidates

- M48-final: close docs/status/version guards around the existing controller slices without changing runtime behavior.
- M49: controller actuator bridge; connect intent to optional movement influence behind explicit disabled-by-default config.
- M50: ecology pressure calibration for hunger, scarcity, reproduction, and predation.
- M51: sensor budgeting and perception quality pass.
- M52: agent inspector and lab tools.
- M53: morphology/component compiler foundation.
- M54: signed-distance / terrain-obstacle response refinement.
- M55: lineage, fitness, species, and genome observability.
- M56: experiment config, presets, and replay preparation.
- M57: performance split, render throttling, code-splitting, and workerization prep.

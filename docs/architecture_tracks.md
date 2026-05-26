# qubok_evolve architecture tracks

Current status: m35.

## Shared boundary rule

The simulation layer owns authoritative state. Render and UI layers consume snapshots and may not mutate runtime arrays directly.

PixiJS remains confined to src/render. Simulation modules under src/sim must stay renderer-agnostic.

## Track contracts

| Track | May touch | Must not touch |
|---|---|---|
| terrain/material | terrain data modules including src/sim/terrain.ts and terrain render snapshots including src/sim/terrainRenderSnapshot.ts and terrain debug rendering in src/render/pixiRenderer.ts, movement query integration, later resource/sensor query integration, tests | Pixi internals except through snapshots |
| fluid-like field | field data modules, movement force inputs, field snapshots | entity lifecycle ownership |
| morphology/entity editor | schema/compiler/tests for phenotype data | direct DOM/Pixi editor coupling inside src/sim |
| controller/brain | action vector contract, controller modules, deterministic tests | renderer-owned decision state |
| render/performance | src/render, debug overlay, render snapshots, Vite/build config | authoritative simulation arrays |
| worker/WebGPU | transfer boundaries, worker adapters, compute experiments | nondeterministic mutation of main WorldState |

## Lifecycle contract

All runtime death paths still route through killAgent(world, index). Direct alive-zero writes outside src/sim/world.ts remain forbidden.

## Terrain snapshot contract

Terrain render snapshots are read-only copies produced from the terrain layer. They may be consumed by renderer/debug systems, but they must not become authoritative terrain state.

## Roadmap discipline

A milestone should name its primary track in the integration doc. If it spans tracks, the integration doc must list each touched boundary and its reason.

renderer must not own authoritative simulation state.

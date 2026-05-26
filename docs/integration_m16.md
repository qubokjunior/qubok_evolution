# qubok_evolve integration milestone 16

Milestone 16 is an integration and architecture cleanup pass. It does not add a new large subsystem; it connects already implemented m11-m15 systems to the live demo path and makes the visible milestone state honest.

## Fixed / changed

- `package.json` now reports `0.1.0-milestone.16`.
- `src/shared/appVersion.ts` is the neutral version source used by the debug overlay.
- The debug overlay no longer hardcodes `m10`; it displays `PROJECT_MILESTONE_LABEL`.
- `src/sim/demoSimulation.ts` remains inside simulation boundaries: no PixiJS, React, render, UI or editor imports.
- The demo starts below full capacity so reproduction can append child runtime slots instead of being permanently capacity-blocked.
- `scripts/test-demo-integration.mjs` checks the version label contract, demo integration tokens and the local no sim-to-render boundary for the demo file.

## Live-integrated subsystem status

| Milestone | Subsystem | Live demo status | Visible trace |
|---:|---|---|---|
| m11 | reproduction threshold | integrated through `applyReproduction()` after energy survival | `reproductionMs`, `births`, `repro elig`, `birth block` |
| m12 | phenotype mutation module | integrated indirectly through reproduction mutation rules | `mut changed` |
| m13 | reproduction + mutation integration | integrated through child phenotype mutation at birth | `births`, `mut changed` |
| m14 | predator/prey interaction | integrated after spatial grid build and before resources/energy survival | `pred/prey`, `attacks`, `kills`, `damage`, `hunt energy` |
| m15 | cone/radius sensors | integrated after sampled neighbor query and before predator/prey | `sensor`, `visible`, `sector writes`, `avg visible` |

## Still not implemented in this pass

- No brain/controller.
- No terrain/material grid.
- No fluid, flow-field, diffusion or Stable Fluids.
- No Web Worker migration.
- No WebGPU branch.
- No creature body-grid editor or morphology compiler.
- No m17 food/obstacle sector hardening yet. `sectorFood` and `sectorObstacle` are still reserved buffers and are not populated by the live demo sensor pass.

## Current demo tick order

1. Apply deterministic demo steering forces.
2. Step movement.
3. Rebuild spatial hash.
4. Sample local neighbor summary for debug/perf.
5. Run cone/radius agent sensors into sector ally/threat buffers and local summaries.
6. Run predator/prey local interaction through the spatial hash.
7. Rebuild resource grid, consume resources and respawn resources to target count.
8. Apply energy survival.
9. Run reproduction with bounded phenotype mutation at birth.
10. Produce render snapshot for PixiJS.

## Verification

Required acceptance commands:

```powershell
npm run test
npm run build
npm run bench:sensors
```

`npm run test` includes the existing boundary checker plus the m16 static demo-integration contract test. `bench:sensors` remains the performance check for the m15 sensor pass; m16 does not introduce a new benchmark hook because this step is a wiring/cleanup pass, not a new hot subsystem.

## Next m17 target

Sector aggregation hardening:

- populate `sectorFood`,
- populate `sectorObstacle`,
- add weighted threat/ally/food channels,
- keep the fixed-width sector input contract stable for future brains.
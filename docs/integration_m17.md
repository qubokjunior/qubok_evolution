# qubok_evolve integration milestone 17

Milestone 17 hardens the sensor-sector contract without adding a brain, terrain system, flow field, Web Worker, WebGPU path or creature editor.

## Goal

Populate all existing fixed-width sector buffers enough for future brains:

- `sectorAlly`
- `sectorThreat`
- `sectorFood`
- `sectorObstacle`

The key design rule is that `sectorCount` remains stable. The runtime brain interface can later consume `agentIndex * sectorCount + sectorIndex` ranges without a schema break.

## Implemented

| area | change |
|---|---|
| version | package/app version moves to `0.1.0-milestone.17` / `m17` |
| sensors | `SENSOR_SYSTEM_VERSION` moves to `qubok_evolve.sensors.v2` |
| food sectors | `applyAgentSensors()` can receive a `ResourceLayer` and writes weighted visible resources into `sectorFood` |
| obstacle sectors | border proximity writes into `sectorObstacle` as a provisional obstacle signal |
| weighted channels | ally/threat/food/obstacle channels use proximity-weighted signals |
| demo | live demo passes resources into sensors |
| overlay | overlay shows food/obstacle sector traces |
| tests | sensor test checks food sectors, obstacle sectors, weighted signal sums and clearing |
| benchmark | `bench:sensors` now reports `sensors:m17`, food sectors and obstacle sectors |

## Not implemented in m17

- no neural/controller brain,
- no terrain material grid,
- no obstacle mask or signed distance field,
- no flow field,
- no Web Worker,
- no WebGPU,
- no editor/compiler work.

`sectorObstacle` currently uses world-border proximity only. This is intentional: it validates the fixed-width channel and tests/overlay plumbing without introducing the terrain subsystem early.

## Verification

Required commands:

```powershell
npm run test
npm run build
npm run bench:sensors
```

## Next m18 target

A good next step is either:

1. sensor performance profiling / multi-rate scheduling for heavy sector channels, or
2. minimal terrain obstacle mask feeding `sectorObstacle`.

Do not add both in one milestone.
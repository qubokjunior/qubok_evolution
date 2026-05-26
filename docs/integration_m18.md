# qubok_evolve integration milestone 18

Milestone 18 is a sensor performance and scheduling pass. It does not add terrain, a brain, a worker, WebGPU, Stable Fluids or editor features.

## Goal

m17 made the fixed-width sector contract more useful by filling food and obstacle channels, but `bench:sensors` also showed that the full sensor pass became much heavier. m18 keeps the m17 channel layout stable and adds warm-channel cadence controls so expensive sector channels can update less often than core ally/threat perception.

## Changed

- `package.json` now reports `0.1.0-milestone.18`.
- `src/shared/appVersion.ts` now reports `m18`.
- `src/sim/sensors.ts` now exposes `SENSOR_SYSTEM_VERSION = qubok_evolve.sensors.v3`.
- `applyAgentSensors()` accepts:
  - `tick`,
  - `foodTickInterval`,
  - `obstacleTickInterval`,
  - `preserveSkippedSectorChannels`.
- Food and obstacle sector channels can be scheduled at lower cadence while preserving the previous fixed-width buffer values on skipped ticks.
- `clearAgentSensorOutputs()` now accepts optional channel clear controls, while default behavior still clears all channels.
- Live demo uses warm scheduling:
  - food sectors every 4 ticks,
  - obstacle sectors every 8 ticks.
- Overlay exposes cadence state:
  - `food sched`,
  - `obs sched`,
  - `food skip`,
  - `obs skip`.
- `bench:sensors` now reports:
  - full scheduled sensor cost,
  - scheduled-tick cost,
  - skipped-tick cost,
  - skipped/full ratio.

## Live demo tick order

The live demo tick order is unchanged except that the sensor step now receives `tick`, `foodTickInterval` and `obstacleTickInterval`.

## Contract

The brain-facing contract remains stable:

- `sectorAlly`,
- `sectorThreat`,
- `sectorFood`,
- `sectorObstacle`,
- `sectorCount`.

m18 changes refresh cadence, not channel shape.

## Not changed

- No terrain obstacle mask.
- No real obstacle grid.
- No brain/controller.
- No workerization.
- No WebGPU.
- No flow fields.
- No editor/compiler work.

## Verification

Required commands:

```powershell
npm run test
npm run build
npm run bench:sensors
```

## Next m19 target

Best next step: minimal terrain obstacle mask feeding `sectorObstacle`, using the existing sector channel and without adding a full terrain editor.

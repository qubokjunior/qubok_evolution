# performance budget

## Benchmark ladder

| Tier | Entity target | Success criterion |
|---:|---:|---|
| intro | 1,000 | full debug overlays, deterministic replay, 60+ FPS |
| core | 5,000 | normal play, charts, inspector, no stutter |
| stress | 10,000 | limited expensive debug |
| reference | 16,000 | Pezzza-like scale, LOD and multirate scheduling active |
| stretch | 25,000+ | aggressive LOD or headless generations faster than realtime |

## Metrics from the start

- `simMsPerTick`
- `renderMsPerFrame`
- `gridBuildMs`
- `neighborCandidates`
- `avgNeighborsPerAgent`
- `brainMs`
- `terrainMs`
- `fieldMs`
- `workerTransferMs`
- `peakMemoryMB`
- births/deaths per second
- `generationDuration`
- diversity metrics
- extinction count

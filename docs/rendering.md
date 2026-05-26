# rendering
## m25 obstacle debug rendering

The live renderer now draws occupied `ObstacleMask` cells as a subtle debug layer.

Layer order:

| Order | Layer |
|---:|---|
| 0 | background |
| 1 | grid |
| 2 | obstacle debug cells |
| 3 | agents |

The renderer consumes `ObstacleMaskRenderSnapshot`, not the mutable mask directly.

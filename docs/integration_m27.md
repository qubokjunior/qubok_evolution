# m27 integration: world slot telemetry

Milestone 27 exposes the m26 world slot reuse mechanism in live telemetry and the debug overlay.

## Goal

m26 fixed lifecycle capacity by allowing dead agent slots to be reused. m27 makes that mechanism observable during runtime.

## Added telemetry

The existing m26 world fields are now surfaced through renderer metrics and overlay rows:

- reusableSlotCount
- spawnReusedSlotCount
- spawnAppendedSlotCount

The overlay labels are intentionally short:

- free slots
- spawn reused
- spawn append

## Why this matters

The expected long-run pattern after m26 is that capacity-blocked births should fall when dead reusable slots exist. With m27, the live overlay can show that relationship directly:

- birth block remains meaningful as true structural capacity pressure
- free slots shows available dead slots
- spawn reused confirms births/spawns are consuming dead slots
- spawn append confirms historical append allocation

## Explicitly not changed

- no new biology
- no terrain editor
- no brain/controller
- no pathfinding
- no signed distance field
- no WebGPU
- no worker migration
- no Pixi renderer refactor beyond metric forwarding

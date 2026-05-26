# qubok_evolve movement contract

Milestone 4 adds deterministic point movement over typed-array WorldState.

## Purpose

This is still not a creature brain, not flocking and not collision. It is the minimal hot-loop integrator needed before rendering runtime snapshots and before spatial hash work.

## Files

- `src/sim/movement.ts`: force accumulation, velocity integration, speed clamp, heading update, world bounds, distance/age/energy counters.
- `scripts/test-movement.mjs`: deterministic movement, force clearing, wrapping/clamping and energy-death tests.
- `scripts/bench-movement.mjs`: hot-loop movement benchmark for 1k, 5k, 10k, 16k and 25k entities.

## Runtime invariants

- No Entity class.
- No React state.
- No PixiJS import in `src/sim`.
- Movement operates directly on WorldState typed arrays.
- Forces are temporary hot-loop channels: `fx`, `fy`.
- Morphology remains static during movement.

## Current integration model

For each alive agent:

1. velocity += force / mass * deltaSeconds
2. velocity *= dragFactor
3. clamp velocity to maxSpeed
4. position += velocity * deltaSeconds
5. update heading from velocity
6. accumulate age and distanceExplored
7. spend energy from metabolism and movement cost
8. optionally kill when energy reaches zero
9. optionally clear forces

## Next milestone

Milestone 5 should connect render to runtime snapshots: render many points from WorldState, without storing entity simulation in UI state.
## m20 obstacle soft response

Obstacle response is applied before `stepMovement()` and writes into the same force buffers used by steering:

```text
demo steering force
  ↓
obstacle soft response force
  ↓
stepMovement()
```

The movement integrator remains unchanged. This keeps obstacle response isolated and testable.
## m21 obstacle response optimization

The obstacle response force pass now supports bounded sampling. The movement integrator remains unchanged; all optimization happens before `stepMovement()` while accumulating force.

```text
obstacle mask
  ↓ bounded local cell sampling
world.fx / world.fy
  ↓
stepMovement()
```

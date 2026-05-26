# qubok_evolve replay contract

Milestone 2 adds the first deterministic primitive: seedable RNG.

## RNG contract

- Runtime simulation must never use Math.random().
- All stochastic behavior must receive a DeterministicRng instance or seed-derived fork.
- Base algorithm: sfc32 with cyrb128 seed hashing.
- Seed input is normalized to text.
- Replay-critical data must store seedText, RNG algorithm, RNG snapshot, world config, tick index and future WorldState snapshot.

## Current known sequence

Seed: qubok_evolve:m2

First eight uint32 draws:

1. 3638485831
2. 2590790176
3. 2184249971
4. 440948321
5. 1436939067
6. 3436453641
7. 3724692206
8. 316437570

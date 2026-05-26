export const RNG_ALGORITHM = "sfc32:cyrb128" as const;

export type RngSeed = number | string | bigint;

export type RngSnapshot = {
  readonly algorithm: typeof RNG_ALGORITHM;
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly draws: number;
};

export type DeterministicRng = {
  readonly seedText: string;
  nextUint32: () => number;
  nextFloat01: () => number;
  nextFloatSigned: () => number;
  range: (min: number, max: number) => number;
  int: (minInclusive: number, maxExclusive: number) => number;
  chance: (probability01: number) => boolean;
  fork: (label: string | number) => DeterministicRng;
  snapshot: () => RngSnapshot;
};

const UINT32_RANGE = 0x100000000;
const UINT32_MAX = 0xffffffff;

export function createRng(seed: RngSeed): DeterministicRng {
  const seedText = normalizeSeed(seed);
  const [a, b, c, d] = hashSeedToUint32x4(seedText);
  return createRngFromSnapshot({ algorithm: RNG_ALGORITHM, a, b, c, d, draws: 0 }, seedText);
}

export function createRngFromSnapshot(snapshot: RngSnapshot, seedText = "snapshot"): DeterministicRng {
  validateSnapshot(snapshot);
  let a = snapshot.a >>> 0;
  let b = snapshot.b >>> 0;
  let c = snapshot.c >>> 0;
  let d = snapshot.d >>> 0;
  let draws = snapshot.draws;

  const nextUint32 = (): number => {
    let t = (a + b) | 0;
    a = (b ^ (b >>> 9)) >>> 0;
    b = (c + (c << 3)) >>> 0;
    c = ((c << 21) | (c >>> 11)) >>> 0;
    d = (d + 1) >>> 0;
    t = (t + d) | 0;
    c = (c + t) >>> 0;
    draws += 1;
    return t >>> 0;
  };

  const nextFloat01 = (): number => nextUint32() / UINT32_RANGE;

  return {
    seedText,
    nextUint32,
    nextFloat01,
    nextFloatSigned: () => nextFloat01() * 2 - 1,
    range: (min: number, max: number): number => {
      validateFiniteRange(min, max);
      return min + (max - min) * nextFloat01();
    },
    int: (minInclusive: number, maxExclusive: number): number => {
      if (!Number.isInteger(minInclusive) || !Number.isInteger(maxExclusive)) {
        throw new Error("RNG int bounds must be integers.");
      }
      validateFiniteRange(minInclusive, maxExclusive);
      return Math.floor(minInclusive + (maxExclusive - minInclusive) * nextFloat01());
    },
    chance: (probability01: number): boolean => {
      if (!Number.isFinite(probability01) || probability01 < 0 || probability01 > 1) {
        throw new Error("RNG chance probability must be in the 0..1 range.");
      }
      return nextFloat01() < probability01;
    },
    fork: (label: string | number): DeterministicRng => createRng(`${seedText}/${draws}/${String(label)}`),
    snapshot: (): RngSnapshot => ({ algorithm: RNG_ALGORITHM, a, b, c, d, draws })
  };
}

function normalizeSeed(seed: RngSeed): string {
  if (typeof seed === "number") {
    if (!Number.isFinite(seed)) {
      throw new Error(`RNG seed number must be finite. Received: ${seed}`);
    }
    return String(Math.trunc(seed));
  }
  return String(seed);
}

function hashSeedToUint32x4(input: string): readonly [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;

  for (let index = 0; index < input.length; index += 1) {
    const k = input.charCodeAt(index);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }

  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);

  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}

function validateSnapshot(snapshot: RngSnapshot): void {
  if (snapshot.algorithm !== RNG_ALGORITHM) {
    throw new Error(`Unsupported RNG snapshot algorithm: ${snapshot.algorithm}`);
  }

  const numericFields: readonly (readonly [string, number, number])[] = [
    ["a", snapshot.a, UINT32_MAX],
    ["b", snapshot.b, UINT32_MAX],
    ["c", snapshot.c, UINT32_MAX],
    ["d", snapshot.d, UINT32_MAX],
    ["draws", snapshot.draws, Number.MAX_SAFE_INTEGER]
  ];

  for (const [name, value, maxValue] of numericFields) {
    if (!Number.isInteger(value) || value < 0 || value > maxValue) {
      throw new Error(`Invalid RNG snapshot field ${name}: ${value}`);
    }
  }
}

function validateFiniteRange(min: number, max: number): void {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    throw new Error(`Invalid RNG range: min=${min}, max=${max}`);
  }
}

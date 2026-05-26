import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_mutation_test");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

await transpileSource("src/sim/rng.ts", "rng.mjs");
await transpileSource("src/sim/mutation.ts", "mutation.mjs");

const { createRng } = await import(pathToFileURL(join(temporaryDirectory, "rng.mjs")).href);
const {
  DEFAULT_MUTATION_RULES,
  clampPhenotypeValue,
  mutateParameterBlock,
  mutateScalar,
  scaleMutationRule
} = await import(pathToFileURL(join(temporaryDirectory, "mutation.mjs")).href);

const noMutationRng = createRng("mutation:no-op");
const noMutationBeforeDraws = noMutationRng.snapshot().draws;
const noMutation = mutateScalar(10, { min: 0, max: 20, standardDeviation: 100, probability: 0 }, noMutationRng);
assertEqual(noMutation.value, 10, "probability zero keeps value");
assertEqual(noMutation.changed, false, "probability zero changed flag");
assertEqual(noMutationRng.snapshot().draws, noMutationBeforeDraws, "probability zero should not consume RNG draws");

const deterministicA = sampleMutationSequence("mutation:determinism");
const deterministicB = sampleMutationSequence("mutation:determinism");
const deterministicC = sampleMutationSequence("mutation:other-seed");

assertArrayClose(deterministicA, deterministicB, "same seed mutation sequence");
assertNotArrayClose(deterministicA, deterministicC, "different seed mutation sequence");

const clampHigh = mutateScalar(999, { min: 0, max: 10, standardDeviation: 0, probability: 1 }, createRng("clamp-high"));
assertEqual(clampHigh.value, 10, "clamp high");
assertEqual(clampHigh.clamped, true, "clamp high flag");

const clampLow = mutateScalar(-999, { min: -4, max: 4, standardDeviation: 0, probability: 1 }, createRng("clamp-low"));
assertEqual(clampLow.value, -4, "clamp low");

const integerMutation = mutateScalar(3.2, { min: 0, max: 10, standardDeviation: 0, probability: 1, integer: true }, createRng("integer"));
assertEqual(integerMutation.value, 3, "integer mutation rounds");

const base = {
  radius: 4,
  maxSpeed: 80,
  metabolism: 0.2,
  visionRadius: 70
};

const blockA = mutateParameterBlock(base, {
  radius: scaleMutationRule(DEFAULT_MUTATION_RULES.radius, 0.5),
  maxSpeed: scaleMutationRule(DEFAULT_MUTATION_RULES.maxSpeed, 0.5),
  metabolism: scaleMutationRule(DEFAULT_MUTATION_RULES.metabolism, 0.5),
  visionRadius: scaleMutationRule(DEFAULT_MUTATION_RULES.visionRadius, 0.5)
}, createRng("mutation:block"));

const blockB = mutateParameterBlock(base, {
  radius: scaleMutationRule(DEFAULT_MUTATION_RULES.radius, 0.5),
  maxSpeed: scaleMutationRule(DEFAULT_MUTATION_RULES.maxSpeed, 0.5),
  metabolism: scaleMutationRule(DEFAULT_MUTATION_RULES.metabolism, 0.5),
  visionRadius: scaleMutationRule(DEFAULT_MUTATION_RULES.visionRadius, 0.5)
}, createRng("mutation:block"));

assertDeepEqual(blockA, blockB, "deterministic parameter block");
assertEqual(blockA.stats.attempts, 4, "parameter block attempts");

for (const [key, value] of Object.entries(blockA.value)) {
  assertFinite(value, `parameter block ${key}`);
}

assertEqual(clampPhenotypeValue("radius", -10), DEFAULT_MUTATION_RULES.radius.min, "clamp phenotype radius min");
assertEqual(clampPhenotypeValue("visionCosHalfCone", 5), DEFAULT_MUTATION_RULES.visionCosHalfCone.max, "clamp phenotype visionCosHalfCone max");

assertThrows(() => mutateScalar(1, { min: 2, max: 1, standardDeviation: 0, probability: 1 }, createRng("bad-rule")), "bad min/max");
assertThrows(() => mutateScalar(1, { min: 0, max: 2, standardDeviation: -1, probability: 1 }, createRng("bad-std")), "bad standardDeviation");
assertThrows(() => mutateScalar(1, { min: 0, max: 2, standardDeviation: 1, probability: 2 }, createRng("bad-prob")), "bad probability");

await rm(temporaryDirectory, { force: true, recursive: true });
console.log("mutation tests passed");

async function transpileSource(sourceRelativePath, outputFileName) {
  const sourceText = await readFile(join(projectRoot, sourceRelativePath), "utf8");
  const transpiled = ts.transpileModule(sourceText, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      strict: true
    }
  });

  let outputText = transpiled.outputText;
  outputText = outputText.replaceAll('from "./rng";', 'from "./rng.mjs";');
  await writeFile(join(temporaryDirectory, outputFileName), outputText, "utf8");
}

function sampleMutationSequence(seed) {
  const rng = createRng(seed);
  const rule = { min: -100, max: 100, standardDeviation: 1.25, probability: 1 };
  let value = 5;
  const sequence = [];

  for (let index = 0; index < 16; index += 1) {
    const result = mutateScalar(value, rule, rng);
    value = result.value;
    sequence.push(round6(value));
  }

  return sequence;
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertFinite(value, label) {
  if (!Number.isFinite(value)) {
    throw new Error(`${label}: expected finite value, got ${value}`);
  }
}

function assertArrayClose(actual, expected, label) {
  assertEqual(actual.length, expected.length, `${label} length`);

  for (let index = 0; index < actual.length; index += 1) {
    if (Math.abs(actual[index] - expected[index]) > 0.000001) {
      throw new Error(`${label}: index ${index}: expected ${expected[index]}, got ${actual[index]}`);
    }
  }
}

function assertNotArrayClose(actual, expected, label) {
  let identical = actual.length === expected.length;

  for (let index = 0; index < actual.length && identical; index += 1) {
    identical = Math.abs(actual[index] - expected[index]) <= 0.000001;
  }

  if (identical) {
    throw new Error(`${label}: arrays should not be identical`);
  }
}

function assertDeepEqual(actual, expected, label) {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);

  if (actualText !== expectedText) {
    throw new Error(`${label}: expected ${expectedText}, got ${actualText}`);
  }
}

function assertThrows(fn, label) {
  try {
    fn();
  } catch {
    return;
  }

  throw new Error(`${label}: expected function to throw`);
}

function round6(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}
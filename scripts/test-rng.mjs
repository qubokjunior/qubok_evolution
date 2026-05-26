import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const sourcePath = join(projectRoot, "src", "sim", "rng.ts");
const temporaryDirectory = join(projectRoot, ".tmp_rng_test");
const temporaryModule = join(temporaryDirectory, "rng.mjs");
const sourceText = await readFile(sourcePath, "utf8");
const transpiled = ts.transpileModule(sourceText, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true } });
await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });
await writeFile(temporaryModule, transpiled.outputText, "utf8");
const { createRng, createRngFromSnapshot, RNG_ALGORITHM } = await import(pathToFileURL(temporaryModule).href);

assertEqual(RNG_ALGORITHM, "sfc32:cyrb128", "algorithm name");
const expectedQubokSequence = [3638485831, 2590790176, 2184249971, 440948321, 1436939067, 3436453641, 3724692206, 316437570];
const rngA = createRng("qubok_evolve:m2");
const rngB = createRng("qubok_evolve:m2");
assertArrayEqual(takeUint32(rngA, expectedQubokSequence.length), expectedQubokSequence, "known seed sequence");
assertArrayEqual(takeUint32(rngB, expectedQubokSequence.length), expectedQubokSequence, "repeat seed sequence");
const snapshot = rngA.snapshot();
const restored = createRngFromSnapshot(snapshot, "restored");
assertArrayEqual(takeUint32(rngA, 5), takeUint32(restored, 5), "snapshot restore continuation");
assertNotArrayEqual(takeUint32(createRng("qubok_evolve:m2:different"), expectedQubokSequence.length), expectedQubokSequence, "different seed sequence");
const rangeRng = createRng(12345);
for (let index = 0; index < 1000; index += 1) {
  const value = rangeRng.range(-2, 3);
  if (value < -2 || value >= 3) throw new Error(`range out of bounds: ${value}`);
}
const intRng = createRng("int-bounds");
for (let index = 0; index < 1000; index += 1) {
  const value = intRng.int(4, 9);
  if (!Number.isInteger(value) || value < 4 || value >= 9) throw new Error(`int out of bounds: ${value}`);
}
assertEqual(createRng("chance-zero").chance(0), false, "chance zero");
assertEqual(createRng("chance-one").chance(1), true, "chance one");
const forkParentA = createRng("parent");
const forkParentB = createRng("parent");
forkParentA.nextUint32();
forkParentB.nextUint32();
assertArrayEqual(takeUint32(forkParentA.fork("child"), 6), takeUint32(forkParentB.fork("child"), 6), "deterministic fork");
await rm(temporaryDirectory, { force: true, recursive: true });
console.log("rng tests passed");

function takeUint32(rng, count) { return Array.from({ length: count }, () => rng.nextUint32()); }
function assertEqual(actual, expected, label) { if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`); }
function assertArrayEqual(actual, expected, label) {
  if (actual.length !== expected.length) throw new Error(`${label}: length mismatch ${actual.length} !== ${expected.length}`);
  for (let index = 0; index < actual.length; index += 1) if (actual[index] !== expected[index]) throw new Error(`${label}: index ${index}: expected ${expected[index]}, got ${actual[index]}`);
}
function assertNotArrayEqual(actual, expected, label) {
  let identical = actual.length === expected.length;
  for (let index = 0; index < actual.length && identical; index += 1) identical = actual[index] === expected[index];
  if (identical) throw new Error(`${label}: arrays should not be identical`);
}

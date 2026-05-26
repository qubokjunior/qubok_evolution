import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_mutation_bench");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

await transpileSource("src/sim/rng.ts", "rng.mjs");
await transpileSource("src/sim/mutation.ts", "mutation.mjs");

const { createRng } = await import(pathToFileURL(join(temporaryDirectory, "rng.mjs")).href);
const { mutateScalar } = await import(pathToFileURL(join(temporaryDirectory, "mutation.mjs")).href);

const mutationCount = 500_000;
const rng = createRng("qubok_evolve:bench:mutation:m12");
const rule = { min: 0, max: 300, standardDeviation: 2.5, probability: 0.25 };

let value = 80;
let changed = 0;
let clamped = 0;
let checksum = 0;

const start = performance.now();

for (let index = 0; index < mutationCount; index += 1) {
  const result = mutateScalar(value, rule, rng);
  value = result.value;

  if (result.changed) {
    changed += 1;
  }

  if (result.clamped) {
    clamped += 1;
  }

  checksum = (checksum + ((value * 1000) | 0)) | 0;
}

const mutationMs = performance.now() - start;
await rm(temporaryDirectory, { force: true, recursive: true });

console.log(JSON.stringify({
  bench: "mutation:m12",
  mutationCount,
  mutationMs: round3(mutationMs),
  millionMutationsPerSecond: round3(mutationCount / mutationMs / 1000),
  changed,
  clamped,
  finalValue: round6(value),
  checksum: checksum >>> 0,
  snapshotDraws: rng.snapshot().draws
}, null, 2));

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

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

function round6(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}
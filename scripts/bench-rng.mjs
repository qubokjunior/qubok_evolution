import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const sourcePath = join(projectRoot, "src", "sim", "rng.ts");
const temporaryDirectory = join(projectRoot, ".tmp_rng_bench");
const temporaryModule = join(temporaryDirectory, "rng.mjs");
const sourceText = await readFile(sourcePath, "utf8");
const transpiled = ts.transpileModule(sourceText, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true } });
await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });
await writeFile(temporaryModule, transpiled.outputText, "utf8");
const { createRng, RNG_ALGORITHM } = await import(pathToFileURL(temporaryModule).href);
const drawCount = 2_000_000;
const rng = createRng("qubok_evolve:bench:rng:v1");
let checksum = 0;
const start = performance.now();
for (let index = 0; index < drawCount; index += 1) checksum = (checksum ^ rng.nextUint32()) >>> 0;
const rngMs = performance.now() - start;
await rm(temporaryDirectory, { force: true, recursive: true });
console.log(JSON.stringify({ bench: "rng:m2", algorithm: RNG_ALGORITHM, drawCount, rngMs: round3(rngMs), millionDrawsPerSecond: round3(drawCount / rngMs / 1000), checksum, snapshotDraws: rng.snapshot().draws }, null, 2));
function round3(value) { return Math.round(value * 1000) / 1000; }

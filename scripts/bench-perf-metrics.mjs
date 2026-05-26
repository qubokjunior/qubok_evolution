import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = process.cwd();
const temporaryDirectory = join(projectRoot, ".tmp_perf_metrics_bench");

await rm(temporaryDirectory, { force: true, recursive: true });
await mkdir(temporaryDirectory, { recursive: true });
await transpileSharedModule("perfMetrics.ts", "perfMetrics.mjs");

const { createPerfMetricsBus } = await import(pathToFileURL(join(temporaryDirectory, "perfMetrics.mjs")).href);

const bus = createPerfMetricsBus();
const sampleCount = 1_000_000;
let checksum = 0;

const start = performance.now();
for (let index = 0; index < sampleCount; index += 1) {
  const value = (index % 1000) / 100;
  bus.record("simMsPerTick", value);
  bus.record("entityCount", index & 8191);
  checksum = (checksum ^ Math.round(bus.getLatest("simMsPerTick") * 1000) ^ bus.getLatest("entityCount")) >>> 0;
}
const totalMs = performance.now() - start;
const snapshot = bus.makeSnapshot();

await rm(temporaryDirectory, { force: true, recursive: true });

console.log(JSON.stringify({
  bench: "perf-metrics:m6",
  sampleCount,
  recordedValues: sampleCount * 2,
  totalMs: round3(totalMs),
  millionRecordsPerSecond: round3((sampleCount * 2) / totalMs / 1000),
  simMetricCount: snapshot.metrics.simMsPerTick.count,
  entityMetricCount: snapshot.metrics.entityCount.count,
  sampleSerial: snapshot.sampleSerial,
  checksum
}, null, 2));

async function transpileSharedModule(sourceName, outputName) {
  const sourcePath = join(projectRoot, "src", "shared", sourceName);
  const outputPath = join(temporaryDirectory, outputName);
  const sourceText = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(sourceText, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      strict: true
    }
  });
  await writeFile(outputPath, transpiled.outputText, "utf8");
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}